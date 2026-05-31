"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { pusherClient } from "@/lib/pusher-client";
import { showNotification, isNotificationsEnabled, registerServiceWorker } from "@/lib/pushNotifications";
import { usePathname } from "next/navigation";
import IncomingCallModal from "@/features/calls/components/IncomingCallModal";
import CallModal from "@/features/calls/components/CallModal";
import { useCalls } from "@/features/calls/hooks/useCalls";
import { getAuthToken } from "@/lib/storage";

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
    acceptCall,
    declineCall,
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

      {activeCall && currentUser && (
        <CallModal
          roomName={activeCall.callId}
          token={activeCall.token}
          callType={activeCall.type}
          remoteUser={activeCall.remoteUser}
          currentUser={currentUser}
          onLeave={leaveCall}
        />
      )}
    </>
  );
}