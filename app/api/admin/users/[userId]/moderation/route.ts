import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import Message from '@/models/Message';
import Story from '@/models/Story';
import Chat from '@/models/Chat';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();
    const auth = await verifyToken(request);
    
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { action, timeoutUntil } = await request.json();
    const { userId } = await params;

    console.log(`[MODERATION] Action: ${action}, Target: ${userId}, Admin: ${auth.id}`);

    const user = await User.findById(userId);
    if (!user) {
      console.warn(`[MODERATION] User not found: ${userId}`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (action === 'ban') {
      user.isBanned = !user.isBanned;
      await user.save();
      return NextResponse.json({ message: user.isBanned ? 'User banned' : 'User unbanned', isBanned: user.isBanned });
    }

    if (action === 'timeout') {
      user.timeoutUntil = timeoutUntil ? new Date(timeoutUntil) : undefined;
      await user.save();
      return NextResponse.json({ message: timeoutUntil ? 'User timed out' : 'Timeout removed', timeoutUntil: user.timeoutUntil });
    }

    if (action === 'delete') {
      await Promise.all([
        User.findByIdAndDelete(userId),
        Message.deleteMany({ sender: userId }),
        Story.deleteMany({ userId: userId }),
        (await import('@/models/Report')).default.deleteMany({ 
          $or: [{ reporterId: userId }, { targetId: userId }] 
        }),
        Chat.updateMany(
          { participants: userId },
          { $pull: { participants: userId } }
        )
      ]);
      return NextResponse.json({ message: 'User and all related data deleted' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error performing moderation action:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
