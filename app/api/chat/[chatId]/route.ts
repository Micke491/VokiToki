import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
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
        const auth = verifyToken(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const chat = await Chat.findById(chatId)
            .populate('participants', 'username email avatar');

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        const isParticipant = chat.participants.some((p: any) => p._id.toString() === auth.id);
        if (!isParticipant) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(chat, { status: 200 });
    } catch (error) {
        console.error('Error fetching chat:', error);
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
        const auth = verifyToken(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        const existingParticipantIds = chat.participants.map((p: any) => p.toString());
        if (!existingParticipantIds.includes(auth.id)) {
            return NextResponse.json({ error: 'User is not in the chat' }, { status: 403 });
        }

        const pIndex = existingParticipantIds.indexOf(auth.id);
        chat.participants = chat.participants.filter((p: any) => p.toString() !== auth.id);
        if (pIndex > -1) {
            chat.participantUsernames.splice(pIndex, 1);
        }

        if (chat.isGroupChat && chat.groupAdmin?.toString() === auth.id) {
             if (chat.participants.length > 0) {
                 chat.groupAdmin = chat.participants[0] as any;
             }
        }

        if (chat.participants.length === 0) {
            await Chat.findByIdAndDelete(chat._id);
        } else {
            await chat.save();
            
            const populatedChat = await Chat.findById(chat._id).populate('participants', 'username email avatar');
            await pusherServer.trigger(`chat-${chatId}`, 'chat-updated', populatedChat);

            const updatePromises = chat.participants.map((pid: any) => {
                return pusherServer.trigger(`user-${pid.toString()}`, 'chat-update', {
                    chatId: populatedChat?._id,
                    participants: populatedChat?.participants,
                    participantUsernames: populatedChat?.participantUsernames,
                    groupAdmin: populatedChat?.groupAdmin
                });
            });
            await Promise.all(updatePromises);
        }

        await pusherServer.trigger(`user-${auth.id}`, 'chat-removed', { chatId });

        return NextResponse.json({ message: 'Chat deleted/left successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error deleting chat:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
