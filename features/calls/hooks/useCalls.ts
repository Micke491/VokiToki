"use client";

import { useState, useEffect, useRef } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { apiFetch } from "@/lib/api";
import { showNotification, isNotificationsEnabled } from "@/lib/pushNotifications";

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

export function useCalls(currentUser: User | null) {
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
    if (!currentUser) return;

    const userChannel = pusherClient.subscribe(`user-${currentUser._id}`);

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

  const acceptCall = async () => {
    if (!incomingCall) return;
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
