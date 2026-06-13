'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthToken } from '@/lib/storage';
import { pusherClient } from '@/lib/pusher-client';
import { User } from '@/hooks/useChatSession';

export interface Chat {
  _id: string;
  name?: string;
  isGroupChat?: boolean;
  avatar?: string;
  participants: User[];
  groupAdmin?: string;
  status?: string;
  initiatorId?: string;
}

export function useChatDetails(chatId: string | undefined, currentUser: User | null) {
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchChatDetails = async (id: string) => {
    if (!id || id === "[chatId]") return;
    try {
      setLoading(true);
      const response = await apiFetch(`/api/chat/${id}`);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatId) {
      fetchChatDetails(chatId);
    } else {
      setSelectedChat(null);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId || chatId === "[chatId]") return;
    const token = getAuthToken();
    if (!token) return;

    const channel = pusherClient.subscribe(`chat-${chatId}`);

    channel.bind('chat-updated', (updatedChat: Chat) => {
      setSelectedChat(updatedChat);
    });

    return () => {
      channel.unbind('chat-updated');
      pusherClient.unsubscribe(`chat-${chatId}`);
    };
  }, [chatId]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = pusherClient.subscribe(`user-${currentUser._id}`);

    channel.bind("profile-updated", (data: { userId: string, username: string, avatar?: string }) => {
      setSelectedChat(prev => {
        if (!prev || prev.isGroupChat) return prev;
        const isParticipant = prev.participants.some(p => p._id === data.userId);
        if (!isParticipant) return prev;

        return {
          ...prev,
          participants: prev.participants.map(p =>
            p._id === data.userId
              ? { ...p, username: data.username, avatar: data.avatar }
              : p
          )
        };
      });
    });

    return () => {
      channel.unbind("profile-updated");
    };
  }, [currentUser]);

  const handleChatUpdated = (updatedChat: Chat) => {
    setSelectedChat(updatedChat);
  };

  const chatMetadata = useMemo(() => {
    if (!selectedChat || !currentUser) return { name: '', avatar: undefined, isGroup: false };

    if (selectedChat.isGroupChat) {
      return {
        name: selectedChat.name || 'Group Chat',
        avatar: selectedChat.avatar,
        isGroup: true
      };
    }

    const participants = selectedChat.participants || [];
    const otherMember = participants.find((p) => p._id !== currentUser._id);
    return {
      name: otherMember?.username || 'Unknown User',
      avatar: otherMember?.avatar,
      isGroup: false
    };
  }, [selectedChat, currentUser]);

  return {
    selectedChat,
    setSelectedChat,
    chatMetadata,
    handleChatUpdated,
    loading,
    refetchChatDetails: () => chatId && fetchChatDetails(chatId),
  };
}
