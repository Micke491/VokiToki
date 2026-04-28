import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
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

        console.log(`[AUDIT] Admin ${auth.id} (${auth.email}) accessed user list at ${new Date().toISOString()}`);

        const url = new URL(request.url);
        const search = url.searchParams.get('search') || '';
        const role = url.searchParams.get('role');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const sortBy = url.searchParams.get('sortBy') || 'createdAt';
        const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 1 : -1;

        const allowedSortFields = ['username', 'createdAt', 'isBanned'];
        const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

        const query: any = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        if (role) {
            query.role = role;
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password -twoFactorSecret -resetPasswordToken')
            .sort({ [resolvedSortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalUsers = await User.countDocuments();
        const bannedUsers = await User.countDocuments({ isBanned: true });
        const adminUsers = await User.countDocuments({ role: 'admin' });

        return NextResponse.json({
            users,
            stats: { total: totalUsers, banned: bannedUsers, admins: adminUsers },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
    }
}
