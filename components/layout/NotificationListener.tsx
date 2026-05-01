"use client";

import { useEffect, useState, useRef } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { getAuthToken } from "@/lib/storage";
import { showNotification, isNotificationsEnabled, registerServiceWorker } from "@/lib/pushNotifications";
import { usePathname } from "next/navigation";
import IncomingCallModal from "@/components/chat/IncomingCallModal";
import CallModal from "@/components/chat/CallModal";

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

export default function NotificationListener() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<{ chatId: string; type: "voice" | "video" } | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    fetchCurrentUser();
    registerServiceWorker();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch("/api/users/current_user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching user for notifications:", error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const userChannel = pusherClient.subscribe(`user-${currentUser._id}`);

    // Global Message Notifications
    userChannel.bind("chat-update", (data: any) => {
      const { chatId, lastMessage, unreadCount } = data;
      
      if (isNotificationsEnabled()) {
        const senderId = lastMessage.sender?._id?.toString() || lastMessage.sender?.toString();
        const currentUserId = currentUser._id.toString();

        // Don't notify if message is from me
        if (senderId === currentUserId) return;

        const currentPath = pathnameRef.current;
        const currentChatId = currentPath.startsWith('/chat/') ? currentPath.split('/')[2] : null;
        const isCurrentChat = currentChatId === chatId;
        const isVisible = document.visibilityState === 'visible';

        // Notify if not in this chat OR window is hidden
        if (!isVisible || !isCurrentChat) {
          const senderName = lastMessage.sender?.username || 'Someone';
          const bodyText = lastMessage.text
            ? lastMessage.text.substring(0, 100)
            : lastMessage.mediaType === 'image' ? '📷 Photo'
            : lastMessage.mediaType === 'video' ? '🎥 Video'
            : lastMessage.mediaType === 'audio' ? '🎤 Voice message'
            : 'New message';

          showNotification({
            title: senderName,
            body: bodyText,
            chatId: chatId,
            type: 'message',
            senderName,
          });
        }
      }
    });

    // Global Call Notifications
    userChannel.bind("call:incoming", (data: any) => {
      if (data.callerId !== currentUser._id) {
        setIncomingCall(data);

        if (isNotificationsEnabled()) {
          const callerName = data.callerName || 'Someone';
          const callType = data.callType === 'video' ? 'Video' : 'Voice';
          
          showNotification({
            title: `${callType} Call`,
            body: `${callerName} is calling you...`,
            chatId: data.chatId,
            type: 'call',
          });
        }
      }
    });

    userChannel.bind("call:ended", (data: any) => {
      setIncomingCall((prev: any) => {
        if (prev?.chatId === data.chatId) return null;
        return prev;
      });
      setActiveCall((prev: any) => {
        if (prev?.chatId === data.chatId) return null;
        return prev;
      });
    });

    return () => {
      pusherClient.unsubscribe(`user-${currentUser._id}`);
    };
  }, [currentUser]);

  useEffect(() => {
    const handleStartCall = async (e: Event) => {
      const { chatId, type } = (e as CustomEvent).detail;
      if (!currentUser) return;

      try {
        await fetch("/api/calls/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            chatId,
            callType: type,
            callerName: currentUser.username,
            callerAvatar: currentUser.avatar,
          }),
        });
        setActiveCall({ chatId, type });
      } catch (err) {
        console.error("Failed to initiate call:", err);
      }
    };
    window.addEventListener("start-call", handleStartCall);
    return () => window.removeEventListener("start-call", handleStartCall);
  }, [currentUser]);

  return (
    <>
      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={() => {
            setActiveCall({ chatId: incomingCall.chatId, type: incomingCall.callType });
            setIncomingCall(null);
          }}
          onDecline={() => {
            fetch("/api/calls/end", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`,
              },
              body: JSON.stringify({ chatId: incomingCall.chatId, callType: incomingCall.callType }),
            }).catch(console.error);
            setIncomingCall(null);
          }}
        />
      )}

      {activeCall && currentUser && (
        <CallModal
          chatId={activeCall.chatId}
          callType={activeCall.type}
          username={currentUser.username}
          onLeave={() => setActiveCall(null)}
        />
      )}
    </>
  );
}
