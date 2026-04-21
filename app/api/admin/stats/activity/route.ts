import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await connectDB();
        const auth = await verifyToken(request);
        if (!auth || auth.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [messagesPerDay, usersPerDay] = await Promise.all([
            Message.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            ]),
            User.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            ]),
        ]);

        const days: { date: string; label: string; messages: number; users: number }[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(sevenDaysAgo.getDate() + i);
            const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

            const msgEntry = messagesPerDay.find(
                (e) => e._id.year === d.getFullYear() && e._id.month === d.getMonth() + 1 && e._id.day === d.getDate()
            );
            const userEntry = usersPerDay.find(
                (e) => e._id.year === d.getFullYear() && e._id.month === d.getMonth() + 1 && e._id.day === d.getDate()
            );

            days.push({ date: dateKey, label, messages: msgEntry?.count ?? 0, users: userEntry?.count ?? 0 });
        }

        return NextResponse.json({ days }, { status: 200 });
    } catch (error) {
        console.error('Activity stats error:', error);
        return NextResponse.json({ message: 'Failed to fetch activity' }, { status: 500 });
    }
}
