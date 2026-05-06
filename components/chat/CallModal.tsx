import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
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
  const [serverUrl, setServerUrl] = useState("");
  const isLeaving = React.useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiFetch("/api/calls/create-room", {
          method: "POST",
          body: JSON.stringify({ chatId, username }),
        });
        const data = await resp.json();
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } catch (e) {
        console.error("Token fetch error:", e);
      }
    })();
  }, [chatId, username]);

  const handleDisconnected = (reason?: any) => {
    if (isLeaving.current) return;
    console.log("LiveKit Disconnected. Reason:", reason);
    
    // Only leave if it wasn't a temporary hiccup or if it's been long enough
    isLeaving.current = true;
    
    onLeave();
    apiFetch("/api/calls/end", {
      method: "POST",
      body: JSON.stringify({ chatId, callType }),
    }).catch(console.error);
  };

  const handleConnected = () => {
    setIsConnected(true);
    console.log("Connected to LiveKit room successfully");
  };

  if (token === "" || serverUrl === "") {
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
          serverUrl={serverUrl}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
          connectOptions={{
            autoSubscribe: true,
          }}
          data-lk-theme="default"
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </motion.div>
  );
}