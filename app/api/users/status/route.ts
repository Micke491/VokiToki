import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { pusherServer } from '@/lib/pusher';

interface DecodedToken {
  userId?: string;
  id?: string;
  _id?: string;
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { isOnline } = body;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.isOnline = isOnline ?? true;
    user.lastSeen = new Date();
    await user.save();
    try {
      await pusherServer.trigger(`user-${userId}`, 'status-updated', {
        userId,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      });
    } catch (pusherError) {
      console.error('Pusher trigger failed:', pusherError);
    }

    return NextResponse.json({
      success: true,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    });
  } catch (error: any) {
    console.error('Status update error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    const user = await User.findById(userId).select('isOnline lastSeen');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    });
  } catch (error: any) {
    console.error('Status fetch error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
