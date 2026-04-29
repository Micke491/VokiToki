import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await verifyToken(request);
    
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { status, adminNotes } = await request.json();
    const { id } = await params;

    const report = await Report.findByIdAndUpdate(
      id,
      { 
        ...(status && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
      },
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error updating report:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
