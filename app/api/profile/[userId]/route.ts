import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Story from '@/models/Story';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

interface DecodedToken {
  userId?: string;
  id?: string;
  _id?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const targetUserId = params.userId;

    const user = await User.findById(targetUserId).select(
      '-password -email -resetPasswordToken -resetPasswordExpires -twoFactorSecret'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const activeStoriesCount = await Story.countDocuments({
      userId: new mongoose.Types.ObjectId(targetUserId),
      expiresAt: { $gt: now },
    });

    return NextResponse.json({
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        location: user.location,
        website: user.website,
        status: user.status,
        lastSeen: user.lastSeen,
        isOnline: user.isOnline,
        createdAt: user.createdAt,
        activeStoriesCount,
      },
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
