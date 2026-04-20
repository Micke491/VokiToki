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
        { message: "Too many attempts. Please try again soon." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Reset": reset.toString(),
          }
        }
      );
    }

    const body = await req.json();

    const username = String(body.username);
    const email = String(body.email).toLowerCase();
    const password = String(body.password);
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { message: "Username already taken" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      secret,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      { message: "User registered successfully", token },
      { status: 201 }
    );

  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
