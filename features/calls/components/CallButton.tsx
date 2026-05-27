"use client";

import React from "react";
import { Phone, Video } from "lucide-react";

interface CallButtonProps {
  chatId: string;
  isGroup: boolean;
  onCallStart: (callType: "voice" | "video") => void;
  currentUserId: string;
  currentUserUsername: string;
  currentUserAvatar?: string;
  isBlocked?: boolean;
  isDeleted?: boolean;
}

export default function CallButton({
  chatId,
  isGroup,
  onCallStart,
  currentUserId,
  currentUserUsername,
  currentUserAvatar,
  isBlocked,
  isDeleted,
}: CallButtonProps) {
  const handleCall = (type: "voice" | "video") => {
    if (isBlocked || isDeleted) return;
    onCallStart(type);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleCall("voice")}
        disabled={isBlocked || isDeleted}
        className="p-2 text-chat-text-tertiary hover:text-chat-accent hover:bg-chat-hover rounded-full transition-colors disabled:opacity-50"
      >
        <Phone className="w-5 h-5" />
      </button>

      <button
        onClick={() => handleCall("video")}
        disabled={isBlocked || isDeleted}
        className="p-2 text-chat-text-tertiary hover:text-chat-accent hover:bg-chat-hover rounded-full transition-colors disabled:opacity-50"
      >
        <Video className="w-5 h-5" />
      </button>
    </div>
  );
}
