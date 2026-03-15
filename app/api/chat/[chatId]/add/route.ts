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
        const { userIds } = body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        if (!chat.isGroupChat) return NextResponse.json({ error: 'Not a group chat' }, { status: 400 });
        if (chat.groupAdmin?.toString() !== auth.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        const usersToAdd = await User.find({ _id: { $in: userIds } });
        if (usersToAdd.length === 0) {
            return NextResponse.json({ error: 'No valid users found' }, { status: 404 });
        }

        const existingParticipantIds = chat.participants.map((p: any) => p.toString());
        const newUsers = usersToAdd.filter(u => !existingParticipantIds.includes(u._id.toString()));

        if (newUsers.length === 0) {
            return NextResponse.json({ error: 'Users are already in the chat' }, { status: 400 });
        }

        const newParticipantIds = newUsers.map(u => u._id);
        const newParticipantUsernames = newUsers.map(u => u.username);

        chat.participants.push(...newParticipantIds as any);
        chat.participantUsernames.push(...newParticipantUsernames);
        
        await chat.save();

        const populatedChat = await Chat.findById(chat._id).populate('participants', 'username email avatar');

        await pusherServer.trigger(`chat-${chatId}`, 'chat-updated', populatedChat);

        const updatePromises = existingParticipantIds.map((pid: string) => {
            return pusherServer.trigger(`user-${pid}`, 'chat-update', {
                chatId,
                participants: populatedChat?.participants,
                participantUsernames: populatedChat?.participantUsernames
            });
        });

        const notifyPromises = newParticipantIds.map((pid: any) => {
            return pusherServer.trigger(`user-${pid.toString()}`, 'chat-new', populatedChat);
        });

        await Promise.all([...updatePromises, ...notifyPromises]);
        
        const currentUser = await User.findById(auth.id);
        const systemMessageText = `@${currentUser?.username || 'Admin'} added ${newParticipantUsernames.join(', ')} to the chat`;
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
        console.error('Error adding participants:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
