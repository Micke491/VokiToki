import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authLimiter, getIP } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const ip = getIP(req);
    const { success, reset } = await authLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        { message: "Too many attempts. Please try again later." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Reset": reset.toString(),
          }
        }
      );
    }

    const body = await req.json();
    
    const email = String(body.email);
    const password = String(body.password);

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not defined in environment variables");
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ message: "This account has been banned" }, { status: 403 });
    }

    if (user.timeoutUntil && new Date(user.timeoutUntil) > new Date()) {
      const timeoutDate = new Date(user.timeoutUntil).toLocaleString();
      return NextResponse.json({ 
        message: `Your account is temporarily suspended until ${timeoutDate}` 
      }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      secret,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      { message: "Login successful", token },
      { status: 200 }
    );
    
    return response;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
