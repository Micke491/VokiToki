import React, { useEffect, useState } from "react";
import { 
  LiveKitRoom, 
  VideoConference, 
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface CallModalProps {
  onLeave: () => void;
  chatId: string;
  callType: "voice" | "video";
  username: string;
}

export default function CallModal({ onLeave, chatId, callType, username }: CallModalProps) {
  const [token, setToken] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/calls/create-room", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ chatId, username }),
        });
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [chatId, username]);

  const handleDisconnected = () => {
    onLeave();
    fetch("/api/calls/end", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ chatId, callType }),
    }).catch(console.error);
  };

  if (token === "") {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-5xl h-[80vh] bg-chat-glass backdrop-blur-2xl border border-chat-border rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <LiveKitRoom
          video={callType === "video"}
          audio={true}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          onDisconnected={handleDisconnected}
          data-lk-theme="default"
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </motion.div>
  );
}