import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB();
    const auth = await verifyToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messageId } = await params;
    const { emoji, chatId } = await req.json();

    if (!emoji || !chatId) {
      return NextResponse.json({ error: 'Emoji and chatId required' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const existingReaction = message.reactions?.find(
      (r) => r.userId.toString() === auth.id && r.emoji === emoji
    );

    if (existingReaction) {
      return NextResponse.json({ error: 'Reaction already exists' }, { status: 400 });
    }

    message.reactions = message.reactions || [];
    message.reactions.push({
      userId: auth.id as any,
      emoji,
      createdAt: new Date(),
    });

    await message.save();

    const user = await User.findById(auth.id).select('username avatar');
    const reactionWithUser = {
      userId: auth.id,
      emoji,
      createdAt: new Date(),
      user,
    };

    await pusherServer.trigger(`chat-${chatId}`, 'message-reaction-added', {
      chatId,
      messageId,
      reaction: reactionWithUser,
    });

    return NextResponse.json({ success: true, reaction: reactionWithUser }, { status: 200 });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB();
    const auth = await verifyToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messageId } = await params;
    const { searchParams } = new URL(req.url);
    const emoji = searchParams.get('emoji');
    const chatId = searchParams.get('chatId');

    if (!emoji || !chatId) {
        return NextResponse.json({ error: 'Emoji and chatId required' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    message.reactions = message.reactions?.filter(
      (r) => !(r.userId.toString() === auth.id && r.emoji === emoji)
    );

    await message.save();

    await pusherServer.trigger(`chat-${chatId}`, 'message-reaction-removed', {
      chatId,
      messageId,
      userId: auth.id,
      emoji,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
