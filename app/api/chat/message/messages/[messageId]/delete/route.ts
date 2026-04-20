import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import { verifyToken } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';
import { pusherServer } from '@/lib/pusher';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB();
    const auth = await verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const url = new URL(req.url);
    const deleteForEveryone = url.searchParams.get('forEveryone') === 'true';

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (deleteForEveryone) {
      if (message.sender.toString() !== auth.id) {
        return NextResponse.json({ error: 'Only sender can delete for everyone' }, { status: 403 });
      }

      if (message.mediaPublicId) {
        try {
          await cloudinary.uploader.destroy(message.mediaPublicId, {
            resource_type: message.mediaType === 'video' ? 'video' : 'image'
          });
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error:', cloudinaryError);
        }
      }

      message.isDeletedForEveryone = true;
      message.deletedForEveryoneAt = new Date();
      message.text = 'This message was deleted';
      message.mediaUrl = undefined;
      message.mediaType = undefined;
      message.mediaPublicId = undefined;
      message.isPinned = false;
    } else {
      if (!message.deletedBy.includes(auth.id as any)) {
        message.deletedBy.push(auth.id as any);
      }
    }

    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'username email avatar')
      .populate('replyTo');

    if (deleteForEveryone && populatedMessage) {
      await pusherServer.trigger(`chat-${message.chatId}`, "message-unpinned", { 
        messageId, 
        chatId: message.chatId 
      });
      await pusherServer.trigger(`chat-${message.chatId}`, "message-deleted", { 
        messageId, 
        chatId: message.chatId 
      });
    }

    return NextResponse.json({ 
      message: populatedMessage,
      deleteForEveryone
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
