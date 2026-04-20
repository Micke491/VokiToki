import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Chat from '@/models/Chat';
import User from '@/models/User';
import Message from '@/models/Message';
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(
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
        if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        if (!chat.isGroupChat) return NextResponse.json({ error: 'Not a group chat' }, { status: 400 });

        const existingParticipantIds = chat.participants.map((p: any) => p.toString());
        if (!existingParticipantIds.includes(auth.id)) {
            return NextResponse.json({ error: 'You are not in this chat' }, { status: 400 });
        }

        const pIndex = existingParticipantIds.indexOf(auth.id);

        chat.participants = chat.participants.filter((p: any) => p.toString() !== auth.id);
        if (pIndex > -1) {
            chat.participantUsernames.splice(pIndex, 1);
        }

        if (chat.groupAdmin?.toString() === auth.id) {
            if (chat.participants.length > 0) {
                chat.groupAdmin = chat.participants[0] as any;
            }
        }

        if (chat.participants.length === 0) {
             await Chat.findByIdAndDelete(chat._id);
             await pusherServer.trigger(`user-${auth.id}`, 'chat-removed', { chatId });
             return NextResponse.json({ message: 'Chat deleted as everyone left' }, { status: 200 });
        }

        await chat.save();

        const populatedChat = await Chat.findById(chat._id).populate('participants', 'username email avatar');

        await pusherServer.trigger(`chat-${chatId}`, 'chat-updated', populatedChat);
        await pusherServer.trigger(`user-${auth.id}`, 'chat-removed', { chatId });

        const updatePromises = chat.participants.map((pid: any) => {
            return pusherServer.trigger(`user-${pid.toString()}`, 'chat-update', {
                chatId: populatedChat?._id,
                participants: populatedChat?.participants,
                participantUsernames: populatedChat?.participantUsernames,
                groupAdmin: populatedChat?.groupAdmin
            });
        });
        await Promise.all(updatePromises);

        const currentUser = await User.findById(auth.id);
        const systemMessageText = `${currentUser?.username || 'A user'} left the chat`;
        const newSystemMessage = await Message.create({
            chatId,
            sender: auth.id,
            text: systemMessageText,
            isSystemMessage: true
        });
        
        const populatedMessage = await Message.findById(newSystemMessage._id).populate('sender', 'username avatar');
        await pusherServer.trigger(`chat-${chatId}`, 'receive-message', populatedMessage);

        return NextResponse.json(populatedChat, { status: 200 });
    } catch (error) {
        console.error('Error leaving group chat:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
