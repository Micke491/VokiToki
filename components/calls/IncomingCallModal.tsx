"use client";

import React from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallModalProps {
  callData: {
    call_id: string;
    caller_id: string;
    call_type: "voice" | "video";
    caller_name: string;
    caller_avatar?: string;
    chat_id: string;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({ callData, onAccept, onDecline }: IncomingCallModalProps) {
  const isVideo = callData.call_type === "video";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-chat-bg-primary rounded-3xl p-6 shadow-2xl flex flex-col items-center border border-chat-border"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-chat-accent rounded-full animate-ping opacity-20" />
          {callData.caller_avatar ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-chat-bg-secondary relative z-10 shadow-lg">
              <img
                src={callData.caller_avatar}
                alt={callData.caller_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-chat-accent/20 flex items-center justify-center border-4 border-chat-bg-secondary relative z-10 shadow-lg text-chat-accent text-3xl font-bold uppercase">
              {callData.caller_name.charAt(0)}
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-chat-text-primary mb-1 text-center">
          {callData.caller_name}
        </h2>
        <p className="text-chat-text-secondary mb-8 text-sm flex items-center gap-2">
          {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          Incoming {isVideo ? "Video" : "Voice"} Call...
        </p>

        <div className="flex items-center gap-8 w-full justify-center">
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-md">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-chat-text-secondary group-hover:text-red-500 transition-colors">
              Decline
            </span>
          </button>

          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-md animate-pulse group-hover:animate-none">
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span className="text-xs font-medium text-chat-text-secondary group-hover:text-green-500 transition-colors">
              Accept
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}