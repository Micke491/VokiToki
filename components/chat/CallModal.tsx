import React, { useEffect, useRef, useState, useCallback } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize } from "lucide-react";
import { motion } from "framer-motion";

interface CallModalProps {
  roomUrl: string;
  onLeave: () => void;
  chatId: string;
}

export default function CallModal({ roomUrl, onLeave, chatId }: CallModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);

  useEffect(() => {
    if (!containerRef.current || callObject) return;

    const newCallObject = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "12px",
        backgroundColor: "#111827", 
      },
      showLeaveButton: false, 
    });

    setCallObject(newCallObject);

    newCallObject.join({ url: roomUrl }).catch((err) => {
      console.error("Error joining call:", err);
      alert("Failed to join call");
      onLeave();
    });

    const handleLeftMeeting = () => {
      onLeave();
      fetch("/api/calls/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ chatId }),
      }).catch(console.error);
    };

    newCallObject.on("left-meeting", handleLeftMeeting);

    return () => {
      if (newCallObject) {
        newCallObject.off("left-meeting", handleLeftMeeting);
        newCallObject.leave().then(() => {
          newCallObject.destroy();
        });
      }
    };
  }, [roomUrl, onLeave, chatId]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const handleLeave = useCallback(async () => {
    if (callObject) {
      await callObject.leave();
    }
  }, [callObject]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${
        isFullScreen ? "p-0" : ""
      }`}
    >
      <div 
        className={`relative w-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex flex-col ${
          isFullScreen ? "h-full rounded-none" : "max-w-5xl h-[80vh]"
        }`}
      >
        {/* Header Options */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={toggleFullScreen}
            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-md transition-colors"
          >
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>

        {/* Daily.co Iframe Container */}
        <div ref={containerRef} className="flex-1 w-full h-full" />
      </div>
    </motion.div>
  );
}
