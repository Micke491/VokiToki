import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB();
    const auth = verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { status } = await req.json();

    if (!status || !['delivered', 'seen'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Use "delivered" or "seen"' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender.toString() === auth.id) {
      return NextResponse.json({ error: 'Cannot update status of your own message' }, { status: 400 });
    }

    if (status === 'delivered') {
      if (!message.deliveredTo.includes(auth.id as any)) {
        message.deliveredTo.push(auth.id as any);
      }
      
      if (message.status === 'sent') {
        message.status = 'delivered';
      }
    } else if (status === 'seen') {
      const alreadyRead = message.readBy.some(
        (entry: any) => entry.userId.toString() === auth.id
      );
      
      if (!alreadyRead) {
        message.readBy.push({
          userId: auth.id as any,
          readAt: new Date()
        });
      }
      
      if (!message.deliveredTo.includes(auth.id as any)) {
        message.deliveredTo.push(auth.id as any);
      }
      
      message.status = 'seen';
      message.read = true;
    }

    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'username email avatar')
      .populate('replyTo');

    const readingUser = await User.findById(auth.id);

    if (status === 'seen') {
      if (readingUser?.readReceipts) {
        await pusherServer.trigger(`chat-${message.chatId}`, "messages-read", {
          chatId: message.chatId,
          messageIds: [messageId],
          userId: auth.id
        });
      }

      await pusherServer.trigger(`user-${auth.id}`, "chat-update", {
        chatId: message.chatId,
        lastMessage: populatedMessage,
        unreadCount: 0
      });
    }

    return NextResponse.json({ message: populatedMessage }, { status: 200 });
  } catch (error) {
    console.error('Error updating message status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageIds, status } = await req.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'Message IDs array required' }, { status: 400 });
    }

    if (!status || !['delivered', 'seen'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updateOperations = messageIds.map(async (messageId: string) => {
      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() === auth.id) {
        return null;
      }

      if (status === 'delivered') {
        if (!message.deliveredTo.includes(auth.id as any)) {
          message.deliveredTo.push(auth.id as any);
        }
        if (message.status === 'sent') {
          message.status = 'delivered';
        }
      } else if (status === 'seen') {
        const alreadyRead = message.readBy.some(
          (entry: any) => entry.userId.toString() === auth.id
        );
        if (!alreadyRead) {
          message.readBy.push({
            userId: auth.id as any,
            readAt: new Date()
          });
        }
        if (!message.deliveredTo.includes(auth.id as any)) {
          message.deliveredTo.push(auth.id as any);
        }
        message.status = 'seen';
        message.read = true;
      }

      await message.save();
      return message;
    });

    await Promise.all(updateOperations);

    const readingUser = await User.findById(auth.id);

    if (status === 'seen') {
      const firstMessage = await Message.findById(messageIds[0]);
      if (firstMessage) {
        if (readingUser?.readReceipts) {
          await pusherServer.trigger(`chat-${firstMessage.chatId}`, "messages-read", {
            chatId: firstMessage.chatId,
            messageIds: messageIds,
            userId: auth.id
          });
        }

        const lastMessage = await Message.findOne({ chatId: firstMessage.chatId })
          .sort({ createdAt: -1 })
          .populate('sender', 'username email avatar');

        await pusherServer.trigger(`user-${auth.id}`, "chat-update", {
          chatId: firstMessage.chatId,
          lastMessage,
          unreadCount: 0
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated: messageIds.length 
    }, { status: 200 });
  } catch (error) {
    console.error('Error bulk updating message status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
