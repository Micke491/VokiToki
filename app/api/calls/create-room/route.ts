import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";

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
    const { isVideo } = body;

    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    if (!DAILY_API_KEY) {
      return NextResponse.json(
        { error: "Daily.co API key not configured" },
        { status: 500 }
      );
    }
    
    const exp = Math.round(Date.now() / 1000) + 60 * 60 * 2;

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          exp,
          enable_chat: false,
          enable_screenshare: true,
          start_video_off: !isVideo,
          start_audio_off: false,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Daily API Error:", errorData);
      return NextResponse.json(
        { error: "Failed to create call room" },
        { status: response.status }
      );
    }

    const room = await response.json();

    return NextResponse.json({
      roomUrl: room.url,
      roomName: room.name,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
