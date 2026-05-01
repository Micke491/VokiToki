import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Story from '@/models/Story';
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

        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const total = await Story.countDocuments();
        const stories = await Story.find()
            .populate('userId', 'username email avatar')
            .populate('viewedBy.userId', 'username avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalStories = await Story.countDocuments();
        const activeStories = await Story.countDocuments({ expiresAt: { $gt: new Date() } });

        return NextResponse.json({
            stories,
            stats: {
                total: totalStories,
                active: activeStories
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching stories:', error);
        return NextResponse.json({ message: 'Failed to fetch stories' }, { status: 500 });
    }
}
