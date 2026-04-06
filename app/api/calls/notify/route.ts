import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";
import User from "@/models/User";
import Message from "@/models/Message";
import { pusherServer } from "@/lib/pusher";
import { verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const auth = verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { chatId, callType, callerName, callerAvatar } = body;

    if (!chatId || !callType || !callerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const chat = await Chat.findById(chatId);
    if (!chat) {
       return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (!chat.isGroupChat) {
      const otherParticipantId = chat.participants.find(
        (p: any) => p.toString() !== auth.id
      );
      if (otherParticipantId) {
        const [caller, recipient] = await Promise.all([
          User.findById(auth.id).select('blockedUsers'),
          User.findById(otherParticipantId).select('blockedUsers'),
        ]);
        const iBlockedThem = caller?.blockedUsers?.some((id: any) => id.toString() === otherParticipantId.toString());
        const theyBlockedMe = recipient?.blockedUsers?.some((id: any) => id.toString() === auth.id);
        if (iBlockedThem || theyBlockedMe) {
          return NextResponse.json({ error: "You cannot call this user." }, { status: 403 });
        }
      }
    }

    await pusherServer.trigger(`chat-${chatId}`, "call:incoming", {
      chatId,
      callType,
      callerName,
      callerAvatar,
      callerId: auth.id,
    });

    const callMessageText = `${callType === 'video' ? 'Video' : 'Voice'} call`;

    let newCallMessage;
    try {
      newCallMessage = await Message.create({
        chatId,
        sender: auth.id,
        text: callMessageText,
        isSystemMessage: false,
        mediaType: 'call',
        status: 'sent',
        read: false
      });
    } catch (createError: any) {
      console.error("Message creation error:", createError);
      // Return detailed validation errors if available
      const details = createError.errors
        ? Object.values(createError.errors).map((e: any) => e.message).join(', ')
        : createError.message;
      return NextResponse.json(
        { error: "Failed to create call message", details },
        { status: 500 }
      );
    }

    const populatedMessage = await Message.findById(newCallMessage!._id)
      .populate('sender', 'username email avatar');

    if (populatedMessage) {
      await pusherServer.trigger(`chat-${chatId}`, 'receive-message', populatedMessage);

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: newCallMessage!._id,
        updatedAt: new Date(),
        $set: { hiddenBy: [] }
      });

      const chatUpdatePromises = chat.participants.map((participantId: any) => {
        return pusherServer.trigger(`user-${participantId.toString()}`, "chat-update", {
          chatId,
          lastMessage: populatedMessage,
          unreadCount: participantId.toString() !== auth.id ? 1 : 0
        });
      });
      await Promise.all(chatUpdatePromises);
    }

    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error("Error notifying call:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
