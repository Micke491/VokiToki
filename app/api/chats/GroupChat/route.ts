import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Chat from '@/models/Chat';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(request: Request) {
    try {
        await connectDB();
        const auth = verifyToken(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { name, participants } = await request.json();
        const currentUserId = auth.id;

        if (!name || !participants || !Array.isArray(participants) || participants.length < 2) {
            return NextResponse.json({ message: 'Group name and at least 2 other participants are required' }, { status: 400 });
        }

        // Add current user to participants if not already included (though frontend should probably handle this, safe to ensure)
        // Actually, let's assume 'participants' from body are the *other* users.
        const participantIds = [...new Set([...participants, currentUserId])].map(id => new mongoose.Types.ObjectId(id));

        if (participantIds.length < 3) {
             return NextResponse.json({ message: 'A group chat must have at least 3 participants (including you)' }, { status: 400 });
        }

        const users = await User.find({ _id: { $in: participantIds } });
        if (users.length !== participantIds.length) {
            return NextResponse.json({ message: 'One or more users not found' }, { status: 404 });
        }

        const participantUsernames = users.map(u => u.username);

        const chat = await Chat.create({
            name,
            isGroupChat: true,
            groupAdmin: new mongoose.Types.ObjectId(currentUserId),
            participants: participantIds,
            participantUsernames,
        });

        await chat.populate('participants', 'username email avatar');

        return NextResponse.json(chat, { status: 201 });

    } catch (error: any) {
        console.error('Error creating group chat:', error);
        return NextResponse.json({ message: 'Server Error', details: error.message }, { status: 500 });
    }
}
