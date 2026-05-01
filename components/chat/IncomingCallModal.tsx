import React, { useEffect } from "react";
import { Phone, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IncomingCallData } from "../../types/chat";

interface IncomingCallModalProps {
  callData: IncomingCallData;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({ callData, onAccept, onDecline }: IncomingCallModalProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDecline();
    }, 30000);
    return () => clearTimeout(timer);
  }, [onDecline]);

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    try {
      audio = new Audio('/ringtone.mp3'); 
      audio.loop = true;
      audio.play().catch(e => {
        if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
          console.warn('Ringtone could not be played (likely missing /ringtone.mp3)', e.message);
        }
      });
    } catch(e) {
      console.error('Audio initialization failed', e);
    }

    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] bg-chat-glass backdrop-blur-2xl rounded-2xl shadow-2xl border border-chat-border p-4 w-[90%] max-w-sm flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full overflow-hidden mb-3 bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center shadow-lg border-2 border-chat-bg-primary">
          {callData.callerAvatar ? (
            <img src={callData.callerAvatar} alt={callData.callerName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-white">
              {callData.callerName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-chat-text-primary mb-1 text-center">
          {callData.callerName}
        </h3>
        <p className="text-sm text-chat-text-secondary mb-6 text-center flex items-center justify-center gap-2">
          {callData.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          Incoming {callData.callType} call...
        </p>

        <div className="flex items-center justify-center gap-8 w-full">
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:bg-red-600 transition-colors">
              <Phone className="w-6 h-6 rotate-[135deg]" />
            </div>
            <span className="text-xs font-medium text-chat-text-secondary">Decline</span>
          </button>

          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2 group animate-bounce"
          >
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:bg-green-600 transition-colors">
              {callData.callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span className="text-xs font-medium text-chat-text-secondary">Accept</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
