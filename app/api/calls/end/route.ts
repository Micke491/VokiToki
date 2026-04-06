import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import Pusher from "pusher";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";

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
    const { chatId, callType } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    await connectDB();

    // Find the last call message to determine the call type if not provided
    let endedCallType = callType;
    if (!endedCallType) {
      const lastCallMessage = await Message.findOne({
        chatId,
        mediaType: 'call',
        text: { $not: /Ended/ }
      }).sort({ createdAt: -1 });

      if (lastCallMessage) {
        endedCallType = lastCallMessage.text?.toLowerCase().includes('video') ? 'video' : 'voice';
      }
    }

    const callEndedText = `${endedCallType === 'video' ? 'Video' : 'Voice'} Call Ended`;

    // Create the "Call Ended" message
    const endedCallMessage = await Message.create({
      chatId,
      sender: decoded.userId,
      text: callEndedText,
      isSystemMessage: false,
      mediaType: 'call',
      status: 'sent',
      read: false
    });

    const populatedMessage = await Message.findById(endedCallMessage._id)
      .populate('sender', 'username email avatar');

    if (populatedMessage) {
      await pusher.trigger(`chat-${chatId}`, "call:ended", {
        chatId,
        message: populatedMessage
      });

      await pusher.trigger(`chat-${chatId}`, 'receive-message', populatedMessage);

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: endedCallMessage._id,
        updatedAt: new Date(),
        $set: { hiddenBy: [] }
      });
    }

    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
