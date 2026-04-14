export interface Message {
  status: "seen" | "sent" | "delivered";
  read: boolean;
  _id: string;
  chatId: string;
  sender: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  text: string;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
  isPinned?: boolean;
  isForwarded?: boolean;
  isSystemMessage?: boolean;
  replyTo?: Message;
  isDeletedForEveryone?: boolean;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "gif" | "sticker" | "call";
  mediaPublicId?: string;
  reactions?: {
    userId: string;
    emoji: string;
    createdAt: string;
    user?: {
      username: string;
      avatar?: string;
    };
  }[];
  readBy?: {
    userId: string;
    readAt: string;
  }[];
}

export interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  currentUserUsername?: string;
  recipientUsername?: string;
  recipientAvatar?: string;
  onClose?: () => void;
  isGroup?: boolean;
  groupAdminId?: string;
  participants?: Array<{
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  }>;
  onMenuClick?: () => void;
  recipientStoriesUser?: StoryUser;
  onStoryClick?: (userId: string, stories: Story[], username: string, avatar?: string) => void;
}

export interface IncomingCallData {
  callType: "voice" | "video";
  callerName: string;
  callerAvatar?: string;
  callerId: string;
}

export interface Story {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewedBy: {
    userId: string;
    viewedAt: string;
  }[];
}

export interface StoryUser {
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  stories: Story[];
}

export interface UserProfile {
  _id: string;
  username: string;
  name?: string;
  bio?: string;
  avatar?: string;
  links: { label: string; url: string }[];
  location?: string;
  status?: string;
  lastSeen?: string;
  isOnline: boolean;
  createdAt: string;
  activeStoriesCount: number;
}
