'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { wsClient } from '@/lib/ws-client';
import { Message } from '@/features/chat/types/chat';

interface UseChatMessagesProps {
  chatId: string;
  currentUserId: string;
  isGroup: boolean;
}

export function useChatMessages({ chatId, currentUserId, isGroup }: UseChatMessagesProps) {
  const [messages, setMessagesState] = useState<Message[]>([]);

  const setMessages = useCallback((value: React.SetStateAction<Message[]>) => {
    setMessagesState((prev) => {
      const resolved = typeof value === 'function' ? (value as any)(prev) : value;
      const seen = new Map<string, Message>();
      for (const msg of resolved) {
        if (!msg || !msg._id) continue;
        const existing = seen.get(msg._id);
        if (!existing || existing.status === 'sending' || existing.status === 'failed') {
          seen.set(msg._id, msg);
        }
      }
      return Array.from(seen.values());
    });
  }, []);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCountBelow, setUnreadCountBelow] = useState(0);
  const [showScrollBadge, setShowScrollBadge] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const firstUnreadIdRef = useRef<string | null>(null);
  const hasScrolledInitially = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async (beforeDate?: string) => {
    try {
      if (!beforeDate) {
        setLoading(true);
        setMessages([]);
        setPinnedMessages([]);
      } else {
        setLoadingMore(true);
      }

      let endpoint = `/api/chat/message?chatId=${chatId}&limit=20&t=${Date.now()}`;
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
            new Map(combined.map((m) => [m._id, m])).values()
          );
          return unique.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
            console.error("Failed to fetch pinned messages", err)
          );
      }

      setHasMore(data.hasMore);
    } catch (error) {
      console.error("useChatMessages Error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [chatId, currentUserId]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldestMessage = messages[0];
    fetchMessages(oldestMessage.createdAt);
  }, [loadingMore, hasMore, messages, fetchMessages]);

  const jumpToMessage = useCallback(async (messageId: string) => {
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
          "bg-chat-accent/10"
        );
        setTimeout(() => {
          innerEl.classList.remove(
            "ring-2",
            "ring-chat-accent",
            "bg-chat-accent/10"
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
        let endpoint = `/api/chat/message?chatId=${chatId}&limit=20`;
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
            new Map(combined.map((m) => [m._id, m])).values()
          ).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
  }, [chatId, hasMore, messages]);

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

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const markAllAsRead = useCallback(async () => {
    if (!wsClient || !currentUserId || messagesRef.current.length === 0) return;

    const unreadMessageIds = messagesRef.current
      .filter(
        (m) =>
          m.sender?._id !== currentUserId && 
          !m.readBy?.some((r) => r.userId === currentUserId)
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
          }
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
              : m
          )
        );
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }
  }, [chatId, currentUserId]);

  // Handle load messages on mounting/chatId change
  useEffect(() => {
    hasScrolledInitially.current = false;
    fetchMessages();
  }, [chatId, fetchMessages]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      markAllAsRead();
    }
  }, [loading, chatId, messages.length, markAllAsRead]);

  // Pusher subscriptions for message-related actions
  useEffect(() => {
    if (!wsClient) return;
    const channel = wsClient.subscribe(`chat-${chatId}`);

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

        if (senderId === currentUserId) {
          const tempMsgIndex = prev.findIndex((m) => 
            (m._id.startsWith("temp-") || m.status === "sending" || m.status === "failed") &&
            ((m.text && m.text === message.text) || (m.mediaUrl && m.mediaUrl === message.mediaUrl))
          );
          if (tempMsgIndex !== -1) {
            const updated = [...prev];
            updated[tempMsgIndex] = message;
            return updated;
          }
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
        })
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
        })
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
          })
        );
      }
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
          })
        );
      }
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
      }
    );

    channel.bind(
      "user-stopped-typing",
      (data: { username: string; userId: string }) => {
        setTypingUsers((prev) =>
          prev.filter((username) => username !== data.username)
        );
      }
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
                    r.emoji === data.reaction.emoji
                )
              ) {
                return m;
              }
              return { ...m, reactions: [...reactions, data.reaction] };
            }
            return m;
          })
        );
      }
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
                  (r) => !(r.userId === data.userId && r.emoji === data.emoji)
                ),
              };
            }
            return m;
          })
        );
      }
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
          m._id === data.messageId ? { ...m, isPinned: false } : m
        )
      );
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
      wsClient?.unsubscribe(`chat-${chatId}`);
    };
  }, [chatId, currentUserId, scrollToBottom]);

  // Adjust scroll position after messages update (e.g. pagination scroll adjustment)
  useEffect(() => {
    if (prevScrollHeightRef.current > 0 && messagesContainerRef.current) {
      const scrollDiff =
        messagesContainerRef.current.scrollHeight - prevScrollHeightRef.current;
      messagesContainerRef.current.scrollTop = scrollDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  // Initial layout scroll to unread message or bottom
  useEffect(() => {
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

  const scrollThrottleRef = useRef<boolean>(false);
  const handleScroll = useCallback(() => {
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
  }, [hasMore, loadingMore, loadMore]);

  return {
    messages,
    setMessages,
    loading,
    loadingMore,
    hasMore,
    pinnedMessages,
    setPinnedMessages,
    typingUsers,
    unreadCountBelow,
    setUnreadCountBelow,
    showScrollBadge,
    setShowScrollBadge,
    messagesEndRef,
    messagesContainerRef,
    fetchMessages,
    loadMore,
    jumpToMessage,
    scrollToBottom,
    markAllAsRead,
    handleScroll,
    firstUnreadId: firstUnreadIdRef.current,
  };
}

