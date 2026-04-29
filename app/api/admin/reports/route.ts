import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyToken(request);
    
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const query: any = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporterId', 'username name avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query),
    ]);

    const populatedReports = await Promise.all(reports.map(async (report: any) => {
      let targetInfo: any = null;
      try {
        if (report.targetType === 'user') {
          targetInfo = await User.findById(report.targetId).select('username name avatar email').lean();
        } else if (report.targetType === 'message') {
          const Message = (await import('@/models/Message')).default;
          targetInfo = await Message.findById(report.targetId).populate('sender', 'username name avatar').lean();
        } else if (report.targetType === 'story') {
          const Story = (await import('@/models/Story')).default;
          targetInfo = await Story.findById(report.targetId).populate('userId', 'username name avatar').lean();
        }
      } catch (e) {
        console.error(`Error populating target for report ${report._id}:`, e);
      }
      return { ...report, targetInfo };
    }));

    return NextResponse.json({
      reports: populatedReports,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin reports:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
