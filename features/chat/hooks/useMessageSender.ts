'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { pusherClient } from '@/lib/pusher-client';
import { Message } from '@/features/chat/types/chat';
import { EmojiClickData } from 'emoji-picker-react';
import toast from 'react-hot-toast';

import { useChatSession } from '@/hooks/useChatSession';

interface UseMessageSenderProps {
  chatId: string;
  currentUserId: string;
  currentUserUsername?: string;
  isGroup: boolean;
  scrollToBottom: (force: boolean) => void;
  markAllAsRead: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>; 
}

export function useMessageSender({
  chatId,
  currentUserId,
  currentUserUsername,
  isGroup,
  scrollToBottom,
  markAllAsRead,
  setMessages,
}: UseMessageSenderProps) {
  const { currentUser } = useChatSession();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showEmojiPickerInput, setShowEmojiPickerInput] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [viewingReceiptsFor, setViewingReceiptsFor] = useState<Message | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isBlockedChat, setIsBlockedChat] = useState(false);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const offlineQueueRef = useRef<{ tempId: string; text?: string; mediaUrl?: string; mediaType?: any; mediaPublicId?: string; replyToId?: string }[]>([]);

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
    const handleOnline = () => {
      retryOfflineQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [chatId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  const attemptSendMessage = useCallback(async (tempId: string, text: string, replyToId?: string) => {
    try {
      const response = await apiFetch("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          chatId,
          senderId: currentUserId,
          text,
          replyTo: replyToId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send");
      }

      const data = await response.json();
      const realMessage = data.message;

      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...realMessage, status: "sent" } : m))
      );

      offlineQueueRef.current = offlineQueueRef.current.filter((item) => item.tempId !== tempId);
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );

      if (!offlineQueueRef.current.some((item) => item.tempId === tempId)) {
        offlineQueueRef.current.push({ tempId, text, replyToId });
      }
    }
  }, [chatId, currentUserId, setMessages]);

  const attemptSendMedia = useCallback(async (tempId: string, mediaUrl: string, mediaType: any, mediaPublicId?: string, replyToId?: string) => {
    try {
      const response = await apiFetch("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          chatId,
          senderId: currentUserId,
          mediaUrl,
          mediaType,
          mediaPublicId,
          replyTo: replyToId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send media");
      }

      const data = await response.json();
      const realMessage = data.message;

      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...realMessage, status: "sent" } : m))
      );

      offlineQueueRef.current = offlineQueueRef.current.filter((item) => item.tempId !== tempId);
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );

      if (!offlineQueueRef.current.some((item) => item.tempId === tempId)) {
        offlineQueueRef.current.push({ tempId, mediaUrl, mediaType, mediaPublicId, replyToId });
      }
    }
  }, [chatId, currentUserId, setMessages]);

  const retryOfflineQueue = useCallback(async () => {
    if (offlineQueueRef.current.length === 0) return;
    const queue = [...offlineQueueRef.current];
    
    for (const item of queue) {
      setMessages((prev) =>
        prev.map((m) => (m._id === item.tempId ? { ...m, status: "sending" } : m))
      );

      if (item.text) {
        await attemptSendMessage(item.tempId, item.text, item.replyToId);
      } else if (item.mediaUrl) {
        await attemptSendMedia(item.tempId, item.mediaUrl, item.mediaType, item.mediaPublicId, item.replyToId);
      }
    }
  }, [attemptSendMessage, attemptSendMedia, setMessages]);

  const retrySingleMessage = useCallback(async (failedMsg: Message) => {
    if (!navigator.onLine) {
      toast.error("Offline: No active connection. Cannot retry yet.");
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m._id === failedMsg._id ? { ...m, status: "sending" } : m))
    );

    if (failedMsg.text) {
      await attemptSendMessage(failedMsg._id, failedMsg.text, failedMsg.replyTo?._id);
    } else if (failedMsg.mediaUrl) {
      await attemptSendMedia(failedMsg._id, failedMsg.mediaUrl, failedMsg.mediaType, failedMsg.mediaPublicId, failedMsg.replyTo?._id);
    }
  }, [attemptSendMessage, attemptSendMedia, setMessages]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    if (isTypingRef.current) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      apiFetch("/api/chat/typing", {
        method: "POST",
        body: JSON.stringify({
          chatId,
          username: currentUserUsername || "Someone",
          isTyping: false,
        }),
      }).catch(() => {});
      isTypingRef.current = false;
    }

    if (editingMessage) {
      if (!navigator.onLine) {
        toast.error("Offline: Cannot edit messages without an internet connection.");
        return;
      }
      setSending(true);
      try {
        await apiFetch(`/api/chat/message/messages/${editingMessage._id}/edit`, {
          method: "PATCH",
          body: JSON.stringify({ text: messageText }),
        });
        setEditingMessage(null);
      } catch (error) {
        setNewMessage(messageText);
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 10);
      }
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const optimisticMsg: Message = {
      _id: tempId,
      chatId,
      sender: {
        _id: currentUserId,
        username: currentUserUsername || "You",
        email: "",
        avatar: currentUser?.avatar || "",
      },
      senderUsername: currentUserUsername || "You",
      text: messageText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending",
      read: false,
      reactions: [],
      readBy: [],
      deliveredTo: [],
    };

    if (replyingTo) {
      optimisticMsg.replyTo = replyingTo;
    }

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);
    setTimeout(() => scrollToBottom(true), 50);

    // Connection check: queue text message offline
    if (!navigator.onLine) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
      if (!offlineQueueRef.current.some((item) => item.tempId === tempId)) {
        offlineQueueRef.current.push({ tempId, text: messageText, replyToId: replyingTo?._id });
      }
      toast.error("Offline: Message queued. It will send automatically upon reconnection.");
      return;
    }

    attemptSendMessage(tempId, messageText, replyingTo?._id);
  }, [newMessage, sending, editingMessage, chatId, currentUserId, currentUserUsername, currentUser, replyingTo, scrollToBottom, attemptSendMessage, setMessages]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!navigator.onLine) {
      toast.error("Offline: Cannot upload photos, videos, or voice recordings without an internet connection.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB.");
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

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const optimisticMsg: Message = {
        _id: tempId,
        chatId,
        sender: {
          _id: currentUserId,
          username: currentUserUsername || "You",
          email: "",
          avatar: currentUser?.avatar || "",
        },
        senderUsername: currentUserUsername || "You",
        text: "",
        mediaUrl: data.url,
        mediaType: data.mediaType,
        mediaPublicId: data.publicId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "sending",
        read: false,
        reactions: [],
        readBy: [],
        deliveredTo: [],
      };

      if (replyingTo) {
        optimisticMsg.replyTo = replyingTo;
      }

      setMessages((prev) => [...prev, optimisticMsg]);
      setReplyingTo(null);
      setTimeout(() => scrollToBottom(true), 50);

      attemptSendMedia(tempId, data.url, data.mediaType, data.publicId, replyingTo?._id);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [chatId, currentUserId, currentUserUsername, currentUser, replyingTo, scrollToBottom, attemptSendMedia, setMessages]);

  const handleGifSelect = useCallback(async (url: string) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot send GIFs without an internet connection.");
      return;
    }
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const optimisticMsg: Message = {
      _id: tempId,
      chatId,
      sender: {
        _id: currentUserId,
        username: currentUserUsername || "You",
        email: "",
        avatar: currentUser?.avatar || "",
      },
      senderUsername: currentUserUsername || "You",
      text: "",
      mediaUrl: url,
      mediaType: "gif",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending",
      read: false,
      reactions: [],
      readBy: [],
      deliveredTo: [],
    };

    if (replyingTo) {
      optimisticMsg.replyTo = replyingTo;
    }

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);
    setTimeout(() => scrollToBottom(true), 50);
    setShowGifPicker(false);

    attemptSendMedia(tempId, url, "gif", undefined, replyingTo?._id);
  }, [chatId, currentUserId, currentUserUsername, currentUser, replyingTo, scrollToBottom, attemptSendMedia, setMessages]);

  const handleStickerSelect = useCallback(async (url: string) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot send stickers without an internet connection.");
      return;
    }
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const optimisticMsg: Message = {
      _id: tempId,
      chatId,
      sender: {
        _id: currentUserId,
        username: currentUserUsername || "You",
        email: "",
        avatar: currentUser?.avatar || "",
      },
      senderUsername: currentUserUsername || "You",
      text: "",
      mediaUrl: url,
      mediaType: "sticker",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending",
      read: false,
      reactions: [],
      readBy: [],
      deliveredTo: [],
    };

    if (replyingTo) {
      optimisticMsg.replyTo = replyingTo;
    }

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);
    setTimeout(() => scrollToBottom(true), 50);
    setShowStickerPicker(false);

    attemptSendMedia(tempId, url, "sticker", undefined, replyingTo?._id);
  }, [chatId, currentUserId, currentUserUsername, currentUser, replyingTo, scrollToBottom, attemptSendMedia, setMessages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
    if (e.key === "Escape") {
      setReplyingTo(null);
      setEditingMessage(null);
      setNewMessage("");
    }
  }, [handleSend]);

  const handleDelete = useCallback((messageId: string) => {
    if (!pusherClient) return;
    setMessageToDelete(messageId);
  }, []);

  const confirmDeleteMessage = useCallback(async () => {
    if (!messageToDelete || !pusherClient) return;
    if (!navigator.onLine) {
      toast.error("Offline: Cannot delete messages for everyone without an internet connection.");
      return;
    }
    try {
      await apiFetch(
        `/api/chat/message/messages/${messageToDelete}/delete?forEveryone=true`,
        {
          method: "DELETE",
        }
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    } finally {
      setMessageToDelete(null);
    }
  }, [messageToDelete]);

  const startEdit = useCallback((message: Message) => {
    setEditingMessage(message);
    setReplyingTo(null);
    setNewMessage(message.text);
    inputRef.current?.focus();
  }, []);

  const startReply = useCallback((message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  }, []);

  const handlePin = useCallback(async (message: Message) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot pin or unpin messages without an internet connection.");
      return;
    }
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
  }, [chatId]);

  const handleReaction = useCallback(async (
    emojiData: EmojiClickData,
    messageId: string
  ) => {
    if (!pusherClient) return;
    if (!navigator.onLine) {
      toast.error("Offline: Cannot add reactions without an internet connection.");
      return;
    }
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
  }, [chatId]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!pusherClient) return;
    if (!navigator.onLine) {
      toast.error("Offline: Cannot remove reactions without an internet connection.");
      return;
    }
    try {
      await apiFetch(
        `/api/chat/message/messages/${messageId}/reaction?chatId=${chatId}&emoji=${encodeURIComponent(emoji)}`,
        {
          method: "DELETE",
        }
      );
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  }, [chatId]);

  const handleMessageChange = useCallback((val: string) => {
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
  }, [chatId, currentUserUsername, editingMessage]);

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

  const handleForwardSelection = useCallback(async (targetChatIds: string[]) => {
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
  }, [forwardingMessage, currentUserId]);

  const handleWallpaperChange = (url: string | null) => {
    if (url) {
      localStorage.setItem(`chat-wallpaper-${chatId}`, url);
    } else {
      localStorage.removeItem(`chat-wallpaper-${chatId}`);
    }
    setWallpaper(url);
  };

  return {
    newMessage,
    setNewMessage: handleMessageChange,
    sending,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    uploading,
    showEmojiPicker,
    setShowEmojiPicker,
    showEmojiPickerInput,
    setShowEmojiPickerInput,
    showGifPicker,
    setShowGifPicker,
    showStickerPicker,
    setShowStickerPicker,
    showMoreMenu,
    setShowMoreMenu,
    wallpaper,
    setWallpaper: handleWallpaperChange,
    forwardingMessage,
    setForwardingMessage,
    viewingReceiptsFor,
    setViewingReceiptsFor,
    messageToDelete,
    setMessageToDelete,
    previewImage,
    setPreviewImage,
    isBlockedChat,
    setIsBlockedChat,
    viewingProfileUserId,
    setViewingProfileUserId,
    reportingMessage,
    setReportingMessage,
    recipientOnline,
    setRecipientOnline,
    recipientLastSeen,
    setRecipientLastSeen,
    inputRef,
    fileInputRef,
    handleSend,
    handleFileUpload,
    handleGifSelect,
    handleStickerSelect,
    handleKeyDown,
    handleDelete,
    confirmDeleteMessage,
    startEdit,
    startReply,
    handlePin,
    handleReaction,
    removeReaction,
    handleForwardSelection,
    retrySingleMessage, 
  };
}