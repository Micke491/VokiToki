import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        await connectDB();
        const auth = verifyToken(req);
        
        if (!auth) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("username") || ""; 

        if (!query) {
            return NextResponse.json({ message: "Search query is required" }, { status: 400 });
        }

        const currentUser = await User.findById(auth.id).select('blockedUsers');
        const myBlockedIds = currentUser?.blockedUsers?.map((id: any) => id.toString()) || [];

        const usersWhoBlockedMe = await User.find({
            blockedUsers: auth.id
        }).select('_id');
        const blockedByIds = usersWhoBlockedMe.map(u => u._id.toString());

        const allExcludedIds = [...new Set([...myBlockedIds, ...blockedByIds, auth.id])];

        const users = await User.find({
            username: { $regex: query, $options: "i" },
            _id: { $nin: allExcludedIds } 
        })
            .select("username name avatar")
            .limit(10);

        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error("Error searching users:", error);
        return NextResponse.json({ message: "Search failed" }, { status: 500 });
    }
}