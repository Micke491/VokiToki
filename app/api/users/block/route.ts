import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
    try {
        await connectDB();
        const auth = await verifyToken(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { targetUserId } = await req.json();
        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        }

        if (targetUserId === auth.id) {
            return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await User.findByIdAndUpdate(auth.id, {
            $addToSet: { blockedUsers: new mongoose.Types.ObjectId(targetUserId) }
        });
        const chat = await Chat.findOneAndUpdate(
            {
                participants: { $all: [new mongoose.Types.ObjectId(auth.id), new mongoose.Types.ObjectId(targetUserId)] },
                isGroupChat: false,
            },
            {
                $addToSet: { hiddenBy: new mongoose.Types.ObjectId(auth.id) }
            },
            { new: true }
        );

        if (chat) {
            await pusherServer.trigger(`user-${auth.id}`, 'chat-removed', { chatId: chat._id.toString() });

            await pusherServer.trigger(`user-${targetUserId}`, 'user-blocked', {
                blockedBy: auth.id,
                chatId: chat._id.toString(),
            });

            await pusherServer.trigger(`chat-${chat._id.toString()}`, 'user-blocked', {
                blockedBy: auth.id,
                blockedUserId: targetUserId,
            });
        }

        return NextResponse.json({ message: 'User blocked successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error blocking user:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await connectDB();
        const auth = await verifyToken(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { targetUserId } = await req.json();
        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        }

        await User.findByIdAndUpdate(auth.id, {
            $pull: { blockedUsers: new mongoose.Types.ObjectId(targetUserId) }
        });

        return NextResponse.json({ message: 'User unblocked successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error unblocking user:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
