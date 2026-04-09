import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import { pusherServer } from "@/lib/pusher";
import { RoomServiceClient } from "livekit-server-sdk";

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

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (apiKey && apiSecret) {
      try {
        const roomService = new RoomServiceClient(
          process.env.NEXT_PUBLIC_LIVEKIT_URL!,
          apiKey,
          apiSecret
        );

        const participants = await roomService.listParticipants(chatId);

        if (participants && participants.length > 0) {
          return NextResponse.json({
            success: true,
            message: "Call still active",
            participantsRemaining: participants.length
          });
        }
      } catch (roomError: any) {
        console.log("LiveKit room check:", roomError.message || "Room not found");
      }
    }

    const lastCallMessage = await Message.findOne({
      chatId,
      mediaType: 'call',
      text: { $not: /Ended/i }
    }).sort({ createdAt: -1 });

    let endedCallType = callType;
    let populatedMessage;

    if (lastCallMessage) {
      endedCallType = callType || (lastCallMessage.text?.toLowerCase().includes('video') ? 'video' : 'voice');
      lastCallMessage.text = `${endedCallType === 'video' ? 'Video' : 'Voice'} Call Ended`;
      await lastCallMessage.save();

      populatedMessage = await Message.findById(lastCallMessage._id)
        .populate('sender', 'username email avatar');
    } else {
      endedCallType = callType || 'voice';
      const callEndedText = `${endedCallType === 'video' ? 'Video' : 'Voice'} Call Ended`;
      
      const endedCallMessage = await Message.create({
        chatId,
        sender: decoded.userId,
        text: callEndedText,
        isSystemMessage: false,
        mediaType: 'call',
        status: 'sent',
        read: false
      });

      populatedMessage = await Message.findById(endedCallMessage._id)
        .populate('sender', 'username email avatar');

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: endedCallMessage._id,
        updatedAt: new Date(),
        $set: { hiddenBy: [] }
      });
    }

    if (populatedMessage) {
      await pusherServer.trigger(`chat-${chatId}`, "call:ended", { chatId });

      await pusherServer.trigger(`chat-${chatId}`, 'message-updated', populatedMessage);

      const chat = await Chat.findById(chatId);
      if (chat) {
         const userPromises = chat.participants.map((p: any) => 
            pusherServer.trigger(`user-${p.toString()}`, "call:ended", {
               chatId,
            })
         );
         await Promise.all(userPromises);
      }
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