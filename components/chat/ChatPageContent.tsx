"use client";

import { useState, useEffect } from "react";
import Pusher from "pusher-js";
import { useRouter } from "next/navigation";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import NewChatModal from "@/components/chat/NewChatModal";
import SideBar from "@/components/layout/Sidebar";
import CallModal from "@/components/chat/CallModal";
import IncomingCallModal from "@/components/chat/IncomingCallModal";

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface Chat {
  _id: string;
  name?: string;
  isGroupChat?: boolean;
  avatar?: string;
  participants: User[];
  groupAdmin?: string;
}

interface ChatPageContentProps {
  chatId?: string;
}

export default function ChatPageContent({ chatId }: ChatPageContentProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<{ chatId: string; type: "voice" | "video" } | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchChatDetails(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    const handleStartCall = async (e: Event) => {
      const { chatId, type } = (e as CustomEvent).detail;
      if (!currentUser) return;

      try {
        await fetch("/api/calls/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  useEffect(() => {
    if (!chatId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`chat-${chatId}`);

    channel.bind('chat-updated', (updatedChat: Chat) => {
      setSelectedChat(updatedChat);
    });

    return () => {
      pusher.unsubscribe(`chat-${chatId}`);
      pusher.disconnect();
    };
  }, [chatId]);

  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`user-${currentUser._id}`);

    channel.bind("call:incoming", (data: any) => {
      if (data.callerId !== currentUser._id) {
        setIncomingCall(data);
      }
    });

    channel.bind("call:ended", (data: any) => {
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
      pusher.unsubscribe(`user-${currentUser._id}`);
      pusher.disconnect();
    };
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const response = await fetch("/api/users/current_user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Not authenticated");

      const data = await response.json();
      setCurrentUser(data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchChatDetails = async (id: string) => {
    if (!id || id === "[chatId]") return;
    try {
      const response = await fetch(`/api/chat/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error("Chat not found in database");
          router.push("/chat");
        }
        throw new Error("Failed to fetch chat");
      }

      const data = await response.json();
      setSelectedChat(data);
    } catch (error) {
      console.error("Error fetching chat details:", error);
    }
  };

  const getChatMetadata = () => {
    if (!selectedChat || !currentUser) return { name: '', avatar: undefined, isGroup: false };

    if (selectedChat.isGroupChat) {
      return {
        name: selectedChat.name || 'Group Chat',
        avatar: selectedChat.avatar,
        isGroup: true
      };
    }

    const otherMember = selectedChat.participants.find((p) => p._id !== currentUser._id);
    return {
      name: otherMember?.username || 'Unknown User',
      avatar: otherMember?.avatar,
      isGroup: false
    };
  };

  const chatMetadata = getChatMetadata();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen-safe bg-background text-chat-text-secondary gap-4 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="ambient-glow">
          <div className="ambient-glow-inner" />
        </div>
        <div className="w-12 h-12 border-4 border-chat-border border-t-chat-accent rounded-full animate-spin relative z-10" />
        <p className="text-chat-text-secondary font-medium animate-pulse relative z-10">
          Loading your messages...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen-safe bg-background text-chat-text-primary overflow-hidden relative">
      {/* Signature Ambient Gradient */}
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      {/* 1. Global Navigation Sidebar */}
      <div className={`${chatId ? "hidden md:block" : "block"} relative z-10`}>
        <SideBar
          currentUser={currentUser || undefined}
          isMobileDrawerOpen={showSidebarDrawer}
          onCloseMobileDrawer={() => setShowSidebarDrawer(false)}
          isHidden={!!activeCall}
        />
      </div>

      <main className="flex flex-1 overflow-hidden relative z-10">
        {/* 2. Conversations List Panel */}
        <div
          className={`
          relative flex-shrink-0 border-r border-chat-border bg-chat-glass backdrop-blur-md
          transition-all duration-300 ease-in-out
          w-full md:w-[320px] lg:w-[360px]
          ${chatId ? "hidden md:block" : "block"}
        `}
        >
          <ChatList
            currentUserId={currentUser?._id}
            selectedChatId={chatId}
            onChatSelect={(id) => router.push(`/chat/${id}`)}
            onNewChat={() => setShowNewChatModal(true)}
            onMenuClick={() => setShowSidebarDrawer(true)}
          />
        </div>

        {/* 3. Chat Window Panel */}
        <div
          className={`
          flex-1 flex flex-col min-w-0 bg-transparent
          ${!chatId ? "hidden md:flex" : "flex"}
        `}
        >
          {chatId && currentUser ? (
            <ChatWindow
              chatId={chatId}
              currentUserId={currentUser._id}
              currentUserUsername={currentUser.username}
              recipientUsername={chatMetadata.name}
              recipientAvatar={chatMetadata.avatar}
              isGroup={chatMetadata.isGroup}
              groupAdminId={selectedChat?.groupAdmin}
              participants={selectedChat?.participants}
            />
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-chat-accent/10 blur-3xl rounded-full" />
                <svg
                  className="relative w-32 h-32 text-chat-border"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M60 35c-15 0-27 10-27 22 0 4.5 1.5 8.7 4 12.2V83l12.8-6.4c2.4.6 4.8 1 7.2 1 15 0 27-10 27-22S75 35 60 35z"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="currentColor"
                    fillOpacity="0.05"
                  />
                  <path
                    d="M45 52h30M45 62h15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-chat-text-primary mb-2">
                Select a conversation
              </h2>
              <p className="text-chat-text-secondary max-w-sm mb-8">
                Choose an existing chat from the list or start a fresh
                conversation with someone new.
              </p>

              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-6 py-3 bg-chat-accent text-white rounded-xl font-semibold hover:bg-chat-accent-hover transition-all active:scale-95 shadow-lg shadow-chat-accent/20"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 4. Modals */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
      />

      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={() => {
            setActiveCall({ chatId: incomingCall.chatId, type: incomingCall.callType });
            setIncomingCall(null);
          }}
          onDecline={() => setIncomingCall(null)}
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
    </div>
  );
}
