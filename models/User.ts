import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  name?: string;
  bio?: string;
  avatar?: string;
  publicKey?: string;
  readReceipts: boolean;
  blockedUsers: mongoose.Types.ObjectId[];
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  theme: 'light' | 'dark' | 'system';
  mutedChats: {
    chatId: mongoose.Types.ObjectId;
    mutedUntil: Date;
  }[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // Profile fields
  phone?: string;
  location?: string;
  website?: string;
  status?: string;
  lastSeen?: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    publicKey: {
      type: String,
      default: "",
    },
    readReceipts: {
      type: Boolean,
      default: true,
    },
    blockedUsers: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: "",
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark',
    },
    mutedChats: {
      type: [
        {
          chatId: Schema.Types.ObjectId,
          mutedUntil: Date,
        },
      ],
      default: [],
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
    phone: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      maxlength: [100, "Status cannot exceed 100 characters"],
      default: "Hey there!",
    },
    lastSeen: {
      type: Date,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.User;
}

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;