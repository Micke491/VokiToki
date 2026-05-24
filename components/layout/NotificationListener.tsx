"use client";

import { useEffect, useState, useRef } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { apiFetch } from "@/lib/api";
import { showNotification, isNotificationsEnabled, registerServiceWorker } from "@/lib/pushNotifications";
import { usePathname } from "next/navigation";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import CallModal from "@/components/calls/CallModal";
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

  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<{ 
    callId: string; 
    type: "voice" | "video";
    token: string;
    username: string;
  } | null>(null);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  
  const activeCallRef = useRef(activeCall);

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
      
      const { chatId, type, calleeId, callId: existingCallId } = (e as CustomEvent).detail;
      
      if (!calleeId && !existingCallId && !chatId) {
        alert("Cannot determine who to call.");
        return;
      }

      const newCallId = existingCallId || [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      setActiveCall({
        callId: newCallId,
        type,
        token: "",
        username: "...",
      });

      try {
        if (existingCallId) {
          const res = await apiFetch("/api/call/accept", {
            method: "POST",
            body: JSON.stringify({ call_id: existingCallId, user_id: currentUser._id }),
          });
          
          if (res.ok) {
            const data = await res.json();
            setActiveCall({
              callId: existingCallId,
              type,
              token: data.token,
              username: "Active Call",
            });
          } else {
            const err = await res.json();
            alert(err.error || "Could not join call.");
            setActiveCall(null);
          }
        } else {
          setPendingCallId(newCallId);
          const res = await apiFetch("/api/call/initiate", {
            method: "POST",
            body: JSON.stringify({
              call_id: newCallId,
              caller_id: currentUser._id,
              callee_id: calleeId || "",
              call_type: type,
              caller_name: currentUser.username,
              caller_avatar: currentUser.avatar,
              chat_id: chatId,
            }),
          });
          
          if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Could not start call.");
            setActiveCall(null);
            setPendingCallId(null);
          }
        }
      } catch (err) {
        setActiveCall(null);
      }
    };

    window.addEventListener("start-call", handleStartCall);
    return () => window.removeEventListener("start-call", handleStartCall);
  }, [currentUser]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (pendingCallId && activeCall && !activeCall.token) {
      timeout = setTimeout(() => {
        apiFetch("/api/call/end", {
          method: "POST",
          body: JSON.stringify({ call_id: pendingCallId, user_id: currentUser?._id })
        }).catch(() => {});
        setActiveCall(null);
        setPendingCallId(null);
      }, 30000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [pendingCallId, activeCall, currentUser]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (incomingCall) {
      timeout = setTimeout(() => {
        apiFetch("/api/call/reject", {
          method: "POST",
          body: JSON.stringify({ call_id: incomingCall.call_id, user_id: currentUser?._id })
        }).catch(() => {});
        setIncomingCall(null);
      }, 30000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [incomingCall, currentUser]);

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