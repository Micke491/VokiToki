import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        await connectDB();
        const { chatId } = await params;
        const auth = await verifyToken(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        const isParticipant = chat.participants.some((p: any) => p.toString() === auth.id || p._id?.toString() === auth.id);
        if (!isParticipant) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const pinnedMessages = await Message.find({
            chatId,
            isPinned: true,
            deletedBy: { $ne: auth.id },
            isDeletedForEveryone: false
        })
        .populate('sender', 'username email avatar')
        .sort({ createdAt: -1 })
        .limit(1);

        return NextResponse.json(pinnedMessages, { status: 200 });
    } catch (error) {
        console.error('Error fetching pinned messages:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        await connectDB();
        const { chatId } = await params;
        const { messageId } = await request.json();
        const auth = await verifyToken(request);
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const message = await Message.findById(messageId);
        if (!message || message.chatId.toString() !== chatId) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        await Message.updateMany(
            { chatId, isPinned: true },
            { isPinned: false }
        );

        message.isPinned = true;
        await message.save();

        const populatedMessage = await Message.findById(messageId).populate('sender', 'username email avatar');
        
        await pusherServer.trigger(`chat-${chatId}`, 'message-pinned', populatedMessage);

        return NextResponse.json({ success: true, message: populatedMessage }, { status: 200 });
    } catch (error) {
        console.error('Error pinning message:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        await connectDB();
        const { chatId } = await params;
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('messageId');
        const auth = await verifyToken(request);
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!messageId) return NextResponse.json({ error: 'Message ID required' }, { status: 400 });

        const message = await Message.findById(messageId);
        if (!message || message.chatId.toString() !== chatId) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        message.isPinned = false;
        await message.save();

        await pusherServer.trigger(`chat-${chatId}`, 'message-unpinned', { messageId, chatId });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error unpinning message:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
