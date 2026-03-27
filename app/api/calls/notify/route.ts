import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    if (!decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { chatId, callType, callerName, callerAvatar } = body;

    if (!chatId || !callType || !callerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await pusher.trigger(`chat-${chatId}`, "call:incoming", {
      chatId,
      callType,
      callerName,
      callerAvatar,
      callerId: decoded.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error notifying call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
