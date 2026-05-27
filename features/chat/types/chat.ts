import { Story, StoryUser } from "@/features/story/types/story";

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
  senderUsername?: string;
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
  deliveredTo?: string[];
  storyId?: string;
  storyMediaUrl?: string;
  storyMediaType?: "image" | "video";
  storyCaption?: string;
  storyExpiresAt?: string;
  storyExpired?: boolean;
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
  onChatUpdated?: (updatedChat: any) => void;
  onViewStory?: (storyId: string) => void;
}
