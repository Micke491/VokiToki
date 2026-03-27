import React, { useState } from "react";
import { Phone, Video, Loader2 } from "lucide-react";

interface CallButtonProps {
  chatId: string;
  isGroup: boolean;
  onCallStart: (roomUrl: string, callType: "voice" | "video") => void;
  currentUserId: string;
  currentUserUsername: string;
  currentUserAvatar?: string;
}

export default function CallButton({
  chatId,
  isGroup,
  onCallStart,
  currentUserId,
  currentUserUsername,
  currentUserAvatar,
}: CallButtonProps) {
  const [loadingType, setLoadingType] = useState<"voice" | "video" | null>(null);

  const startCall = async (type: "voice" | "video") => {
    if (loadingType) return;
    setLoadingType(type);

    try {
      const roomRes = await fetch("/api/calls/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ isVideo: type === "video" }),
      });

      if (!roomRes.ok) throw new Error("Failed to create call room");
      const { roomUrl, roomName } = await roomRes.json();

      await fetch("/api/calls/notify", {
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
          roomUrl,
          roomName,
        }),
      });

      onCallStart(roomUrl, type);
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Could not start the call. Please try again.");
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
