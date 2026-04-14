import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import Story from '@/models/Story';
import User from '@/models/User';
import Chat from '@/models/Chat';
import jwt from 'jsonwebtoken';
import cloudinary from '@/lib/cloudinary';
import { pusherServer } from '@/lib/pusher';

interface DecodedToken {
  userId?: string;
  id?: string;
  _id?: string;
}

async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;
    const currentUserId = decoded.userId || decoded.id || decoded._id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userChats = await Chat.find({
      participants: new mongoose.Types.ObjectId(currentUserId),
    });
    const chatUserIds = new Set<string>();
    chatUserIds.add(currentUserId); 
    for (const chat of userChats) {
      for (const participant of chat.participants) {
        if (participant.toString() !== currentUserId) {
          chatUserIds.add(participant.toString());
        }
      }
    }

    const now = new Date();
    const stories = await Story.aggregate([
      {
        $match: {
          expiresAt: { $gt: now },
          userId: { $in: [...chatUserIds].map(id => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 1,
          mediaUrl: 1,
          mediaType: 1,
          caption: 1,
          createdAt: 1,
          expiresAt: 1,
          'user._id': 1,
          'user.username': 1,
          'user.avatar': 1,
          viewedBy: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const storiesByUser = new Map<string, any>();
    for (const story of stories) {
      const userId = story.user._id.toString();
      if (!storiesByUser.has(userId)) {
        storiesByUser.set(userId, {
          user: {
            _id: story.user._id,
            username: story.user.username,
            avatar: story.user.avatar,
          },
          stories: [],
        });
      }
      storiesByUser.get(userId)!.stories.push({
        _id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewed: story.viewedBy?.some((v: any) => v.userId.toString() === currentUserId) || false,
      });
    }

    return NextResponse.json({ stories: Array.from(storiesByUser.values()) });
  } catch (error: any) {
    console.error('Stories fetch error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileType = file.type;
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only images and videos are allowed' },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${isVideo ? '50MB' : '10MB'} limit` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: isVideo ? 'video' : 'image',
          folder: 'stories',
          ...(isVideo && {
            transformation: [
              { duration: '30', gravity: 'north' }, 
            ],
          }),
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(Buffer.from(buffer));
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    const story = await Story.create({
      userId: new mongoose.Types.ObjectId(userId),
      mediaUrl: uploadResult.secure_url,
      mediaType: isVideo ? 'video' : 'image',
      caption: caption?.trim() || '',
      viewedBy: [],
      expiresAt,
    });

    const user = await User.findById(userId).select('username avatar');

    try {
      const userChats = await Chat.find({
        participants: new mongoose.Types.ObjectId(userId),
      });

      const contactIds = new Set<string>();
      for (const chat of userChats) {
        for (const participant of chat.participants) {
          if (participant.toString() !== userId) {
            contactIds.add(participant.toString());
          }
        }
      }

      const storyPayload = {
        storyId: story._id,
        userId,
        mediaUrl: uploadResult.secure_url,
        mediaType: isVideo ? 'video' : 'image',
        caption: caption?.trim() || '',
        createdAt: story.createdAt,
        user: {
          username: user?.username,
          avatar: user?.avatar,
        },
      };

      const contactArray = [...contactIds];
      for (let i = 0; i < contactArray.length; i += 10) {
        const batch = contactArray.slice(i, i + 10);
        await Promise.all(
          batch.map(contactId =>
            pusherServer.trigger(`user-${contactId}`, 'story-new', storyPayload)
          )
        );
      }
    } catch (pusherError) {
      console.error('Pusher trigger failed:', pusherError);
    }

    return NextResponse.json({
      success: true,
      story: {
        _id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Story upload error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export { GET, POST };
