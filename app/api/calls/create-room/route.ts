import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import { AccessToken } from "livekit-server-sdk";

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
    const { chatId, username } = body;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit missing configuration" },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${username}_${decoded.userId}`,
      name: username,
    });

    at.addGrant({
      roomJoin: true,
      room: chatId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const roomToken = await at.toJwt();

    return NextResponse.json({
      token: roomToken,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    console.error("Error creating LiveKit token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
