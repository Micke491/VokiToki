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
        const auth = verifyToken(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        if (!chat.isGroupChat) return NextResponse.json({ error: 'Not a group chat' }, { status: 400 });
        if (chat.groupAdmin?.toString() !== auth.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        if (userId === auth.id) {
            return NextResponse.json({ error: 'Admin cannot remove themselves. Use leave instead.' }, { status: 400 });
        }

        const existingParticipantIds = chat.participants.map((p: any) => p.toString());
        if (!existingParticipantIds.includes(userId)) {
            return NextResponse.json({ error: 'User is not in the chat' }, { status: 400 });
        }

        const pIndex = existingParticipantIds.indexOf(userId);

        chat.participants = chat.participants.filter((p: any) => p.toString() !== userId);
        if (pIndex > -1) {
            chat.participantUsernames.splice(pIndex, 1);
        }

        await chat.save();

        const populatedChat = await Chat.findById(chat._id).populate('participants', 'username email avatar');

        await pusherServer.trigger(`chat-${chatId}`, 'chat-updated', populatedChat);

        await pusherServer.trigger(`user-${userId}`, 'chat-removed', { chatId });

        const updatePromises = chat.participants.map((pid: any) => {
            return pusherServer.trigger(`user-${pid.toString()}`, 'chat-update', {
                chatId: populatedChat?._id,
                participants: populatedChat?.participants,
                participantUsernames: populatedChat?.participantUsernames
            });
        });
        await Promise.all(updatePromises);
        
        const removedUser = await User.findById(userId);
        const currentUser = await User.findById(auth.id);
        if (removedUser) {
            const systemMessageText = `${currentUser?.username || 'Admin'} removed ${removedUser.username} from the chat`;
            const newSystemMessage = await Message.create({
                chatId,
                sender: auth.id,
                text: systemMessageText,
                isSystemMessage: true
            });
            
            const populatedMessage = await Message.findById(newSystemMessage._id).populate('sender', 'username avatar');
            await pusherServer.trigger(`chat-${chatId}`, 'receive-message', populatedMessage);
        }

        return NextResponse.json(populatedChat, { status: 200 });
    } catch (error) {
        console.error('Error removing participant:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
