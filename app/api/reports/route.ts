import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { generalLimiter } from '@/lib/ratelimit';

export async function POST(request: Request) {
  try {
    await connectDB();
    const auth = await verifyToken(request);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { success, reset } = await generalLimiter.limit(auth.id);
    if (!success) {
      return NextResponse.json(
        { message: "Too many reports. Please wait." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Reset": reset.toString(),
          }
        }
      );
    }

    const { targetId, targetType, category, details } = await request.json();

    if (!targetId || !targetType || !category) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const report = await Report.create({
      reporterId: auth.id,
      targetId,
      targetType,
      category,
      details,
      status: 'pending',
    });

    await pusherServer.trigger('admin-reports', 'new-report', {
      reportId: report._id,
      category,
      targetType,
      createdAt: report.createdAt,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error('Error creating report:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
