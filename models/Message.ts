import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReadByEntry {
  userId: mongoose.Types.ObjectId;
  readAt: Date;
}

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderUsername?: string;
  text: string;
  iv?: string;
  read: boolean;
  
  status: 'sent' | 'delivered' | 'seen';
  deliveredTo: mongoose.Types.ObjectId[];
  readBy: IReadByEntry[];
  
  isEdited: boolean;
  editedAt?: Date;
  originalText?: string;
  
  isDeletedForEveryone: boolean;
  deletedBy: mongoose.Types.ObjectId[];
  deletedForEveryoneAt?: Date;
  
  isPinned: boolean;
  replyTo?: mongoose.Types.ObjectId;
  
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'call';
  mediaPublicId?: string;
  
  isForwarded: boolean;
  isSystemMessage: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  
  reactions: {
    userId: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }[];
}

const ReadByEntrySchema = new Schema<IReadByEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // 🚀 NEW INDEX: Speed up sender lookups
    },
    senderUsername: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      required: function(this: any) {
        return !this.mediaUrl;
      },
    },
    iv: {
      type: String,
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'audio', 'gif', 'sticker', 'call'],
    },
    mediaPublicId: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
      index: true, // 🚀 NEW INDEX: Speed up read status queries
    },
    
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    deliveredTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    readBy: [ReadByEntrySchema],
    
    isPinned: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    originalText: {
      type: String,
    },
    
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
      index: true, // 🚀 NEW INDEX: Speed up deletion queries
    },
    deletedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    deletedForEveryoneAt: {
      type: Date,
    },

    isForwarded: {
      type: Boolean,
      default: false,
    },
    
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
    
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    
    reactions: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      emoji: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// 🚀 COMPOUND INDEXES for common queries
MessageSchema.index({ chatId: 1, createdAt: -1 }); // Fetch messages by chat
MessageSchema.index({ sender: 1 }); // Sender lookups
MessageSchema.index({ chatId: 1, deletedBy: 1 }); // Check deleted messages
MessageSchema.index({ chatId: 1, isDeletedForEveryone: 1 }); // Filter deleted messages

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
