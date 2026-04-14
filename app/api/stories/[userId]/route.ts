import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Story from '@/models/Story';
import User from '@/models/User';
import Chat from '@/models/Chat';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { pusherServer } from '@/lib/pusher';

interface DecodedToken {
  userId?: string;
  id?: string;
  _id?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
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



    const sharedChats = await Chat.find({
      participants: {
        $all: [
          new mongoose.Types.ObjectId(currentUserId),
          new mongoose.Types.ObjectId(targetUserId),
        ],
      },
    });

    if (sharedChats.length === 0 && currentUserId !== targetUserId) {
      return NextResponse.json({ stories: [] });
    }
    const now = new Date();
    const stories = await Story.find({
      userId: new mongoose.Types.ObjectId(targetUserId),
      expiresAt: { $gt: now },
    }).sort({ createdAt: 1 });

    const targetUser = await User.findById(targetUserId).select(
      'username avatar'
    );

    const storiesWithViewed = stories.map((story) => ({
      _id: story._id,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewed: story.viewedBy?.some(
        (v) => v.userId.toString() === currentUserId
      ),
    }));

    return NextResponse.json({
      user: {
        _id: targetUser?._id,
        username: targetUser?.username,
        avatar: targetUser?.avatar,
      },
      stories: storiesWithViewed,
    });
  } catch (error: any) {
    console.error('Story fetch error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
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
    const viewerId = decoded.userId || decoded.id || decoded._id;

    if (!viewerId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { storyId } = body;

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID required' }, { status: 400 });
    }

    const story = await Story.findOne({
      _id: new mongoose.Types.ObjectId(storyId),
      userId: new mongoose.Types.ObjectId(targetUserId),
      expiresAt: { $gt: new Date() },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const alreadyViewed = story.viewedBy?.some(
      (v) => v.userId.toString() === viewerId
    );

    if (!alreadyViewed) {
      story.viewedBy.push({
        userId: new mongoose.Types.ObjectId(viewerId),
        viewedAt: new Date(),
      });
      await story.save();

      try {
        await pusherServer.trigger(`user-${targetUserId}`, 'story-viewed', {
          storyId: story._id,
          viewedBy: viewerId,
          viewedAt: new Date(),
        });
      } catch (pusherError) {
        console.error('Pusher trigger failed:', pusherError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Story view error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to mark story as viewed' }, { status: 500 });
  }
}
