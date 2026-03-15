import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Chat from '@/models/Chat';
import User from '@/models/User';
import Message from '@/models/Message';
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(
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
        const { name, avatar } = body;

        const chat = await Chat.findById(chatId);
        if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        if (!chat.isGroupChat) return NextResponse.json({ error: 'Not a group chat' }, { status: 400 });
        if (chat.groupAdmin?.toString() !== auth.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        if (name !== undefined) chat.name = name;
        if (avatar !== undefined) chat.avatar = avatar;

        await chat.save();

        const populatedChat = await Chat.findById(chat._id).populate('participants', 'username email avatar');

        await pusherServer.trigger(`chat-${chatId}`, 'chat-updated', populatedChat);

        const updatePromises = chat.participants.map((pid: any) => {
            return pusherServer.trigger(`user-${pid.toString()}`, 'chat-update', {
                chatId: populatedChat?._id,
                name: populatedChat?.name,
                avatar: populatedChat?.avatar
            });
        });
        await Promise.all(updatePromises);

        // --- Create System Message ---
        let updateDesc = 'group details';
        if (name && avatar) updateDesc = 'group name and avatar';
        else if (name) updateDesc = 'group name';
        else if (avatar) updateDesc = 'group avatar';
        
        const currentUser = await User.findById(auth.id);
        const systemMessageText = `${currentUser?.username || 'Admin'} updated the ${updateDesc}`;
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
        console.error('Error updating group chat:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
