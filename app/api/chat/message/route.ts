import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import Chat from '@/models/Chat';
import User from '@/models/User';   
import { verifyToken } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { messageLimiter } from '@/lib/ratelimit';

export async function POST(req: Request) {
    try {
        await connectDB();
        const auth = verifyToken(req);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { success, reset } = await messageLimiter.limit(auth.id);
        if (!success) {
            return NextResponse.json(
                { error: "Too many messages. Slow down!" },
                { 
                    status: 429,
                    headers: {
                        "X-RateLimit-Reset": reset.toString(),
                    }
                }
            );
        }

        const body = await req.json();
        const { chatId, senderId, text, replyTo, mediaUrl, mediaType, mediaPublicId, isForwarded } = body;

        if (auth.id !== senderId) {
            return NextResponse.json({ error: "Unauthorized sender" }, { status: 403 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

        const isParticipant = chat.participants.some(p => p.toString() === senderId);
        if (!isParticipant) {
            return NextResponse.json({ error: "Not a member of this chat" }, { status: 403 });
        }

        if (!chat.isGroupChat) {
            const otherParticipantId = chat.participants.find(p => p.toString() !== senderId);
            if (otherParticipantId) {
                const otherUser = await User.findById(otherParticipantId);
                if (!otherUser) {
                    return NextResponse.json({ error: "Cannot send messages. The other user has deleted their account." }, { status: 403 });
                }

                const senderUser = await User.findById(senderId).select('blockedUsers');
                const iBlockedThem = senderUser?.blockedUsers?.some((id: any) => id.toString() === otherParticipantId.toString());
                const theyBlockedMe = otherUser.blockedUsers?.some((id: any) => id.toString() === senderId);

                if (iBlockedThem || theyBlockedMe) {
                    return NextResponse.json({ error: "You cannot send messages to this user." }, { status: 403 });
                }
            }
        }

        const newMessage = await Message.create({
            chatId,
            sender: senderId,
            text: text?.trim() || "",
            replyTo: replyTo || undefined,
            mediaUrl,
            mediaType,
            mediaPublicId,
            isForwarded: isForwarded || false,
        });

        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: newMessage._id,
            updatedAt: new Date(),
            $set: { hiddenBy: [] }
        });

        let populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username email avatar');
        if (!populatedMessage) {
            return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
        }

        if (replyTo) {
            populatedMessage = await populatedMessage.populate({
                path: 'replyTo',
                populate: { path: 'sender', select: 'username' }
            });
        }

        // Trigger Pusher events
        await pusherServer.trigger(`chat-${chatId}`, "receive-message", populatedMessage);

        const chatUpdatePromises = chat.participants.map((participantId: any) => {
            return pusherServer.trigger(`user-${participantId.toString()}`, "chat-update", {
                chatId,
                lastMessage: populatedMessage,
                unreadCount: participantId.toString() !== senderId ? 1 : 0
            });
        });

        await Promise.all(chatUpdatePromises);

        return NextResponse.json({ message: populatedMessage }, { status: 201 });
    } catch (error) {
        console.error("POST message error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        await connectDB();
        const auth = verifyToken(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get('chatId');
        const limit = parseInt(searchParams.get('limit') || '30');
        const before = searchParams.get('before');

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
        }

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === auth.id)) {
            return NextResponse.json({ error: "Chat not found or unauthorized" }, { status: 404 });
        }

        const query: any = { 
            chatId,
            deletedBy: { $ne: auth.id }
        };
        
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate('sender', 'username email avatar')
            .populate({
                path: 'replyTo',
                populate: { path: 'sender', select: 'username email' }
            })
            .populate({
                path: 'reactions.userId',
                select: 'username avatar'
            })
            .populate({
                path: 'readBy.userId',
                select: 'username avatar'
            })
            .sort({ createdAt: -1 })
            .limit(limit + 1);

        const hasMore = messages.length > limit;
        const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
        const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1].createdAt.toISOString() : null;

        const unreadMessageIds = messagesToReturn
            .filter(msg => {
                if (!msg.sender) return false;

                const senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
                
                const hasRead = msg.readBy?.some((r: any) => {
                    const rId = r.userId?._id ? r.userId._id.toString() : r.userId?.toString();
                    return rId === auth.id;
                });
                
                return senderId !== auth.id && !hasRead;
            })
            .map(msg => msg._id);

        if (unreadMessageIds.length > 0) {
            await Message.updateMany(
                { 
                    _id: { $in: unreadMessageIds },
                    'readBy.userId': { $ne: auth.id }
                },
                { 
                    $push: { 
                        readBy: { userId: auth.id, readAt: new Date() } 
                    },
                    $addToSet: { deliveredTo: auth.id },
                    $set: { status: 'seen', read: true }
                }
            );
        }

        return NextResponse.json({ 
            messages: messagesToReturn.reverse(),
            hasMore,
            nextCursor
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}