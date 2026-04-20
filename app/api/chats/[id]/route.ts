import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';
import { pusherServer } from '@/lib/pusher';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id: chatId } = await params;
        const auth = await verifyToken(request);
        if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const userId = auth.id;

        const chat = await Chat.findByIdAndUpdate(
            chatId,
            { $addToSet: { hiddenBy: new mongoose.Types.ObjectId(userId) } },
            { new: true }
        );
        console.log("Chat after DELETE (hiding):", chat?.hiddenBy);

        if (!chat) return NextResponse.json({ message: 'Chat not found' }, { status: 404 });

        await pusherServer.trigger(`user-${userId}`, 'chat-removed', { chatId });

        return NextResponse.json({ message: 'Chat hidden' }, { status: 200 });
    } catch (error: any) {
        console.error("Error in DELETE chat:", error);
        return NextResponse.json({ message: 'Server Error' }, { status: 500 });
    }
}