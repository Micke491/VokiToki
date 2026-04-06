import React, { useState } from "react";
import { Phone, Video, Loader2 } from "lucide-react";

interface CallButtonProps {
  chatId: string;
  isGroup: boolean;
  onCallStart: (callType: "voice" | "video") => void;
  currentUserId: string;
  currentUserUsername: string;
  currentUserAvatar?: string;
}

export default function CallButton({
  chatId,
  onCallStart,
  currentUserUsername,
  currentUserAvatar,
}: CallButtonProps) {
  const [loadingType, setLoadingType] = useState<"voice" | "video" | null>(null);

  const startCall = async (type: "voice" | "video") => {
    if (loadingType) return;
    setLoadingType(type);

    try {
      const notifyRes = await fetch("/api/calls/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          chatId,
          callType: type,
          callerName: currentUserUsername,
          callerAvatar: currentUserAvatar,
        }),
      });

      if (!notifyRes.ok) {
        const errorData = await notifyRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.details || `HTTP ${notifyRes.status}`);
      }

      onCallStart(type);
    } catch (error: any) {
      console.error("Error starting call:", error);
      alert(`Could not start the call: ${error.message}`);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => startCall("voice")}
        disabled={!!loadingType}
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
        disabled={!!loadingType}
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
