import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        await connectDB();
        const auth = await verifyToken(request);
        if (!auth || auth.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { messageId } = await params;
        const pivot = await Message.findById(messageId).lean() as any;
        if (!pivot) {
            return NextResponse.json({ message: 'Message not found' }, { status: 404 });
        }

        const CONTEXT = 5;

        const [before, after] = await Promise.all([
            Message.find({ chatId: pivot.chatId, createdAt: { $lt: pivot.createdAt } })
                .sort({ createdAt: -1 })
                .limit(CONTEXT)
                .populate('sender', 'username avatar')
                .lean(),
            Message.find({ chatId: pivot.chatId, createdAt: { $gt: pivot.createdAt } })
                .sort({ createdAt: 1 })
                .limit(CONTEXT)
                .populate('sender', 'username avatar')
                .lean(),
        ]);

        const pivotPopulated = await Message.findById(messageId)
            .populate('sender', 'username avatar')
            .lean();

        const messages = [
            ...before.reverse(),
            { ...pivotPopulated, _isPivot: true },
            ...after,
        ];

        return NextResponse.json({ messages, chatId: pivot.chatId }, { status: 200 });
    } catch (error) {
        console.error('Context fetch error:', error);
        return NextResponse.json({ message: 'Failed to fetch context' }, { status: 500 });
    }
}
