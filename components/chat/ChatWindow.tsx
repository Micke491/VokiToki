"use client";

import { showNotification, isNotificationsEnabled } from "@/lib/pushNotifications";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/storage";
import { pusherClient } from "@/lib/pusher-client";
import { apiFetch } from "@/lib/api";
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
import ConfirmModal from "../ui/ConfirmModal";
import GifPicker from "./GifPicker";
import StickerPicker from "./StickerPicker";
import EmojiPicker from "emoji-picker-react";
import ImagePreviewModal from "../ui/ImagePreviewModal";
import UserProfileModal from "../ui/UserProfileModal";
import ReportModal from "../ui/ReportModal";
import StoryRing from "./StoryRing";

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
  onMenuClick,
  recipientStoriesUser,
  onStoryClick,
  onChatUpdated,
  onViewStory,
}: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
  const [showEmojiPickerInput, setShowEmojiPickerInput] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
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
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [viewingReceiptsFor, setViewingReceiptsFor] = useState<Message | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const firstUnreadIdRef = useRef<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isBlockedChat, setIsBlockedChat] = useState(false);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState<string | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem(`chat-wallpaper-${chatId}`);
    setWallpaper(saved || null);
  }, [chatId]);

  useEffect(() => {
    if (isGroup) return;
    const checkBlockStatus = async () => {
      try {
        const response = await apiFetch(`/api/users/block/check?chatId=${chatId}`);
        if (response.ok) {
          const data = await response.json();
          setIsBlockedChat(data.blocked);
        }
      } catch (error) {
        console.error('Error checking block status:', error);
      }
    };
    checkBlockStatus();
  }, [chatId, isGroup]);


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
    const token = getAuthToken();
    if (!token) return;

    const channel = pusherClient.subscribe(`chat-${chatId}`);

    channel.bind("receive-message", (message: Message) => {
      if (String(message.chatId) !== String(chatId)) return;

      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(message._id));
        if (exists) return prev;

        const senderId = typeof message.sender === "object" ? message.sender?._id : message.sender;
        if (senderId && senderId !== currentUserId) {
          apiFetch(`/api/chat/message/messages/${message._id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ chatId, messageIds: [message._id], status: "seen" }),
          });
        }

        return [...prev, message];
      });

      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        const senderId = typeof message.sender === "object" ? message.sender?._id : message.sender;
        const isOwnMessage = senderId === currentUserId;

        if (isOwnMessage) {
          setTimeout(() => scrollToBottom(true), 100);
        } else if (isNearBottom) {
          setTimeout(() => scrollToBottom(false), 100);
        } else {
          setUnreadCountBelow((prev) => prev + 1);
        }
      }
    });

    channel.bind("message-updated", (updatedMessage: Message) => {
      setMessages((prev) =>
        prev.map((m) => {
          let updatedMsg = m;
          if (String(m._id) === String(updatedMessage._id)) {
            updatedMsg = {
              ...m,
              ...updatedMessage,
              sender: updatedMessage.sender && typeof updatedMessage.sender === "object"
                ? updatedMessage.sender
                : m.sender,
              replyTo: updatedMessage.replyTo && typeof updatedMessage.replyTo === "object"
                ? updatedMessage.replyTo
                : m.replyTo,
            };
          }
          if (m.replyTo && String(m.replyTo._id) === String(updatedMessage._id)) {
            updatedMsg = {
              ...updatedMsg,
              replyTo: {
                ...m.replyTo,
                text: updatedMessage.text,
                mediaUrl: updatedMessage.mediaUrl,
                mediaType: updatedMessage.mediaType,
              },
            };
          }
          return updatedMsg;
        }),
      );

      setPinnedMessages((prev) =>
        prev.map((m) => {
          let updatedMsg = m;
          if (String(m._id) === String(updatedMessage._id)) {
            updatedMsg = {
              ...m,
              ...updatedMessage,
              sender: updatedMessage.sender && typeof updatedMessage.sender === "object"
                ? updatedMessage.sender
                : m.sender,
              replyTo: updatedMessage.replyTo && typeof updatedMessage.replyTo === "object"
                ? updatedMessage.replyTo
                : m.replyTo,
            };
          }
          if (m.replyTo && String(m.replyTo._id) === String(updatedMessage._id)) {
            updatedMsg = {
              ...updatedMsg,
              replyTo: {
                ...m.replyTo,
                text: updatedMessage.text,
                mediaUrl: updatedMessage.mediaUrl,
                mediaType: updatedMessage.mediaType,
              },
            };
          }
          return updatedMsg;
        })
      );

      window.dispatchEvent(new CustomEvent("local-message-updated", { detail: updatedMessage }));
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
      "messages-delivered",
      (data: { messageIds: string[]; userId: string }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (data.messageIds.includes(m._id) && m.status !== "seen") {
              return {
                ...m,
                status: "delivered",
                deliveredTo: [
                  ...(m.deliveredTo?.filter((id: any) => 
                    (typeof id === 'string' ? id : id.toString()) !== data.userId
                  ) || []),
                  data.userId,
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
        if (String(data.userId) !== String(currentUserId)) {
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
      setPinnedMessages([pinnedMessage]);
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          isPinned: String(m._id) === String(pinnedMessage._id),
        }))
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

    channel.bind("user-blocked", (data: { blockedBy: string; blockedUserId: string }) => {
      if (data.blockedBy === currentUserId || data.blockedUserId === currentUserId) {
        setIsBlockedChat(true);
      }
    });

    return () => {
      channel.unbind("receive-message");
      channel.unbind("message-updated");
      channel.unbind("message-deleted");
      channel.unbind("messages-read");
      channel.unbind("messages-delivered");
      channel.unbind("user-typing");
      channel.unbind("user-stopped-typing");
      channel.unbind("message-reaction-added");
      channel.unbind("message-reaction-removed");
      channel.unbind("message-pinned");
      channel.unbind("message-unpinned");
      channel.unbind("user-blocked");
    };
  }, [chatId, currentUserId]);

  useEffect(() => {
    setNewMessage("");
    setForwardingMessage(null);
    setViewingReceiptsFor(null);
    setReplyingTo(null);
    setEditingMessage(null);
    firstUnreadIdRef.current = null;
    fetchMessages();
  }, [chatId]);

  const hasScrolledInitially = useRef(false);

  useLayoutEffect(() => {
    hasScrolledInitially.current = false;
  }, [chatId]);

  useLayoutEffect(() => {
    if (!loading && messages.length > 0 && !hasScrolledInitially.current) {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          const unreadSeparator = document.getElementById("unread-separator");
          if (unreadSeparator) {
            messagesContainerRef.current.scrollTop = Math.max(0, unreadSeparator.offsetTop - 80);
          } else {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight;
          }
          hasScrolledInitially.current = true;
        }
      });
      const timeout = setTimeout(() => {
        if (messagesContainerRef.current) {
          const unreadSeparator = document.getElementById("unread-separator");
          if (unreadSeparator) {
            messagesContainerRef.current.scrollTop = Math.max(0, unreadSeparator.offsetTop - 80);
          } else {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [loading, messages.length]);


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

      let endpoint = `/api/chat/message?chatId=${chatId}&limit=50&t=${Date.now()}`;
      if (beforeDate) endpoint += `&before=${encodeURIComponent(beforeDate)}`;

      const response = await apiFetch(endpoint, {
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

        // Find first unread message on initial fetch
        const firstUnread = newMessages.find(
          (m: Message) =>
            m.sender?._id !== currentUserId &&
            !m.readBy?.some((r) => r.userId === currentUserId)
        );
        if (firstUnread) {
          firstUnreadIdRef.current = firstUnread._id;
        } else {
          firstUnreadIdRef.current = null;
        }

        apiFetch(`/api/chat/${chatId}/pinned`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setPinnedMessages(data);
              if (!firstUnreadIdRef.current) {
                setTimeout(() => scrollToBottom(true), 50);
              }
            }
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
      const container = messagesContainerRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = elRect.top - containerRect.top - container.clientHeight / 2 + el.offsetHeight / 2;
        container.scrollBy({ top: offset, behavior: "smooth" });
      }
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
        let endpoint = `/api/chat/message?chatId=${chatId}&limit=50`;
        if (beforeDate) endpoint += `&before=${encodeURIComponent(beforeDate)}`;

        const response = await apiFetch(endpoint, {
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

  const scrollThrottleRef = useRef<boolean>(false);
  const handleScroll = () => {
    if (messagesContainerRef.current && !scrollThrottleRef.current) {
      scrollThrottleRef.current = true;
      requestAnimationFrame(() => {
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
        scrollThrottleRef.current = false;
      });
    }
  };

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const markAllAsRead = useCallback(async () => {
    if (!pusherClient || !currentUserId || messagesRef.current.length === 0) return;

    const unreadMessageIds = messagesRef.current
      .filter(
        (m) =>
          m.sender?._id !== currentUserId && 
          !m.readBy?.some((r) => r.userId === currentUserId),
      )
      .map((m) => m._id);

    if (unreadMessageIds.length > 0) {
      try {
        await apiFetch(
          `/api/chat/message/messages/${unreadMessageIds[0]}/status`,
          {
            method: "POST",
            body: JSON.stringify({
              chatId,
              messageIds: unreadMessageIds,
              status: "seen",
            }),
          },
        );
        
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
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }
  }, [pusherClient, currentUserId, chatId]);

  const isRecipientDeleted = !isGroup && (recipientUsername === "Unknown User" || !recipientUsername);

  const handleCallAction = useCallback((type: "voice" | "video", callId?: string) => {
    if (isRecipientDeleted) {
      alert("You cannot call a deleted account.");
      return;
    }
    if (isBlockedChat) {
      alert("You cannot call this user. There is a block between you.");
      return;
    }
    const calleeId = !isGroup && participants ? participants.find(p => p._id !== currentUserId)?._id : undefined;
    window.dispatchEvent(new CustomEvent("start-call", { detail: { chatId, type, calleeId, callId } }));
  }, [chatId, isRecipientDeleted, isBlockedChat, isGroup, participants, currentUserId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      markAllAsRead();
    }
  }, [loading, chatId, messages.length, markAllAsRead]);

  const scrollToBottom = useCallback((force: boolean | React.SyntheticEvent = false) => {
    if (messagesContainerRef.current) {
      const performScroll = () => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } =
          messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        const shouldForce = force === true;

        if (shouldForce || isNearBottom) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      };

      performScroll();
      if (force === true) {
        requestAnimationFrame(performScroll);
        setTimeout(performScroll, 100);
      }
    }
  }, []);

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
      const response = await apiFetch("/api/chat/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      if (pusherClient) {
        await apiFetch("/api/chat/message", {
          method: "POST",
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
      setTimeout(() => inputRef.current?.focus(), 10);
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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      apiFetch("/api/chat/typing", {
        method: "POST",
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
        await apiFetch(`/api/chat/message/messages/${editingMessage._id}/edit`, {
          method: "PATCH",
          body: JSON.stringify({ text: messageText }),
        });
        setEditingMessage(null);
      } else {
        const response = await apiFetch("/api/chat/message", {
          method: "POST",
          body: JSON.stringify({
            chatId,
            senderId: currentUserId,
            text: messageText,
            replyTo: replyingTo?._id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        setReplyingTo(null);
        scrollToBottom(true);
        markAllAsRead();
      }
    } catch (error) {
      setNewMessage(messageText);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 10);
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
      const response = await apiFetch("/api/chat/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      if (pusherClient) {
        await apiFetch("/api/chat/message", {
          method: "POST",
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
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleGifSelect = async (url: string) => {
    if (!pusherClient) return;
    
    setSending(true);
    try {
      const response = await apiFetch("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          chatId,
          senderId: currentUserId,
          mediaUrl: url,
          mediaType: "gif",
          replyTo: replyingTo?._id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Gif error response:", errData);
        alert(`Failed to send GIF: ${errData.error || response.statusText}`);
      } else {
        setReplyingTo(null);
        scrollToBottom(true);
        setShowGifPicker(false);
      }
    } catch (error) {
      console.error("Gif upload error:", error);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleStickerSelect = async (url: string) => {
    if (!pusherClient) return;
    
    setSending(true);
    try {
      const response = await apiFetch("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          chatId,
          senderId: currentUserId,
          mediaUrl: url,
          mediaType: "sticker",
          replyTo: replyingTo?._id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Sticker error response:", errData);
        alert(`Failed to send sticker: ${errData.error || response.statusText}`);
      } else {
        setReplyingTo(null);
        scrollToBottom(true);
        setShowStickerPicker(false);
      }
    } catch (error) {
      console.error("Sticker upload error:", error);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 10);
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
    if (!pusherClient) return;
    setMessageToDelete(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !pusherClient) return;
    try {
      await apiFetch(
        `/api/chat/message/messages/${messageToDelete}/delete?forEveryone=true`,
        {
          method: "DELETE",
        },
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    } finally {
      setMessageToDelete(null);
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
      await apiFetch(`/api/chat/${chatId}/pinned?messageId=${message._id}`, {
        method: "DELETE",
      });
    } else {
      await apiFetch(`/api/chat/${chatId}/pinned`, {
        method: "POST",
        body: JSON.stringify({ messageId: message._id }),
      });
    }
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
      await apiFetch(`/api/chat/message/messages/${messageId}/reaction`, {
        method: "POST",
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
      await apiFetch(
        `/api/chat/message/messages/${messageId}/reaction?chatId=${chatId}&emoji=${encodeURIComponent(emoji)}`,
        {
          method: "DELETE",
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
        apiFetch("/api/chat/typing", {
          method: "POST",
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
          apiFetch("/api/chat/typing", {
            method: "POST",
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
      await apiFetch("/api/chat/message", {
        method: "POST",
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
      <div className="flex flex-col items-center justify-center h-full text-chat-text-secondary">
        <div className="w-10 h-10 mb-4 border-4 border-chat-border border-t-chat-accent rounded-full animate-spin" />
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
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative transition-colors duration-300">
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
          participants={participants || []}
          onClose={() => setViewingReceiptsFor(null)}
        />
      )}

      <ChatHeader
        recipientUsername={recipientUsername}
        recipientAvatar={recipientAvatar}
        recipientId={!isGroup && participants ? participants.find(p => p._id !== currentUserId)?._id : undefined}
        isGroup={isGroup}
        onClose={() => (onClose ? onClose() : router.push("/chat"))}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onMenuClick={onMenuClick}
        chatId={chatId}
        currentUserId={currentUserId}
        currentUserUsername={currentUserUsername || "User"}
        onViewProfile={(userId) => setViewingProfileUserId(userId)}
        recipientOnline={recipientOnline}
        recipientLastSeen={recipientLastSeen}
        recipientStoriesUser={recipientStoriesUser}
        onStoryClick={onStoryClick}
        onCallStart={(callType) => {
          if (isRecipientDeleted) {
            alert("You cannot call a deleted account.");
            return;
          }
          if (isBlockedChat) {
            alert("You cannot call this user. There is a block between you.");
            return;
          }
          const calleeId = !isGroup && participants ? participants.find(p => p._id !== currentUserId)?._id : undefined;
          window.dispatchEvent(new CustomEvent("start-call", { detail: { chatId, type: callType, calleeId } }));
        }}
        isBlocked={isBlockedChat}
        isDeleted={isRecipientDeleted}
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
                  <span className="flex-1">Pinned Message</span>
                  <button 
                    onClick={() => handlePin(pinnedMessages[0])}
                    className="hover:text-red-500 transition-colors"
                  >
                    Unpin
                  </button>
                </div>
                <div>
                  {pinnedMessages.slice(0, 1).map((msg) => (
                    <div
                      key={`pinned-${msg._id}`}
                      className="px-4 py-2 hover:bg-chat-bg-secondary cursor-pointer flex flex-col gap-1 transition-colors"
                      onClick={() => jumpToMessage(msg._id)}
                    >
                      <div className="flex items-center gap-2 text-xs text-chat-text-tertiary">
                        <span className="font-semibold text-chat-text-primary">
                          {msg.sender?.username || msg.senderUsername || "Unknown User"}
                        </span>
                      </div>
                      <div className="text-chat-text-secondary line-clamp-1 text-xs">
                        {msg.text ||
                          (msg.mediaUrl
                            ? `Attached ${msg.mediaType === "video" ? "Video" : msg.mediaType === "gif" ? "GIF" : msg.mediaType === "audio" ? "Voice record" : "Photo"}`
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
              <div className="p-6 space-y-6 min-h-full flex flex-col justify-end relative z-10">
                {!hasMore && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="relative mb-4">
                      {isGroup ? (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl overflow-hidden ring-4 ring-chat-bg-primary">
                          {recipientAvatar ? (
                            <img src={recipientAvatar} alt={recipientUsername} className="w-full h-full object-cover" />
                          ) : (
                            (recipientUsername || "G").charAt(0).toUpperCase()
                          )}
                        </div>
                      ) : (
                        <StoryRing
                          size="xl"
                          avatarUrl={recipientAvatar}
                          username={recipientUsername || "?"}
                          showLabel={false}
                          hasStory={(recipientStoriesUser?.stories?.length || 0) > 0}
                          hasUnviewedStory={(recipientStoriesUser?.stories?.length || 0) > 0 && (recipientStoriesUser?.stories || []).some((s: any) => !(s.viewedBy || []).some((v: any) => v.userId === currentUserId))}
                          onClick={() => {
                            const otherUser = participants?.find(p => p._id !== currentUserId);
                            if (recipientStoriesUser?.stories && recipientStoriesUser.stories.length > 0 && onStoryClick) {
                              onStoryClick(recipientStoriesUser.user._id, recipientStoriesUser.stories, recipientStoriesUser.user.username, recipientStoriesUser.user.avatar);
                            } else if (otherUser) {
                              setViewingProfileUserId(otherUser._id);
                            }
                          }}
                        />
                      )}
                    </div>

                    <h2 className="text-2xl font-bold text-chat-text-primary mb-1">
                      {recipientUsername || (isGroup ? "Group Chat" : "Chat")}
                    </h2>
                    
                    {!isGroup && recipientUsername && (
                      <p className="text-sm text-chat-text-secondary mb-6 font-medium">
                        {recipientUsername}
                      </p>
                    )}
                    
                    {isGroup && (
                      <p className="text-sm text-chat-text-secondary mb-6 font-medium">
                         Group Chat · {participants?.length || 0} participants
                      </p>
                    )}

                    <button
                      onClick={() => {
                        if (isGroup) {
                          setShowSidebar(true);
                        } else {
                          const otherUser = participants?.find(p => p._id !== currentUserId);
                          if (otherUser) setViewingProfileUserId(otherUser._id);
                        }
                      }}
                      className="px-6 py-2 bg-chat-bg-secondary hover:bg-chat-bg-tertiary text-chat-text-primary text-sm font-semibold rounded-lg transition-all active:scale-95 shadow-sm border border-chat-border"
                    >
                      {isGroup ? "View Group Info" : "View Profile"}
                    </button>
                  </div>
                )}
                {loadingMore && (
                  <div className="flex justify-center py-2">
                    <div className="w-5 h-5 border-2 border-chat-border border-t-chat-accent rounded-full animate-spin" />
                  </div>
                )}
                {filteredMessages.map((message, index) => {
                  const isOwn = message.sender && message.sender._id === currentUserId;
                  const showDate =
                    index === 0 ||
                    new Date(message.createdAt).toDateString() !==
                      new Date(
                        filteredMessages[index - 1].createdAt,
                      ).toDateString();

                  const isFirstUnread = firstUnreadIdRef.current === message._id;

                  return (
                    <div key={message._id}>
                      {isFirstUnread && (
                        <div id="unread-separator" className="flex items-center justify-center my-6 py-2 select-none">
                          <div className="flex-1 h-[1px] bg-chat-accent/30" />
                          <span className="mx-4 text-xs font-semibold tracking-wide text-chat-accent bg-chat-accent/10 px-3.5 py-1.5 rounded-full border border-chat-accent/20 shadow-sm transition-all duration-300">
                            New Messages
                          </span>
                          <div className="flex-1 h-[1px] bg-chat-accent/30" />
                        </div>
                      )}
                      <div id={`msg-${message._id}`}>
                        <MessageItem
                          message={message}
                          currentUserId={currentUserId}
                          searchQuery={searchQuery}
                          isOwn={isOwn || false}
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
                          onPreviewImage={setPreviewImage}
                          onCallAction={handleCallAction}
                          onReport={setReportingMessage}
                          onViewStory={onViewStory}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <AnimatePresence>
            {showGifPicker && (
              <GifPicker 
                key="gif-picker"
                onSelect={handleGifSelect}
                onClose={() => setShowGifPicker(false)}
              />
            )}
            {showStickerPicker && (
              <StickerPicker 
                key="sticker-picker"
                onSelect={handleStickerSelect}
                onClose={() => setShowStickerPicker(false)}
              />
            )}
            {showEmojiPickerInput && (
              <motion.div
                key="emoji-picker"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-20 left-4 z-[100] shadow-2xl"
              >
                 <EmojiPicker
                   onEmojiClick={(emojiData) => {
                     setNewMessage(prev => prev + emojiData.emoji);
                     setShowEmojiPickerInput(false);
                     inputRef.current?.focus();
                   }}
                   theme={"auto" as any}
                 />
              </motion.div>
            )}
            {showScrollBadge && (
              <motion.button
                key="scroll-badge"
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

          <ImagePreviewModal 
            imageUrl={previewImage}
            onClose={() => setPreviewImage(null)}
          />

          <div className="h-6 px-6 flex items-center bg-transparent relative z-20">
            <AnimatePresence>
              {typingUsers.length > 0 && !isRecipientDeleted && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-center gap-2 text-chat-text-tertiary"
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-chat-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-chat-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-chat-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-medium text-[11px] italic">
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers.length} people are typing...`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* READ-ONLY BANNER OR MESSAGE INPUT */}
          {isBlockedChat ? (
            <div className="p-4 bg-chat-bg-primary border-t border-chat-border shrink-0 flex items-center justify-center">
              <span className="px-4 py-2.5 bg-chat-bg-secondary rounded-xl text-sm text-chat-text-secondary font-medium border border-chat-border shadow-sm text-center">
                You can&apos;t send messages to this conversation. A block exists between you and this user.
              </span>
            </div>
          ) : isRecipientDeleted ? (
            <div className="p-4 bg-chat-bg-primary border-t border-chat-border shrink-0 flex items-center justify-center">
              <span className="px-4 py-2.5 bg-chat-bg-secondary rounded-xl text-sm text-chat-text-secondary font-medium border border-chat-border shadow-sm text-center">
                This account has been deleted. You can no longer send messages or call.
              </span>
            </div>
          ) : (
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
              showGifPicker={showGifPicker}
              setShowGifPicker={(val) => {
                setShowGifPicker(val);
                if (val) {
                  setShowStickerPicker(false);
                  setShowEmojiPickerInput(false);
                }
              }}
              showStickerPicker={showStickerPicker}
              setShowStickerPicker={(val) => {
                setShowStickerPicker(val);
                if (val) {
                  setShowGifPicker(false);
                  setShowEmojiPickerInput(false);
                }
              }}
              showEmojiPickerInput={showEmojiPickerInput}
              setShowEmojiPickerInput={(val) => {
                setShowEmojiPickerInput(val);
                if (val) {
                  setShowGifPicker(false);
                  setShowStickerPicker(false);
                }
              }}
            />
          )}
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
            onViewProfile={(userId) => setViewingProfileUserId(userId)}
            isBlocked={isBlockedChat}
            isDeleted={isRecipientDeleted}
            onChatUpdated={onChatUpdated}
          />
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={!!viewingProfileUserId}
        onClose={() => setViewingProfileUserId(null)}
        userId={viewingProfileUserId || ''}
      />

      {/* Report Message Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        targetId={reportingMessage?._id || ''}
        targetType="message"
        targetName={`message from ${reportingMessage?.sender?.username}`}
      />

      <ConfirmModal 
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message for everyone? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}