import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        await connectDB();
        const auth = await verifyToken(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get('chatId');

        if (!chatId) {
            return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat || chat.isGroupChat) {
            return NextResponse.json({ blocked: false }, { status: 200 });
        }

        const otherParticipantId = chat.participants.find(
            (p: any) => p.toString() !== auth.id
        );

        if (!otherParticipantId) {
            return NextResponse.json({ blocked: false }, { status: 200 });
        }

        const [currentUser, otherUser] = await Promise.all([
            User.findById(auth.id).select('blockedUsers'),
            User.findById(otherParticipantId).select('blockedUsers'),
        ]);

        const iBlockedThem = currentUser?.blockedUsers?.some(
            (id: any) => id.toString() === otherParticipantId.toString()
        );
        const theyBlockedMe = otherUser?.blockedUsers?.some(
            (id: any) => id.toString() === auth.id
        );

        return NextResponse.json({
            blocked: !!(iBlockedThem || theyBlockedMe),
            blockedByMe: !!iBlockedThem,
            blockedByThem: !!theyBlockedMe,
        }, { status: 200 });
    } catch (error) {
        console.error('Error checking block status:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
