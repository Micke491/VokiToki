import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Story from '@/models/Story';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';
import Chat from '@/models/Chat';
import { pusherServer } from '@/lib/pusher';
import { generalLimiter } from '@/lib/ratelimit';

export async function GET(req: Request) {
  try {
    await connectDB();

    const auth = await verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(auth.id).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const stories = await Story.find({
      userId: new mongoose.Types.ObjectId(auth.id),
      expiresAt: { $gt: now },
    })
    .populate('viewedBy.userId', 'username avatar')
    .sort({ createdAt: -1 });

    const storiesWithViewedBy = stories.map((s) => ({
      _id: s._id,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
      caption: s.caption,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      viewedBy: s.viewedBy?.map((v: any) => ({
        userId: v.userId?._id?.toString() || v.userId?.toString(),
        viewedAt: v.viewedAt,
        user: v.userId && typeof v.userId === 'object' ? {
          username: v.userId.username,
          avatar: v.userId.avatar
        } : undefined
      })) || [],
    }));

    return NextResponse.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        links: user.links || [],
        location: user.location,
        status: user.status,
        lastSeen: user.lastSeen,
        isOnline: user.isOnline,
        readReceipts: user.readReceipts,
        theme: user.theme,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
      stories: storiesWithViewedBy,
    });
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const auth = await verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, reset } = await generalLimiter.limit(auth.id);
    if (!success) {
      return NextResponse.json(
        { error: "Too many profile updates. Please wait." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Reset": reset.toString(),
          }
        }
      );
    }

    const body = await req.json();
    const {
      username,
      name,
      bio,
      avatar,
      links,
      location,
      status,
    } = body;

    const currentUser = await User.findById(auth.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (username && username !== currentUser.username) {
      const existingUser = await User.findOne({
        username: { $regex: new RegExp(`^${username}$`, 'i') },
        _id: { $ne: auth.id },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
      currentUser.username = username;
    }

    if (name !== undefined) currentUser.name = name;
    if (bio !== undefined) currentUser.bio = bio;
    if (avatar !== undefined) currentUser.avatar = avatar;
    if (links !== undefined) currentUser.links = links;
    if (location !== undefined) currentUser.location = location;
    if (status !== undefined) currentUser.status = status;

    await currentUser.save();

    try {
      const userChats = await Chat.find({
        participants: new mongoose.Types.ObjectId(auth.id),
      });

      const contactIds = new Set<string>();
      for (const chat of userChats) {
        for (const participant of chat.participants) {
          if (participant.toString() !== auth.id) {
            contactIds.add(participant.toString());
          }
        }
      }

      const updatePayload = {
        userId: auth.id,
        username: currentUser.username,
        name: currentUser.name,
        avatar: currentUser.avatar,
        status: currentUser.status,
      };

      const contactArray = [...contactIds];
      for (let i = 0; i < contactArray.length; i += 10) {
        const batch = contactArray.slice(i, i + 10);
        await Promise.all(
          batch.map(contactId =>
            pusherServer.trigger(`user-${contactId}`, 'profile-updated', updatePayload)
          )
        );
      }
    } catch (pusherError) {
      console.error('Profile Pusher trigger failed:', pusherError);
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        _id: currentUser._id,
        username: currentUser.username,
        email: currentUser.email,
        name: currentUser.name,
        bio: currentUser.bio,
        avatar: currentUser.avatar,
        links: currentUser.links || [],
        location: currentUser.location,
        status: currentUser.status,
        readReceipts: currentUser.readReceipts,
        theme: currentUser.theme,
        twoFactorEnabled: currentUser.twoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();

    const auth = await verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, reset } = await generalLimiter.limit(auth.id);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Reset": reset.toString(),
          }
        }
      );
    }

    const url = new URL(req.url);
    const storyId = url.searchParams.get('storyId');

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID required' },
        { status: 400 }
      );
    }

    const story = await Story.findOneAndDelete({
      _id: storyId,
      userId: new mongoose.Types.ObjectId(auth.id),
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found or not yours to delete' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
