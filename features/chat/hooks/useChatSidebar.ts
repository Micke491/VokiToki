'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { pusherClient } from '@/lib/pusher-client';
import { Message } from '@/features/chat/types/chat';
import toast from 'react-hot-toast';

export interface Participant {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface UseChatSidebarProps {
  chatId: string | undefined;
  isGroup: boolean;
  participants: Participant[];
  recipientUsername: string | undefined;
  messages: Message[];
  groupAdminId: string | undefined;
  currentUserId: string | undefined;
  onChatUpdated?: (updatedChat: any) => void;
  isOpen: boolean;
}

export function useChatSidebar({
  chatId,
  isGroup,
  participants,
  recipientUsername,
  messages,
  groupAdminId,
  currentUserId,
  onChatUpdated,
  isOpen,
}: UseChatSidebarProps) {
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewMediaType, setPreviewMediaType] = useState<string | undefined>(undefined);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(recipientUsername || "");
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "info";
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "info",
  });

  const [localParticipants, setLocalParticipants] = useState(participants);
  const [localGroupAdminId, setLocalGroupAdminId] = useState(groupAdminId);

  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  useEffect(() => {
    setLocalGroupAdminId(groupAdminId);
  }, [groupAdminId]);

  useEffect(() => {
    setEditGroupName(recipientUsername || "");
  }, [recipientUsername]);

  useEffect(() => {
    if (!chatId) return;

    const channel = pusherClient.subscribe(`chat-${chatId}`);
    
    channel.bind('chat-updated', (data: any) => {
      if (data.participants) {
        setLocalParticipants(data.participants);
      }
      if (data.groupAdmin) {
        setLocalGroupAdminId(data.groupAdmin);
      }
      if (onChatUpdated) {
        onChatUpdated(data);
      }
    });

    return () => {
      channel.unbind('chat-updated');
    };
  }, [chatId, onChatUpdated]);

  const isAdmin = currentUserId === localGroupAdminId;

  const fetchMedia = useCallback(async () => {
    if (!chatId) return;
    try {
      setLoadingMedia(true);
      const response = await apiFetch(`/api/chat/media/list?chatId=${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setSharedMedia(data);
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoadingMedia(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (isOpen && chatId) {
      fetchMedia();
    }
  }, [isOpen, chatId, fetchMedia]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
      const isMedia = lastMsg.mediaUrl && lastMsg.mediaType !== 'audio';
      const isLink = lastMsg.text && urlRegex.test(lastMsg.text);

      if (isMedia || isLink) {
        setSharedMedia(prev => {
          if (prev.some(m => m._id === lastMsg._id)) return prev;
          return [lastMsg, ...prev];
        });
      }
    }
  }, [messages]);

  const handleUpdateGroupInfo = async () => {
    if (!editGroupName.trim() || !chatId) return;
    try {
      setIsSavingGroupInfo(true);
      const res = await apiFetch(`/api/chat/${chatId}/update`, {
        method: "PATCH",
        body: JSON.stringify({ name: editGroupName }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Group info updated");
        setIsEditingGroup(false);
        if (onChatUpdated) onChatUpdated(data);
      } else {
        toast.error("Failed to update group info");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!chatId) return;

    setConfirmModal({
      isOpen: true,
      title: "Remove Participant",
      message: "Are you sure you want to remove this participant from the group?",
      confirmText: "Remove",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/chat/${chatId}/remove`, {
            method: "POST",
            body: JSON.stringify({ userId }),
          });
          if (res.ok) {
            const data = await res.json();
            toast.success("Participant removed");
            if (onChatUpdated) onChatUpdated(data.chat || data);
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to remove participant");
          }
        } catch (error) {
          console.error(error);
          toast.error("An error occurred");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleChangeAdmin = async (userId: string, username: string) => {
    if (!chatId) return;

    setConfirmModal({
      isOpen: true,
      title: "Change Group Admin",
      message: `Are you sure you want to make ${username} the new group admin? You will lose admin privileges.`,
      confirmText: "Make Admin",
      type: "info",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/chat/${chatId}/update`, {
            method: "PATCH",
            body: JSON.stringify({ groupAdmin: userId }),
          });
          if (res.ok) {
            toast.success(`${username} is now the group admin`);
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to change admin");
          }
        } catch (error) {
          console.error(error);
          toast.error("An error occurred");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleLeaveOrRemove = async (isRemoveOnly = false) => {
    if (!chatId) return;

    setConfirmModal({
      isOpen: true,
      title: isRemoveOnly ? "Remove Chat" : "Leave Group",
      message: isRemoveOnly 
        ? "This chat will be removed from your list. Your messages and media will be saved and restored if you message this user again."
        : "Are you sure you want to leave this group? You will no longer receive new messages.",
      confirmText: isRemoveOnly ? "Remove" : "Leave",
      type: "danger",
      onConfirm: async () => {
        try {
          setIsLeaving(true);
          const endpoint = isGroup ? `/api/chat/${chatId}/leave` : `/api/chats/${chatId}`;
          const method = isGroup ? "POST" : "DELETE";

          const res = await apiFetch(endpoint, {
            method,
          });
          
          if (res.ok) {
            toast.success(isRemoveOnly ? "Chat removed" : "Left group");
            window.location.href = "/chat";
          } else {
            toast.error(`Failed to ${isRemoveOnly ? "remove" : "leave"} chat`);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        } catch (error) {
          console.error(error);
          toast.error("An error occurred");
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setIsLeaving(false);
        }
      },
    });
  };

  const handleRemoveAvatar = async () => {
    if (!chatId) return;
    try {
      setIsUploadingAvatar(true);
      const res = await apiFetch(`/api/chat/${chatId}/update`, {
        method: "PATCH",
        body: JSON.stringify({ avatar: "" }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Group avatar removed");
        if (onChatUpdated) onChatUpdated(data);
      } else {
        toast.error("Failed to remove group avatar");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await apiFetch("/api/chat/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();

      const res = await apiFetch(`/api/chat/${chatId}/update`, {
        method: "PATCH",
        body: JSON.stringify({ avatar: uploadData.url }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Group avatar updated");
        if (onChatUpdated) onChatUpdated(data);
      } else {
        toast.error("Failed to update group avatar");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return {
    sharedMedia,
    loadingMedia,
    previewMediaUrl,
    setPreviewMediaUrl,
    previewMediaType,
    setPreviewMediaType,
    isEditingGroup,
    setIsEditingGroup,
    editGroupName,
    setEditGroupName,
    isSavingGroupInfo,
    isLeaving,
    showAddModal,
    setShowAddModal,
    isUploadingAvatar,
    avatarInputRef,
    confirmModal,
    setConfirmModal,
    localParticipants,
    localGroupAdminId,
    isAdmin,
    handleUpdateGroupInfo,
    handleRemoveParticipant,
    handleChangeAdmin,
    handleLeaveOrRemove,
    handleRemoveAvatar,
    handleAvatarUpload,
  };
}
