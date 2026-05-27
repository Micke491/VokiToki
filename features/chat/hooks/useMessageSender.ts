'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { pusherClient } from '@/lib/pusher-client';
import { Message } from '@/features/chat/types/chat';
import { EmojiClickData } from 'emoji-picker-react';

interface UseMessageSenderProps {
  chatId: string;
  currentUserId: string;
  currentUserUsername?: string;
  isGroup: boolean;
  scrollToBottom: (force: boolean) => void;
  markAllAsRead: () => void;
}

export function useMessageSender({
  chatId,
  currentUserId,
  currentUserUsername,
  isGroup,
  scrollToBottom,
  markAllAsRead,
}: UseMessageSenderProps) {
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

  const handleDelete = (messageId: string) => {
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
        }
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

  const handleReaction = async (
    emojiData: EmojiClickData,
    messageId: string
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
        }
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
  };
}
