import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: Request) {
  try {
    await connectDB();

    const auth = await verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    const updates: any = {};
    if (body.theme !== undefined) updates.theme = body.theme;
    if (body.readReceipts !== undefined) updates.readReceipts = body.readReceipts;

    const updatedUser = await User.findByIdAndUpdate(
      auth.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
        message: 'Preferences updated successfully',
        user: updatedUser 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Update Preferences Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
