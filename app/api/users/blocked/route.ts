import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

// GET — Fetch list of blocked users with their profile info
export async function GET(req: Request) {
    try {
        await connectDB();
        const auth = verifyToken(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await User.findById(auth.id).select('blockedUsers');
        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!currentUser.blockedUsers || currentUser.blockedUsers.length === 0) {
            return NextResponse.json({ blockedUsers: [] }, { status: 200 });
        }

        // Fetch profile info for each blocked user
        const blockedUsers = await User.find({
            _id: { $in: currentUser.blockedUsers }
        }).select('_id username avatar');

        return NextResponse.json({ blockedUsers }, { status: 200 });
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
