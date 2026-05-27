"use client";

import { useEffect, useState, useRef } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { apiFetch } from "@/lib/api";
import { showNotification, isNotificationsEnabled, registerServiceWorker } from "@/lib/pushNotifications";
import { usePathname } from "next/navigation";
import IncomingCallModal from "@/features/calls/components/IncomingCallModal";
import CallModal from "@/features/calls/components/CallModal";
import { useCalls } from "@/features/calls/hooks/useCalls";
import { getAuthToken } from "@/lib/storage";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

export default function NotificationListener({ currentUser: propUser }: { currentUser?: User | null }) {
  const [internalUser, setInternalUser] = useState<User | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const fetchUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setInternalUser(null);
        return;
      }
      const response = await apiFetch(`/api/users/current_user`);
      if (response.ok) {
        const data = await response.json();
        setInternalUser(data.user);
      } else {
        setInternalUser(null);
      }
    } catch (error) {
      setInternalUser(null);
    }
  };

  useEffect(() => {
    if (propUser === undefined) {
      fetchUser();
      
      window.addEventListener("storage", fetchUser);
      window.addEventListener("auth-update", fetchUser);
      
      return () => {
        window.removeEventListener("storage", fetchUser);
        window.removeEventListener("auth-update", fetchUser);
      };
    }
  }, [propUser]);

  useEffect(() => {
    if (propUser === undefined && !internalUser) {
      fetchUser();
    }
  }, [pathname, propUser, internalUser]);

  const currentUser = propUser !== undefined ? propUser : internalUser;

  const {
    incomingCall,
    activeCall,
    pendingCallId,
    acceptCall,
    declineCall,
    cancelCall,
    leaveCall,
  } = useCalls(currentUser);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    registerServiceWorker();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userChannel = pusherClient.subscribe(`user-${currentUser._id}`);

    const handleChatUpdate = (data: any) => {
      const { chatId, lastMessage } = data;
      
      if (isNotificationsEnabled() && lastMessage) {
        const senderId = lastMessage.sender?._id?.toString() || lastMessage.sender?.toString();
        const currentUserId = currentUser._id.toString();

        if (senderId === currentUserId) return;

        const currentPath = pathnameRef.current;
        const currentChatId = currentPath.startsWith('/chat/') ? currentPath.split('/')[2] : null;
        const isCurrentChat = currentChatId === chatId;
        const isVisible = document.visibilityState === 'visible';

        if (!isVisible || !isCurrentChat) {
          const senderName = lastMessage.sender?.username || 'Someone';
          const bodyText = lastMessage.text
            ? lastMessage.text.substring(0, 100)
            : lastMessage.mediaType === 'image' ? 'Photo'
            : lastMessage.mediaType === 'video' ? 'Video'
            : lastMessage.mediaType === 'audio' ? 'Voice message'
            : 'New message';

          showNotification({
            title: senderName,
            body: bodyText,
            chatId: chatId,
            type: 'message',
            senderName,
            icon: lastMessage.sender?.avatar,
          });
        }
      }
    };

    userChannel.bind("chat-update", handleChatUpdate);

    return () => {
      userChannel.unbind("chat-update", handleChatUpdate);
    };
  }, [currentUser]);

  return (
    <>
      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {activeCall && currentUser && activeCall.token && (
        <CallModal
          roomName={activeCall.callId}
          token={activeCall.token}
          callType={activeCall.type}
          username={activeCall.username}
          onLeave={leaveCall}
        />
      )}
      
      {activeCall && !activeCall.token && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-chat-bg-primary rounded-3xl p-6 shadow-2xl flex flex-col items-center border border-chat-border"
          >
            <div className="relative mb-6 mt-4">
              <div className="absolute inset-0 bg-chat-accent rounded-full animate-ping opacity-20" />
              <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-chat-bg-secondary relative z-10 shadow-lg text-chat-accent text-3xl font-bold uppercase bg-chat-bg-secondary">
                {activeCall.type === 'video' ? <Video className="w-10 h-10 animate-pulse" /> : <Phone className="w-10 h-10 animate-pulse" />}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-chat-text-primary mb-1 text-center">
              Calling...
            </h2>
            <p className="text-chat-text-secondary mb-8 text-sm flex items-center gap-2">
              Waiting for answer
            </p>
            <button 
              onClick={cancelCall}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-md">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-chat-text-secondary group-hover:text-red-500 transition-colors">
                Cancel
              </span>
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
