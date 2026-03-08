import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        await connectDB();
        const auth = verifyToken(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get('chatId');

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === auth.id)) {
            return NextResponse.json({ error: "Chat not found or unauthorized" }, { status: 404 });
        }

        const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;

        const messages = await Message.find({
            chatId,
            deletedBy: { $ne: auth.id },
            isDeletedForEveryone: false,
            $or: [
                { mediaUrl: { $exists: true, $ne: null }, mediaType: { $ne: 'audio' } },
                { text: { $regex: urlRegex } }
            ]
        })
        .select('text mediaUrl mediaType mediaPublicId createdAt sender')
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 });

        return NextResponse.json(messages, { status: 200 });
    } catch (error) {
        console.error("Error fetching media list:", error);
        return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
    }
}
