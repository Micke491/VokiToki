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
  replyTo?: Message;
  isDeletedForEveryone?: boolean;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
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
}
