"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
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
import CallModal from "./CallModal";
import IncomingCallModal from "./IncomingCallModal";
import { IncomingCallData } from "../../types/chat";

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
  const [pusherClient, setPusherClient] = useState<Pusher | null>(null);
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
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [unreadCountBelow, setUnreadCountBelow] = useState(0);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(
    null,
  );
  const [viewingReceiptsFor, setViewingReceiptsFor] = useState<Message | null>(
    null,
  );
  const prevScrollHeightRef = useRef<number>(0);
  const [activeCall, setActiveCall] = useState<{roomUrl: string, type: "voice" | "video"} | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

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
      if (
        (event.target as HTMLElement).closest("[data-more-menu-trigger]") ||
        (event.target as HTMLElement).closest("[data-more-menu]")
      ) {
        return;
      }
      setShowMoreMenu(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`chat-${chatId}`);

    channel.bind("receive-message", (message: Message) => {
      if (message.chatId !== chatId) return;

      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(message._id));
        if (exists) return prev;

        if (message.sender._id !== currentUserId) {
          fetch(`/api/chat/message/messages/${message._id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ status: "seen" }),
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

    channel.bind("message-updated", (updatedMessage: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)),
      );
    });

    channel.bind("message-deleted", (data: { messageId: string }) => {
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

    channel.bind(
      "messages-read",
      (data: { messageIds: string[]; userId: string }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (data.messageIds.includes(m._id)) {
              return {
                ...m,
                status: "seen",
                readBy: [
                  ...(m.readBy?.filter((r) => r.userId !== data.userId) || []),
                  { userId: data.userId, readAt: new Date().toISOString() },
                ],
              };
            }
            return m;
          }),
        );
      },
    );

    channel.bind(
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

    channel.bind(
      "user-stopped-typing",
      (data: { username: string; userId: string }) => {
        setTypingUsers((prev) =>
          prev.filter((username) => username !== data.username),
        );
      },
    );

    channel.bind(
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

    channel.bind(
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
                  (r) => !(r.userId === data.userId && r.emoji === data.emoji),
                ),
              };
            }
            return m;
          }),
        );
      },
    );

    channel.bind("message-pinned", (pinnedMessage: Message) => {
      setPinnedMessages((prev) => {
        if (prev.some((m) => m._id === pinnedMessage._id)) return prev;
        return [pinnedMessage, ...prev];
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === pinnedMessage._id ? { ...m, isPinned: true } : m,
        ),
      );
    });

    channel.bind("message-unpinned", (data: { messageId: string }) => {
      setPinnedMessages((prev) => prev.filter((m) => m._id !== data.messageId));
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, isPinned: false } : m,
        ),
      );
    });

    channel.bind("call:incoming", (data: IncomingCallData) => {
      if (data.callerId !== currentUserId) {
        setIncomingCall(data);
      }
    });

    channel.bind("call:ended", (data: { chatId: string }) => {
      if (data.chatId === chatId) {
        setActiveCall(null);
        setIncomingCall(null);
      }
    });

    setPusherClient(pusher);

    return () => {
      pusher.unsubscribe(`chat-${chatId}`);
      pusher.disconnect();
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
      const scrollDiff =
        messagesContainerRef.current.scrollHeight - prevScrollHeightRef.current;
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
        cache: "no-store",
      });

      if (beforeDate && messagesContainerRef.current) {
        prevScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
      }
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();

      const newMessages = data.messages || [];

      if (beforeDate) {
        setMessages((prev) => {
          const combined = [...newMessages, ...prev];
          const unique = Array.from(
            new Map(combined.map((m) => [m._id, m])).values(),
          );
          return unique.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
      } else {
        setMessages(newMessages);

        // Also fetch pinned messages
        fetch(`/api/chat/${chatId}/pinned`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) setPinnedMessages(data);
          })
          .catch((err) =>
            console.error("Failed to fetch pinned messages", err),
          );
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const jumpToMessage = async (messageId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const highlightMessage = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const innerEl = document.getElementById(`message-${messageId}`);
      if (innerEl) {
        innerEl.classList.add(
          "ring-2",
          "ring-chat-accent",
          "bg-chat-accent/10",
        );
        setTimeout(() => {
          innerEl.classList.remove(
            "ring-2",
            "ring-chat-accent",
            "bg-chat-accent/10",
          );
        }, 2000);
      }
    };

    let el = document.getElementById(`msg-${messageId}`);
    if (el) {
      highlightMessage(el);
      return;
    }

    setLoadingMore(true);
    try {
      let currentHasMore = hasMore;
      let currentMessages = [...messages];

      while (currentHasMore) {
        if (signal.aborted) return;

        const beforeDate =
          currentMessages.length > 0 ? currentMessages[0].createdAt : undefined;
        const url = new URL("/api/chat/message", window.location.href);
        url.searchParams.append("chatId", chatId);
        url.searchParams.append("limit", "50");
        if (beforeDate) url.searchParams.append("before", beforeDate);

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          signal,
        });

        if (!response.ok) break;
        const data = await response.json();
        const newMessages = data.messages || [];
        if (newMessages.length === 0) break;

        currentMessages = [...newMessages, ...currentMessages];
        currentHasMore = data.hasMore;

        setMessages((prev) => {
          const combined = [...newMessages, ...prev];
          return Array.from(
            new Map(combined.map((m) => [m._id, m])).values(),
          ).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
        setHasMore(currentHasMore);

        if (newMessages.some((m: any) => m._id === messageId)) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              const newEl = document.getElementById(`msg-${messageId}`);
              if (newEl) highlightMessage(newEl);
            }, 100);
          });
          break;
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Jump to message failed", e);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
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

  const markAllAsRead = useCallback(async () => {
    if (!pusherClient || !currentUserId || messages.length === 0) return;

    const unreadMessageIds = messages
      .filter(
        (m) =>
          m.sender._id !== currentUserId &&
          !m.readBy?.some((r) => r.userId === currentUserId),
      )
      .map((m) => m._id);

    if (unreadMessageIds.length > 0) {
      try {
        await fetch(
          `/api/chat/message/messages/${unreadMessageIds[0]}/status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              messageIds: unreadMessageIds,
              status: "seen",
            }),
          },
        );
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }

      setMessages((prev) =>
        prev.map((m) =>
          unreadMessageIds.includes(m._id)
            ? {
                ...m,
                status: "seen",
                read: true,
                readBy: [
                  ...(m.readBy?.filter((r) => r.userId !== currentUserId) ||
                    []),
                  { userId: currentUserId, readAt: new Date().toISOString() },
                ],
              }
            : m,
        ),
      );
    }
  }, [pusherClient, currentUserId, messages, chatId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      markAllAsRead();
    }
  }, [loading, chatId, messages.length, markAllAsRead]);

  const scrollToBottom = (force: boolean | React.SyntheticEvent = false) => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      const shouldForce = force === true;

      if (shouldForce || isNearBottom) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
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

      if (pusherClient) {
        await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            chatId,
            senderId: currentUserId,
            mediaUrl: data.url,
            mediaType: "audio",
            mediaPublicId: data.publicId,
            replyTo: replyingTo?._id,
          }),
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
    if (!newMessage.trim() || sending || !pusherClient) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    if (isTypingRef.current) {
      fetch("/api/chat/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          chatId,
          username: currentUserUsername || "Someone",
          isTyping: false,
        }),
      });
      isTypingRef.current = false;
    }

    try {
      if (editingMessage) {
        await fetch(`/api/chat/message/messages/${editingMessage._id}/edit`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ text: messageText }),
        });
        setEditingMessage(null);
      } else {
        await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            chatId,
            senderId: currentUserId,
            text: messageText,
            replyTo: replyingTo?._id,
          }),
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

      if (pusherClient) {
        await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            chatId,
            senderId: currentUserId,
            mediaUrl: data.url,
            mediaType: data.mediaType,
            mediaPublicId: data.publicId,
            replyTo: replyingTo?._id,
          }),
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

  const handleDelete = async (messageId: string) => {
    if (!pusherClient || !confirm("Delete this message for everyone?")) return;
    try {
      await fetch(
        `/api/chat/message/messages/${messageId}/delete?forEveryone=true`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }
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

  const handlePin = async (message: Message) => {
    if (message.isPinned) {
      await fetch(`/api/chat/${chatId}/pinned?messageId=${message._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    } else {
      await fetch(`/api/chat/${chatId}/pinned`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ messageId: message._id }),
      });
    }
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

  const handleReaction = async (
    emojiData: EmojiClickData,
    messageId: string,
  ) => {
    if (!pusherClient) return;
    try {
      await fetch(`/api/chat/message/messages/${messageId}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          chatId,
          emoji: emojiData.emoji,
        }),
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
    setShowEmojiPicker(null);
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!pusherClient) return;
    try {
      await fetch(
        `/api/chat/message/messages/${messageId}/reaction?chatId=${chatId}&emoji=${encodeURIComponent(emoji)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  };

  const handleMessageChange = (val: string) => {
    setNewMessage(val);

    if (pusherClient && val.trim() && !editingMessage) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      if (!isTypingRef.current) {
        fetch("/api/chat/typing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            chatId,
            username: currentUserUsername || "Someone",
            isTyping: true,
          }),
        });
        isTypingRef.current = true;
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (pusherClient) {
          fetch("/api/chat/typing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              chatId,
              username: currentUserUsername || "Someone",
              isTyping: false,
            }),
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
    window.addEventListener("forward-message", handleForwardMessage);
    window.addEventListener("view-receipts", handleViewReceipts);
    return () => {
      window.removeEventListener("forward-message", handleForwardMessage);
      window.removeEventListener("view-receipts", handleViewReceipts);
    };
  }, []);

  const handleForwardSelection = async (targetChatIds: string[]) => {
    if (!pusherClient || !forwardingMessage || targetChatIds.length === 0)
      return;

    for (const targetChatId of targetChatIds) {
      await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          chatId: targetChatId,
          senderId: currentUserId,
          text: forwardingMessage.text || undefined,
          mediaUrl: forwardingMessage.mediaUrl || undefined,
          mediaType: forwardingMessage.mediaType || undefined,
          mediaPublicId: forwardingMessage.mediaPublicId || undefined,
          isForwarded: true,
        }),
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
        m.text?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  return (
    <div className="flex-1 flex flex-col h-full bg-chat-bg-primary overflow-hidden relative transition-colors duration-300">
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

      {incomingCall && (
        <IncomingCallModal 
          callData={incomingCall}
          onAccept={() => {
            setActiveCall({ roomUrl: incomingCall.roomUrl, type: incomingCall.callType });
            setIncomingCall(null);
          }}
          onDecline={() => setIncomingCall(null)}
        />
      )}

      {activeCall && (
        <CallModal 
          roomUrl={activeCall.roomUrl}
          chatId={chatId}
          onLeave={() => setActiveCall(null)}
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
        chatId={chatId}
        currentUserId={currentUserId}
        currentUserUsername={currentUserUsername || "User"}
        onCallStart={(roomUrl, callType) => setActiveCall({ roomUrl, type: callType })}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div
            className="flex-1 overflow-y-auto custom-scrollbar relative"
            ref={messagesContainerRef}
            onScroll={handleScroll}
            style={{
              backgroundImage: wallpaper ? `url(${wallpaper})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }}
          >
            {/* Anti-FOUC overlay / Wallpaper Overlay */}
            {wallpaper && (
              <div className="absolute inset-0 bg-chat-bg-primary/40 backdrop-blur-[2px] pointer-events-none" />
            )}

            {pinnedMessages.length > 0 && (
              <div className="sticky top-0 z-30 mb-6 bg-chat-bg-primary/90 backdrop-blur-md rounded-xl shadow-sm border border-chat-border overflow-hidden text-sm">
                <div className="px-3 py-2 border-b border-chat-border flex items-center gap-2 text-xs font-semibold text-chat-text-tertiary bg-chat-bg-secondary">
                  <span className="flex-1">
                    Pinned Messages ({pinnedMessages.length})
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                  {pinnedMessages.map((msg) => (
                    <div
                      key={`pinned-${msg._id}`}
                      className="px-4 py-2 hover:bg-chat-bg-secondary cursor-pointer border-b last:border-0 border-chat-border/50 flex flex-col gap-1 transition-colors"
                      onClick={() => {
                        jumpToMessage(msg._id);
                      }}
                    >
                      <div className="flex items-center gap-2 text-xs text-chat-text-tertiary">
                        <span className="font-semibold text-chat-text-primary">
                          {msg.sender.username}
                        </span>
                        <span>
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-chat-text-secondary line-clamp-1">
                        {msg.text ||
                          (msg.mediaUrl
                            ? `Attached ${msg.mediaType}`
                            : "Pinned Message")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 h-full">
                <div className="w-12 h-12 border-4 border-chat-border border-t-chat-accent rounded-full animate-spin mb-4" />
                <p className="text-chat-text-tertiary animate-pulse">
                  Loading messages...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 h-full text-center">
                <div className="w-20 h-20 bg-chat-bg-secondary rounded-full flex items-center justify-center mb-6">
                  <svg
                    className="w-10 h-10 text-chat-text-tertiary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-chat-text-primary mb-2">
                  No messages yet
                </h3>
                <p className="text-chat-text-secondary max-w-xs">
                  Send a message to start the conversation!
                </p>
              </div>
            ) : (
              <div className="p-4 md:p-6 space-y-6 min-h-full flex flex-col justify-end relative z-10">
                {loadingMore && (
                  <div className="flex justify-center py-2">
                    <div className="w-5 h-5 border-2 border-chat-border border-t-chat-accent rounded-full animate-spin" />
                  </div>
                )}
                {filteredMessages.map((message, index) => {
                  const isOwn = message.sender._id === currentUserId;
                  const showDate =
                    index === 0 ||
                    new Date(message.createdAt).toDateString() !==
                      new Date(
                        filteredMessages[index - 1].createdAt,
                      ).toDateString();

                  return (
                    <div key={message._id} id={`msg-${message._id}`}>
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
                        onPin={handlePin}
                        onForward={setForwardingMessage}
                        onViewStatus={setViewingReceiptsFor}
                        onReaction={handleReaction}
                        onRemoveReaction={removeReaction}
                        scrollToBottom={scrollToBottom}
                        showEmojiPicker={showEmojiPicker}
                        setShowEmojiPicker={setShowEmojiPicker}
                        showMoreMenu={showMoreMenu}
                        setShowMoreMenu={setShowMoreMenu}
                        chatId={chatId}
                        isGroup={isGroup}
                        groupAdminId={groupAdminId}
                        onJumpToMessage={jumpToMessage}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />

            {typingUsers.length > 0 && (
              <div className="px-4 py-2 flex items-center gap-2 text-sm text-chat-text-tertiary">
                <div className="flex gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-chat-text-tertiary rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-chat-text-tertiary rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-chat-text-tertiary rounded-full animate-bounce"
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
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-24 right-8 z-30 p-3 bg-chat-accent text-white rounded-full shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
              >
                <ChevronDown className="w-6 h-6" />
                {unreadCountBelow > 0 && (
                  <span className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-chat-bg-primary">
                    {unreadCountBelow}
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

        {showSidebar && (
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
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}
