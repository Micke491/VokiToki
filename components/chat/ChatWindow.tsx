"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { EmojiClickData } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Message, ChatWindowProps } from "../../types/chat";
import ChatHeader from "./ChatHeader";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import ChatSidebar from "./ChatSidebar";
import ForwardMessageModal from "./ForwardMessageModal";
import ReadReceiptModal from "./ReadReceiptModal";

export default function ChatWindow({
  chatId,
  currentUserId,
  currentUserUsername,
  recipientUsername,
  recipientAvatar,
  isGroup,
  groupAdminId,
  participants,
  onClose,
}: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [unreadCountBelow, setUnreadCountBelow] = useState(0);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [viewingReceiptsFor, setViewingReceiptsFor] = useState<Message | null>(null);
  const prevScrollHeightRef = useRef<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem(`chat-wallpaper-${chatId}`);
    setWallpaper(saved || null);
  }, [chatId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let isMounted = true;
    let socketInstance: Socket | null = null;

    const initSocket = async () => {
      try {
        await fetch("/api/socket/io");
      } catch (e) {
        console.error("Socket init fetch failed", e);
      }

      if (!isMounted) return;

      socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "", {
        path: "/api/socket/server",
        auth: { token },
        addTrailingSlash: false,
      });

      socketInstance.on("connect", () => {
        socketInstance?.emit("join-chat", chatId);
      });

      if (socketInstance.connected) {
        socketInstance.emit("join-chat", chatId);
      }

      socketInstance.on("receive-message", (message: Message) => {
        if (message.chatId !== chatId) return;
        
        setMessages((prev) => {
          const exists = prev.some(
            (m) => String(m._id) === String(message._id),
          );
          if (exists) return prev;

          if (message.sender._id !== currentUserId) {
            socketInstance?.emit("mark-messages-read", {
              chatId,
              messageIds: [message._id],
            });
          }

          return [...prev, message];
        });
        if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } =
            messagesContainerRef.current;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
          if (isNearBottom) {
            setTimeout(scrollToBottom, 100);
          } else {
            setUnreadCountBelow((prev) => prev + 1);
          }
        }
      });

      socketInstance.on("message-updated", (updatedMessage: Message) => {
        setMessages((prev) =>
          prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)),
        );
      });

      socketInstance.on("message-deleted", (data: { messageId: string }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === data.messageId) {
              return {
                ...m,
                isDeletedForEveryone: true,
                text: "This message was deleted",
                mediaUrl: undefined,
                mediaType: undefined,
              };
            }
            return m;
          }),
        );
      });

      socketInstance.on(
        "messages-read",
        (data: { messageIds: string[]; userId: string }) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (data.messageIds.includes(m._id)) {
                return { 
                  ...m, 
                  status: "seen",
                  readBy: [
                    ...(m.readBy?.filter(r => r.userId !== data.userId) || []),
                    { userId: data.userId, readAt: new Date().toISOString() }
                  ]
                };
              }
              return m;
            }),
          );
        },
      );

      socketInstance.on(
        "user-typing",
        (data: { username: string; userId: string }) => {
          if (data.userId !== currentUserId) {
            setTypingUsers((prev) => {
              if (!prev.includes(data.username)) {
                return [...prev, data.username];
              }
              return prev;
            });
          }
        },
      );

      socketInstance.on(
        "user-stopped-typing",
        (data: { username: string; userId: string }) => {
          setTypingUsers((prev) =>
            prev.filter((username) => username !== data.username),
          );
        },
      );

      socketInstance.on(
        "message-reaction-added",
        (data: {
          chatId: string;
          messageId: string;
          reaction: {
            userId: string;
            emoji: string;
            createdAt: string;
            user?: { username: string; avatar?: string };
          };
        }) => {
          if (data.chatId !== chatId) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m._id === data.messageId) {
                const reactions = m.reactions || [];
                if (
                  reactions.some(
                    (r) =>
                      r.userId === data.reaction.userId &&
                      r.emoji === data.reaction.emoji,
                  )
                ) {
                  return m;
                }
                return { ...m, reactions: [...reactions, data.reaction] };
              }
              return m;
            }),
          );
        },
      );

      socketInstance.on(
        "message-reaction-removed",
        (data: {
          chatId: string;
          messageId: string;
          userId: string;
          emoji: string;
        }) => {
          if (data.chatId !== chatId) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m._id === data.messageId) {
                return {
                  ...m,
                  reactions: (m.reactions || []).filter(
                    (r) =>
                      !(r.userId === data.userId && r.emoji === data.emoji),
                  ),
                };
              }
              return m;
            }),
          );
        },
      );

      socketInstance.on("message-pinned", (pinnedMessage: Message) => {
        setPinnedMessages((prev) => {
          if (prev.some(m => m._id === pinnedMessage._id)) return prev;
          return [pinnedMessage, ...prev];
        });
        setMessages((prev) => prev.map(m => m._id === pinnedMessage._id ? { ...m, isPinned: true } : m));
      });

      socketInstance.on("message-unpinned", (data: { messageId: string }) => {
        setPinnedMessages((prev) => prev.filter(m => m._id !== data.messageId));
        setMessages((prev) => prev.map(m => m._id === data.messageId ? { ...m, isPinned: false } : m));
      });

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [chatId, currentUserId]);

  useEffect(() => {
    setNewMessage("");
    setForwardingMessage(null);
    setViewingReceiptsFor(null);
    setReplyingTo(null);
    setEditingMessage(null);
    fetchMessages();
  }, [chatId]);

  const hasScrolledInitially = useRef(false);

  useLayoutEffect(() => {
    hasScrolledInitially.current = false;
  }, [chatId]);

  useLayoutEffect(() => {
    if (!loading && messages.length > 0 && !hasScrolledInitially.current) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
        hasScrolledInitially.current = true;
      }
    }
  }, [loading]);

  useLayoutEffect(() => {
    if (prevScrollHeightRef.current > 0 && messagesContainerRef.current) {
      const scrollDiff = messagesContainerRef.current.scrollHeight - prevScrollHeightRef.current;
      messagesContainerRef.current.scrollTop = scrollDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  const fetchMessages = async (beforeDate?: string) => {
    try {
      if (!beforeDate) {
        setLoading(true);
        setMessages([]);
        setPinnedMessages([]);
      } else {
        setLoadingMore(true);
      }

      const url = new URL("/api/chat/message", window.location.href);
      url.searchParams.append("chatId", chatId);
      url.searchParams.append("t", Date.now().toString()); // Cache buster
      if (beforeDate) url.searchParams.append("before", beforeDate);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        cache: 'no-store'
      });

      if (beforeDate && messagesContainerRef.current) {
        prevScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
      }
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();

      const newMessages = data.messages || [];

      if (!beforeDate) {
        const firstUnread = newMessages.find(
          (m: Message) => m.sender._id !== currentUserId && !m.readBy?.some((r: any) => r.userId === currentUserId)
        );
        if (firstUnread) {
          setFirstUnreadId(firstUnread._id);
        }
      }

      if (beforeDate) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
        
        // Also fetch pinned messages
        fetch(`/api/chat/${chatId}/pinned`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setPinnedMessages(data);
        })
        .catch(err => console.error("Failed to fetch pinned messages", err));
      }

      setHasMore(data.hasMore);
    } catch (error) {
      console.error("ChatWindow Error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldestMessage = messages[0];
    fetchMessages(oldestMessage.createdAt);
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      if (scrollTop < 50 && hasMore && !loadingMore) {
        loadMore();
      }
      
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBadge(!isNearBottom);
      if (isNearBottom) {
        setUnreadCountBelow(0);
      }
    }
  };

  const markAllAsRead = useCallback(() => {
    if (!socket || !currentUserId || messages.length === 0) return;

    const unreadMessageIds = messages
      .filter((m) => m.sender._id !== currentUserId && !m.readBy?.some(r => r.userId === currentUserId))
      .map((m) => m._id);

    if (unreadMessageIds.length > 0) {
      socket.emit("mark-messages-read", {
        chatId,
        messageIds: unreadMessageIds,
      });

      setMessages((prev) =>
        prev.map((m) =>
          unreadMessageIds.includes(m._id) ? { 
            ...m, 
            status: "seen", 
            read: true,
            readBy: [
              ...(m.readBy?.filter(r => r.userId !== currentUserId) || []),
              { userId: currentUserId, readAt: new Date().toISOString() }
            ]
          } : m
        )
      );
    }
  }, [socket, currentUserId, messages, chatId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      markAllAsRead();
    }
  }, [loading, chatId, messages.length, markAllAsRead]);

  const scrollToBottom = (force: boolean | React.SyntheticEvent = false) => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      const shouldForce = force === true;

      if (shouldForce || isNearBottom) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await sendAudioMessage(audioBlob);
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "voice_message.webm");

    try {
      const response = await fetch("/api/chat/media/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      if (socket) {
        socket.emit("send-new-message", {
          chatId,
          mediaUrl: data.url,
          mediaType: "audio",
          mediaPublicId: data.publicId,
          replyTo: replyingTo?._id,
        });
        setReplyingTo(null);
        scrollToBottom(true);
      }
    } catch (error) {
      console.error("Audio upload error:", error);
      alert("Failed to send voice message.");
    } finally {
      setUploading(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !socket) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    if (isTypingRef.current) {
      socket.emit("user-stopped-typing", {
        chatId,
        username: currentUserUsername || "Someone",
      });
      isTypingRef.current = false;
    }

    try {
      if (editingMessage) {
        socket.emit("edit-message", {
          chatId,
          messageId: editingMessage._id,
          newText: messageText,
        });
        setEditingMessage(null);
      } else {
        socket.emit("send-new-message", {
          chatId,
          text: messageText,
          replyTo: replyingTo?._id,
        });
        setReplyingTo(null);
        scrollToBottom(true);
        markAllAsRead();
      }
    } catch (error) {
      setNewMessage(messageText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/chat/media/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      if (socket) {
        socket.emit("send-new-message", {
          chatId,
          mediaUrl: data.url,
          mediaType: data.mediaType,
          mediaPublicId: data.publicId,
          replyTo: replyingTo?._id,
        });
        setReplyingTo(null);
        scrollToBottom(true);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
    if (e.key === "Escape") {
      setReplyingTo(null);
      setEditingMessage(null);
      setNewMessage("");
    }
  };

  const handleDelete = (messageId: string) => {
    if (!socket || !confirm("Delete this message for everyone?")) return;
    socket.emit("delete-message", { chatId, messageId });
  };

  const startEdit = (message: Message) => {
    setEditingMessage(message);
    setReplyingTo(null);
    setNewMessage(message.text);
    inputRef.current?.focus();
  };

  const startReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleReaction = (emojiData: EmojiClickData, messageId: string) => {
    if (!socket) return;
    socket.emit("add-reaction", {
      chatId,
      messageId,
      emoji: emojiData.emoji,
    });
    setShowEmojiPicker(null);
  };

  const removeReaction = (messageId: string, emoji: string) => {
    if (!socket) return;
    socket.emit("remove-reaction", {
      chatId,
      messageId,
      emoji,
    });
  };

  const handleMessageChange = (val: string) => {
    setNewMessage(val);

    if (socket && val.trim() && !editingMessage) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      if (!isTypingRef.current) {
        socket.emit("user-typing", {
          chatId,
          username: currentUserUsername || "Someone",
        });
        isTypingRef.current = true;
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socket) {
          socket.emit("user-stopped-typing", {
            chatId,
            username: currentUserUsername || "Someone",
          });
          isTypingRef.current = false;
        }
      }, 2000);
    }
  };

  useEffect(() => {
    const handleForwardMessage = (e: Event) => {
       const detail = (e as CustomEvent).detail;
       if (detail) setForwardingMessage(detail);
    };
    const handleViewReceipts = (e: Event) => {
       const detail = (e as CustomEvent).detail;
       if (detail) setViewingReceiptsFor(detail);
    };
    window.addEventListener('forward-message', handleForwardMessage);
    window.addEventListener('view-receipts', handleViewReceipts);
    return () => {
        window.removeEventListener('forward-message', handleForwardMessage);
        window.removeEventListener('view-receipts', handleViewReceipts);
    };
  }, []);

  const handleForwardSelection = async (targetChatIds: string[]) => {
      if (!socket || !forwardingMessage || targetChatIds.length === 0) return;
      
      for (const targetChatId of targetChatIds) {
          socket.emit("send-new-message", {
              chatId: targetChatId,
              text: forwardingMessage.text ? `[Forwarded]\n${forwardingMessage.text}` : undefined,
              mediaUrl: forwardingMessage.mediaUrl,
              mediaType: forwardingMessage.mediaType,
              mediaPublicId: forwardingMessage.mediaPublicId,
              isForwarded: true
          });
      }
      setForwardingMessage(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <div className="w-10 h-10 mb-4 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading messages...</p>
      </div>
    );
  }
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      
      {forwardingMessage && (
        <ForwardMessageModal
          currentUserId={currentUserId}
          currentChatId={chatId}
          onForward={handleForwardSelection}
          onClose={() => setForwardingMessage(null)}
        />
      )}

      {viewingReceiptsFor && (
        <ReadReceiptModal
          message={viewingReceiptsFor}
          currentUserId={currentUserId}
          onClose={() => setViewingReceiptsFor(null)}
        />
      )}

      <ChatHeader
        recipientUsername={recipientUsername}
        recipientAvatar={recipientAvatar}
        isGroup={isGroup}
        onClose={() => (onClose ? onClose() : router.push("/chat"))}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          {wallpaper && (
              <div 
                className="absolute inset-0 pointer-events-none z-0" 
                style={{ 
                  backgroundImage: `url(${wallpaper})`, 
                  backgroundSize: "cover", 
                  backgroundPosition: "center",
                  opacity: 0.4 
                }}
              />
          )}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6 relative z-10 custom-scrollbar"
          >
        
        {pinnedMessages.length > 0 && (
          <div className="sticky top-0 z-30 mb-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden text-sm">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-950">
              <span className="flex-1">Pinned Messages ({pinnedMessages.length})</span>
            </div>
            <div className="max-h-32 overflow-y-auto custom-scrollbar">
              {pinnedMessages.map(msg => (
                <div 
                  key={`pinned-${msg._id}`} 
                  className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-800/50 flex flex-col gap-1 transition-colors"
                  onClick={() => {
                    const el = document.getElementById(`msg-${msg._id}`);
                    if (el) {
                       el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                       el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
                       setTimeout(() => {
                           el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
                       }, 2000);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{msg.sender.username}</span>
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 line-clamp-1">
                    {msg.text || (msg.mediaUrl ? `Attached ${msg.mediaType}` : 'Pinned Message')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {filteredMessages.map((message, index) => {
          const isOwn = message.sender._id === currentUserId;
          const showDate =
            index === 0 ||
            new Date(message.createdAt).toDateString() !==
              new Date(filteredMessages[index - 1].createdAt).toDateString();

          return (
            <div key={message._id} id={`msg-${message._id}`}>
              {message._id === firstUnreadId && (
                <div className="flex items-center justify-center my-4 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-blue-500/30"></div>
                  </div>
                  <div className="relative bg-white dark:bg-slate-950 px-4 text-xs font-medium text-blue-500 uppercase tracking-widest shadow-sm rounded-full py-1 border border-blue-500/20">
                    Unread Messages
                  </div>
                </div>
              )}
              <MessageItem
                message={message}
                currentUserId={currentUserId}
                searchQuery={searchQuery}
                isOwn={isOwn}
                showDate={showDate}
                dateLabel={formatDate(message.createdAt)}
                onReply={startReply}
                onEdit={startEdit}
                onDelete={handleDelete}
                onReaction={handleReaction}
                onRemoveReaction={removeReaction}
                scrollToBottom={scrollToBottom}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                socket={socket}
                chatId={chatId}
                isGroup={isGroup}
                groupAdminId={groupAdminId}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />

        {typingUsers.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="font-medium text-xs">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
        </div>
        
        <AnimatePresence>
          {showScrollBadge && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-500 z-20 cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
              {unreadCountBelow > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                  {unreadCountBelow > 99 ? "99+" : unreadCountBelow}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <MessageInput
            newMessage={newMessage}
            setNewMessage={handleMessageChange}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            editingMessage={editingMessage}
            setEditingMessage={setEditingMessage}
            sending={sending}
            uploading={uploading}
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            handleSend={handleSend}
            handleFileUpload={handleFileUpload}
            handleKeyDown={handleKeyDown}
            startRecording={startRecording}
            stopRecording={stopRecording}
            cancelRecording={cancelRecording}
            fileInputRef={fileInputRef}
            inputRef={inputRef}
            formatRecordingTime={formatRecordingTime}
          />
        </div>

        <ChatSidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          isGroup={isGroup || false}
          chatId={chatId}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
          participants={participants}
          recipientUsername={recipientUsername}
          recipientAvatar={recipientAvatar}
          messages={messages}
          groupAdminId={groupAdminId}
        />
      </div>
    </div>
  );
}
