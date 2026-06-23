"use client";

import { useState, useEffect, useRef } from "react";
import { wsClient } from "@/lib/ws-client";
import { apiFetch } from "@/lib/api";
import { showNotification, isNotificationsEnabled } from "@/lib/pushNotifications";
import toast from "react-hot-toast";

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

interface ActiveCall {
  callId: string;
  type: "voice" | "video";
  token: string;
  remoteUser: {
    username: string;
    avatar?: string;
    id?: string;
  };
  isIncoming: boolean;
}

export function useCalls(currentUser: User | null) {
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  
  const activeCallRef = useRef(activeCall);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!currentUser || !wsClient) return;

    const userChannel = wsClient?.subscribe(`user-${currentUser._id}`);
    if (!userChannel) return;

    const handleIncomingCall = (data: any) => {
      const callerId = data.caller_id?.toString();
      const myId = currentUser._id.toString();

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
        setActiveCall((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            token: prev.token || data.token,
          };
        });
        setPendingCallId(null);
      }
    };

    const handleCallRejected = (data: any) => {
      if (pendingCallId === data.call_id || activeCallRef.current?.callId === data.call_id) {
        setActiveCall(null);
        setPendingCallId(null);
      }
    };

    const handleCallEnded = (data: any) => {
      setIncomingCall((prev: any) => (prev?.call_id === data.call_id ? null : prev));
      setActiveCall((prev: any) => (prev?.callId === data.call_id ? null : prev));
    };

    userChannel.bind("incoming_call", handleIncomingCall);
    userChannel.bind("call_accepted", handleCallAccepted);
    userChannel.bind("call_rejected", handleCallRejected);
    userChannel.bind("call_ended", handleCallEnded);

    return () => {
      userChannel.unbind("incoming_call", handleIncomingCall);
      userChannel.unbind("call_accepted", handleCallAccepted);
      userChannel.unbind("call_rejected", handleCallRejected);
      userChannel.unbind("call_ended", handleCallEnded);
    };
  }, [currentUser, pendingCallId]);

  useEffect(() => {
    const handleStartCall = async (e: Event) => {
      if (activeCallRef.current || !currentUser) return;
      
      const { chatId, type, calleeId, callId: existingCallId, calleeName, calleeAvatar } = (e as CustomEvent).detail;
      
      if (!calleeId && !existingCallId && !chatId) {
        toast.error("Cannot determine who to call.");
        return;
      }

      const newCallId = existingCallId || [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      setActiveCall({
        callId: newCallId,
        type,
        token: "",
        remoteUser: {
          username: calleeName || "User",
          avatar: calleeAvatar,
          id: calleeId ? calleeId.toString() : undefined,
        },
        isIncoming: !!existingCallId,
      });

      try {
        if (existingCallId) {
          const res = await apiFetch("/api/call/accept", {
            method: "POST",
            body: JSON.stringify({ call_id: existingCallId, user_id: currentUser._id }),
          });
          
          if (res.ok) {
            const data = await res.json();
            setActiveCall((prev) => prev ? { ...prev, token: data.token } : null);
          } else {
            const err = await res.json();
            toast.error(err.error || "Could not join call.");
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
          
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              setActiveCall((prev) => prev ? { ...prev, token: data.token } : null);
            }
          } else {
            const err = await res.json();
            toast.error(err.error || "Could not start call.");
            setActiveCall(null);
            setPendingCallId(null);
          }
        }
      } catch (err) {
        setActiveCall(null);
        setPendingCallId(null);
      }
    };

    window.addEventListener("start-call", handleStartCall);
    return () => window.removeEventListener("start-call", handleStartCall);
  }, [currentUser]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (pendingCallId && activeCall) {
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

  const leaveCall = () => {
    if (activeCall) {
      apiFetch("/api/call/end", {
        method: "POST",
        body: JSON.stringify({ call_id: activeCall.callId, user_id: currentUser?._id }),
      }).catch(() => {});
    }
    setActiveCall(null);
    setPendingCallId(null);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    setActiveCall({
      callId: incomingCall.call_id,
      type: incomingCall.call_type,
      token: "",
      remoteUser: {
        username: incomingCall.caller_name,
        avatar: incomingCall.caller_avatar,
        id: incomingCall.caller_id,
      },
      isIncoming: true,
    });

    try {
      const res = await apiFetch("/api/call/accept", {
        method: "POST",
        body: JSON.stringify({ call_id: incomingCall.call_id, user_id: currentUser?._id }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCall((prev) => prev ? { ...prev, token: data.token } : null);
      } else {
        toast.error("Failed to accept call.");
        setActiveCall(null);
      }
    } catch (e) {
      console.error(e);
      setActiveCall(null);
    }
    setIncomingCall(null);
  };

  const declineCall = () => {
    if (!incomingCall) return;
    apiFetch("/api/call/reject", {
      method: "POST",
      body: JSON.stringify({ call_id: incomingCall.call_id, user_id: currentUser?._id }),
    }).catch(() => {});
    setIncomingCall(null);
  };

  const cancelCall = () => {
    if (pendingCallId) {
      apiFetch("/api/call/end", {
        method: "POST",
        body: JSON.stringify({ call_id: pendingCallId, user_id: currentUser?._id })
      }).catch(() => {});
    }
    setActiveCall(null);
    setPendingCallId(null);
  };

  return {
    incomingCall,
    activeCall,
    pendingCallId,
    acceptCall,
    declineCall,
    cancelCall,
    leaveCall,
  };
}
