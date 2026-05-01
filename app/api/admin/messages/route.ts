import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await connectDB();
        const auth = await verifyToken(request);
        if (!auth || auth.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const search = url.searchParams.get('search') || '';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const query: any = {};
        if (search.startsWith('@') && search.length > 1) {
            const term = search.slice(1);
            const matchingUsers = await User.find({
                $or: [
                    { username: { $regex: term, $options: 'i' } },
                    { email: { $regex: term, $options: 'i' } },
                ],
            }).select('_id').lean();

            const userIds = matchingUsers.map(u => u._id);

            query.$or = [
                ...(userIds.length > 0 ? [{ sender: { $in: userIds } }] : []),
                { senderUsername: { $regex: term, $options: 'i' } },
            ];
        } else if (search) {
            query.text = { $regex: search, $options: 'i' };
        }

        const total = await Message.countDocuments(query);
        const messages = await Message.find(query)
            .populate('sender', 'username email avatar')
            .populate('chatId', 'isGroupChat name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalMessages = await Message.countDocuments();
        const totalDeletedMessages = await Message.countDocuments({ isDeletedForEveryone: true });

        return NextResponse.json({
            messages,
            stats: {
                total: totalMessages,
                deleted: totalDeletedMessages
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ message: 'Failed to fetch messages' }, { status: 500 });
    }
}
