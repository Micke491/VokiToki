"use client";

import { useEffect, useState, useRef } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { apiFetch } from "@/lib/api";
import { showNotification, isNotificationsEnabled, registerServiceWorker } from "@/lib/pushNotifications";
import { usePathname } from "next/navigation";
import IncomingCallModal from "@/components/chat/IncomingCallModal";
import CallModal from "@/components/chat/CallModal";

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

export default function NotificationListener({ currentUser: propUser }: { currentUser?: User | null }) {
  const [internalUser, setInternalUser] = useState<User | null>(null);
  
  useEffect(() => {
    if (propUser === undefined) {
      const fetchUser = async () => {
        try {
          const response = await apiFetch(`/api/users/current_user`);
          if (response.ok) {
            const data = await response.json();
            setInternalUser(data.user);
          }
        } catch (error) {}
      };
      fetchUser();
    }
  }, [propUser]);

  const currentUser = propUser !== undefined ? propUser : internalUser;

  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<{ 
    callId: string; 
    type: "voice" | "video";
    token: string;
    username: string;
  } | null>(null);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  
  const activeCallRef = useRef(activeCall);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

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

    const handleIncomingCall = (data: any) => {
      const callerId = data.caller_id?.toString();
      const myId = currentUser._id?.toString();

      if (callerId && myId && callerId !== myId) {
        setIncomingCall(data);

        if (isNotificationsEnabled()) {
          const callerName = data.caller_name || 'Someone';
          const callType = data.call_type === 'video' ? 'Video' : 'Voice';
          
          showNotification({
            title: `${callType} Call`,
            body: `${callerName} is calling you...`,
            chatId: data.chat_id,
            type: 'call',
            icon: data.caller_avatar,
          });
        }
      }
    };

    const handleCallAccepted = (data: any) => {
      // The caller receives this when the callee accepts the call
      if (pendingCallId === data.call_id) {
        setActiveCall((prev) => ({
          ...prev!,
          callId: data.call_id,
          token: data.token,
        }));
        setPendingCallId(null);
      }
    };

    const handleCallRejected = (data: any) => {
      if (pendingCallId === data.call_id || activeCallRef.current?.callId === data.call_id) {
        setActiveCall(null);
        setPendingCallId(null);
        alert("Call was declined.");
      }
    };

    const handleCallEnded = (data: any) => {
      setIncomingCall((prev: any) => (prev?.call_id === data.call_id ? null : prev));
      setActiveCall((prev: any) => (prev?.callId === data.call_id ? null : prev));
    };

    userChannel.bind("chat-update", handleChatUpdate);
    userChannel.bind("incoming_call", handleIncomingCall);
    userChannel.bind("call_accepted", handleCallAccepted);
    userChannel.bind("call_rejected", handleCallRejected);
    userChannel.bind("call_ended", handleCallEnded);

    return () => {
      userChannel.unbind("chat-update", handleChatUpdate);
      userChannel.unbind("incoming_call", handleIncomingCall);
      userChannel.unbind("call_accepted", handleCallAccepted);
      userChannel.unbind("call_rejected", handleCallRejected);
      userChannel.unbind("call_ended", handleCallEnded);
    };
  }, [currentUser, pendingCallId]);

  useEffect(() => {
    const handleStartCall = async (e: Event) => {
      if (activeCallRef.current || !currentUser) return;
      
      const { chatId, type, calleeId } = (e as CustomEvent).detail;
      
      if (!calleeId) {
        alert("Cannot determine who to call.");
        return;
      }

      setActiveCall({
        callId: "",
        type,
        token: "",
        username: "...",
      });

      try {
        const res = await apiFetch("/api/call/initiate", {
          method: "POST",
          body: JSON.stringify({
            caller_id: currentUser._id,
            callee_id: calleeId,
            call_type: type,
            caller_name: currentUser.username,
            caller_avatar: currentUser.avatar,
            chat_id: chatId,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setPendingCallId(data.call_id);
          // Wait for call_accepted pusher event to get the token
        } else {
          const err = await res.json();
          alert(err.error || "Could not start call.");
          setActiveCall(null);
        }
      } catch (err) {
        setActiveCall(null);
      }
    };

    window.addEventListener("start-call", handleStartCall);
    return () => window.removeEventListener("start-call", handleStartCall);
  }, [currentUser]);

  const leaveCall = () => {
    if (activeCall) {
      apiFetch("/api/call/end", {
        method: "POST",
        body: JSON.stringify({ call_id: activeCall.callId, user_id: currentUser?._id }),
      }).catch(() => {});
    }
    setActiveCall(null);
  };

  return (
    <>
      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={async () => {
            try {
              const res = await apiFetch("/api/call/accept", {
                method: "POST",
                body: JSON.stringify({ call_id: incomingCall.call_id, user_id: currentUser?._id }),
              });
              if (res.ok) {
                const data = await res.json();
                setActiveCall({
                  callId: incomingCall.call_id,
                  type: incomingCall.call_type,
                  token: data.token,
                  username: incomingCall.caller_name,
                });
              } else {
                alert("Failed to accept call.");
              }
            } catch (e) {
              console.error(e);
            }
            setIncomingCall(null);
          }}
          onDecline={() => {
            apiFetch("/api/call/reject", {
              method: "POST",
              body: JSON.stringify({ call_id: incomingCall.call_id, user_id: currentUser?._id }),
            }).catch(() => {});
            setIncomingCall(null);
          }}
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
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center text-white backdrop-blur-md">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-chat-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xl font-medium animate-pulse">Calling...</p>
            <button 
              onClick={() => {
                if (pendingCallId) {
                  apiFetch("/api/call/end", {
                    method: "POST",
                    body: JSON.stringify({ call_id: pendingCallId, user_id: currentUser?._id })
                  });
                }
                setActiveCall(null);
                setPendingCallId(null);
              }}
              className="mt-8 px-6 py-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}