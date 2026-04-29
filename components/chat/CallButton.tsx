import React, { useState } from "react";
import { Phone, Video, Loader2 } from "lucide-react";

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
  onCallStart,
  currentUserUsername,
  currentUserAvatar,
  isBlocked,
  isDeleted,
}: CallButtonProps) {
  const [loadingType, setLoadingType] = useState<"voice" | "video" | null>(null);

  const startCall = (type: "voice" | "video") => {
    if (isBlocked || isDeleted) return;
    onCallStart(type);
  };

  const isDisabled = isBlocked || isDeleted || !!loadingType;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => startCall("voice")}
        disabled={isDisabled}
        className="p-2 text-chat-text-tertiary hover:text-chat-accent hover:bg-chat-hover rounded-full transition-colors disabled:opacity-50"
        title="Start Voice Call"
      >
        {loadingType === "voice" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Phone className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={() => startCall("video")}
        disabled={isDisabled}
        className="p-2 text-chat-text-tertiary hover:text-chat-accent hover:bg-chat-hover rounded-full transition-colors disabled:opacity-50"
        title="Start Video Call"
      >
        {loadingType === "video" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Video className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
