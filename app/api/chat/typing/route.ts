import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const auth = verifyToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatId, username, isTyping } = await req.json();

    if (!chatId || !username) {
      return NextResponse.json({ error: 'ChatId and username required' }, { status: 400 });
    }

    const event = isTyping ? 'user-typing' : 'user-stopped-typing';

    await pusherServer.trigger(`chat-${chatId}`, event, {
      username,
      userId: auth.id,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error triggering typing event:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
