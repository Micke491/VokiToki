import jwt, { JwtPayload } from "jsonwebtoken";

interface DecodedToken extends JwtPayload {
  userId?: string;
  id?: string;
  _id?: string;
  email?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  timeoutUntil?: Date;
}

import { connectDB } from "./db";
import User from "@/models/User";

export async function verifyToken(req: Request): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get("authorization") || "";
    let token = "";

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|; )token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is missing in env");
      return null;
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;
    
    const id = decoded.userId || decoded.id || decoded._id;

    if (!id) return null;

    await connectDB();
    const user = await User.findById(id).lean();

    if (!user || user.isBanned) {
      return null;
    }

    if (user.timeoutUntil && new Date(user.timeoutUntil) > new Date()) {
      return null;
    }

    return { 
      id, 
      email: decoded.email,
      role: user.role || 'user',
      isBanned: user.isBanned || false,
      timeoutUntil: user.timeoutUntil
    };
    
  } catch (err) {
    return null;
  }
}