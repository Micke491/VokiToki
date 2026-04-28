import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        await connectDB();
        const auth = await verifyToken(request);
        if (!auth || auth.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const targetUserId = resolvedParams.userId;

        if (auth.id === targetUserId) {
            return NextResponse.json({ message: 'Cannot modify your own admin status or ban yourself' }, { status: 400 });
        }

        const body = await request.json();
        
        const updateData: any = {};
        if (body.role !== undefined && ['user', 'admin'].includes(body.role)) {
            updateData.role = body.role;
        }
        if (body.isBanned !== undefined) {
            updateData.isBanned = Boolean(body.isBanned);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: 'No valid data provided' }, { status: 400 });
        }

        const updatedUser = await User.findByIdAndUpdate(
            targetUserId, 
            { $set: updateData },
            { new: true }
        ).select('-password -twoFactorSecret -resetPasswordToken');

        if (!updatedUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        console.log(`[AUDIT] Admin ${auth.id} (${auth.email}) updated user ${targetUserId}: ${JSON.stringify(updateData)} at ${new Date().toISOString()}`);

        return NextResponse.json({ user: updatedUser, message: 'User updated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }
}
