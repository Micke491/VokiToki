'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/storage';
import { pusherClient } from '@/lib/pusher-client';
import { apiFetch } from '@/lib/api';

export interface ChatParticipant {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface LastMessage {
  _id: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'call';
  sender?: {
    _id: string;
    username: string;
  };
  createdAt: string;
  isSystemMessage?: boolean;
  storyId?: string;
  storyMediaUrl?: string;
  isDeletedForEveryone?: boolean;
}

export interface ChatListItem {
  _id: string;
  name?: string;
  isGroupChat?: boolean;
  avatar?: string;
  participants: ChatParticipant[];
  lastMessage?: LastMessage;
  updatedAt: string;
  unreadCount?: number;
}

export function useChatList(currentUserId: string | undefined, selectedChatId: string | undefined) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [blockConfirm, setBlockConfirm] = useState<{ chatId: string; userId: string; username: string } | null>(null);
  const [reportData, setReportData] = useState<{ userId: string; username: string } | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [requests, setRequests] = useState<ChatListItem[]>([]);
  const [followRequests, setFollowRequests] = useState<any[]>([]);

  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await apiFetch('/api/chats/requests', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (err) {}
  }, []);

  const fetchFollowRequests = useCallback(async () => {
    try {
      const response = await apiFetch('/api/users/requests', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setFollowRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching follow requests:', err);
    }
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/chats', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const data = await response.json();
      const processedData = data.map((c: ChatListItem) => 
        c._id === selectedChatIdRef.current ? { ...c, unreadCount: 0 } : c
      );
      setChats(processedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    fetchRequests();
    fetchFollowRequests();
  }, [fetchChats, fetchRequests, fetchFollowRequests]);

  const handleAcceptRequest = async (chatId: string) => {
    await apiFetch(`/api/chats/${chatId}/accept`, { method: 'POST' });
    fetchChats();
    fetchRequests();
    if (selectedChatId === chatId) {
        window.dispatchEvent(new CustomEvent('chat-status-updated', { detail: { chatId, status: 'accepted' } }));
    }
  };

  const handleRejectRequest = async (chatId: string) => {
    await apiFetch(`/api/chats/${chatId}/reject`, { method: 'POST' });
    fetchRequests();
    if (selectedChatId === chatId) {
        router.push('/chat');
    }
  };

  const handleAcceptFollow = async (id: string) => {
    try {
      const res = await apiFetch(`/api/users/requests/${id}/accept`, { method: 'POST' });
      if (res.ok) {
        setFollowRequests(prev => prev.filter(r => r._id !== id));
        window.dispatchEvent(new CustomEvent('user-follow-updated'));
        fetchChats();
      }
    } catch (err) {
      console.error('Error accepting follow request:', err);
    }
  };

  const handleRejectFollow = async (id: string) => {
    try {
      const res = await apiFetch(`/api/users/requests/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        setFollowRequests(prev => prev.filter(r => r._id !== id));
        window.dispatchEvent(new CustomEvent('user-follow-updated'));
      }
    } catch (err) {
      console.error('Error rejecting follow request:', err);
    }
  };

  const handleFollowUser = async (userId: string) => {
    try {
      const res = await apiFetch(`/api/users/${userId}/follow`, { method: 'POST' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('user-follow-updated'));
      }
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const handleUnfollowUser = async (userId: string) => {
    try {
      const res = await apiFetch(`/api/users/${userId}/unfollow`, { method: 'POST' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('user-follow-updated'));
      }
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  };

  useEffect(() => {
    if (chats.length === 0) return;
    const initialDrafts: Record<string, string> = {};
    chats.forEach(chat => {
      const saved = localStorage.getItem(`chat-draft-${chat._id}`);
      if (saved && saved.trim()) {
        initialDrafts[chat._id] = saved.trim();
      }
    });
    setDrafts(initialDrafts);
  }, [chats]);

  useEffect(() => {
    const handleDraftUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.chatId) {
        setDrafts(prev => {
          const next = { ...prev };
          if (detail.text) {
            next[detail.chatId] = detail.text;
          } else {
            delete next[detail.chatId];
          }
          return next;
        });
      }
    };

    window.addEventListener("local-draft-updated", handleDraftUpdate);
    return () => {
      window.removeEventListener("local-draft-updated", handleDraftUpdate);
    };
  }, []);

  // Real-time Pusher Event Bindings
  useEffect(() => {
    const token = getAuthToken();
    if (!token || !currentUserId) return;

    const channel = pusherClient.subscribe(`user-${currentUserId}`);

    const onChatUpdate = (data: { 
      chatId: string, 
      lastMessage?: any, 
      unreadCount?: number, 
      name?: string, 
      avatar?: string, 
      participants?: ChatParticipant[] 
    }) => {
      setChats(prevChats => {
        const existingChatIndex = prevChats.findIndex(c => c._id === data.chatId);
        if (existingChatIndex === -1) {
          fetchChats();
          return prevChats;
        }

        const existingChat = prevChats[existingChatIndex];
        const isCurrentChat = data.chatId === selectedChatIdRef.current;
        const amISender = data.lastMessage?.sender?._id === currentUserId || data.lastMessage?.sender === currentUserId;

        let newUnreadCount = existingChat.unreadCount || 0;

        if (isCurrentChat || amISender) {
          newUnreadCount = 0;
        } else if (data.unreadCount !== undefined) {
          newUnreadCount = data.unreadCount;
        } else if (data.lastMessage) {
          newUnreadCount += 1;
        }

        const updatedChat: ChatListItem = {
          ...existingChat,
          updatedAt: new Date().toISOString(),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.participants !== undefined && { participants: data.participants }),
          lastMessage: data.lastMessage ? {
            _id: data.lastMessage._id,
            text: data.lastMessage.text,
            mediaUrl: data.lastMessage.mediaUrl,
            mediaType: data.lastMessage.mediaType,
            sender: data.lastMessage.sender,
            createdAt: data.lastMessage.createdAt,
            isSystemMessage: data.lastMessage.isSystemMessage,
            storyId: data.lastMessage.storyId,
            storyMediaUrl: data.lastMessage.storyMediaUrl,
            isDeletedForEveryone: data.lastMessage.isDeletedForEveryone
          } : existingChat.lastMessage,
          unreadCount: newUnreadCount
        };

        const otherChats = prevChats.filter((_, index) => index !== existingChatIndex);

        const shouldMoveToTop = !existingChat.lastMessage ||
          (data.lastMessage && new Date(data.lastMessage.createdAt) > new Date(existingChat.lastMessage.createdAt));

        if (!isCurrentChat && !amISender && data.lastMessage?._id) {
          apiFetch(`/api/chat/message/messages/${data.lastMessage._id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ chatId: data.chatId, messageIds: [data.lastMessage._id], status: "delivered" }),
          }).catch(err => console.error("Error marking as delivered:", err));
        }

        if (shouldMoveToTop) {
          return [updatedChat, ...otherChats];
        } else {
          const newChats = [...prevChats];
          newChats[existingChatIndex] = updatedChat;
          return newChats;
        }
      });
    };

    const onChatRemoved = (data: { chatId: string }) => {
      setChats(prevChats => prevChats.filter(c => c._id !== data.chatId));
      if (data.chatId === selectedChatIdRef.current) {
        router.push('/chat');
      }
    };

    const onChatNew = (newChat: ChatListItem) => {
      setChats(prevChats => {
        if (prevChats.some(c => c._id === newChat._id)) return prevChats;
        return [newChat, ...prevChats];
      });
    };

    const onProfileUpdate = (data: { userId: string, username: string, avatar?: string }) => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.isGroupChat) return chat;
        const isParticipant = chat.participants.some(p => p._id === data.userId);
        if (!isParticipant) return chat;

        return {
          ...chat,
          participants: chat.participants.map(p => 
            p._id === data.userId 
              ? { ...p, username: data.username, avatar: data.avatar }
              : p
          )
        };
      }));
    };

    const onFollowRequestReceived = () => {
      fetchFollowRequests();
      window.dispatchEvent(new CustomEvent('user-follow-updated'));
    };

    const onFollowUpdated = () => {
      fetchChats();
      fetchFollowRequests();
      window.dispatchEvent(new CustomEvent('user-follow-updated'));
    };

    channel.bind('chat-update', onChatUpdate);
    channel.bind('chat-removed', onChatRemoved);
    channel.bind('chat-new', onChatNew);
    channel.bind('profile-updated', onProfileUpdate);
    channel.bind('follow-request-received', onFollowRequestReceived);
    channel.bind('follow-updated', onFollowUpdated);

    return () => {
      channel.unbind('chat-update', onChatUpdate);
      channel.unbind('chat-removed', onChatRemoved);
      channel.unbind('chat-new', onChatNew);
      channel.unbind('profile-updated', onProfileUpdate);
      channel.unbind('follow-request-received', onFollowRequestReceived);
      channel.unbind('follow-updated', onFollowUpdated);
    };
  }, [currentUserId, fetchChats, router]);

  // Window custom events
  useEffect(() => {
    const handleLocalMessageUpdated = (e: Event) => {
      const updatedMessage = (e as CustomEvent).detail;
      if (!updatedMessage) return;

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.lastMessage && String(chat.lastMessage._id) === String(updatedMessage._id)) {
            return {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                text: updatedMessage.text,
                mediaUrl: updatedMessage.mediaUrl,
                mediaType: updatedMessage.mediaType,
                isDeletedForEveryone: updatedMessage.isDeletedForEveryone,
              },
            };
          }
          return chat;
        })
      );
    };

    window.addEventListener("local-message-updated", handleLocalMessageUpdated);
    return () => {
      window.removeEventListener("local-message-updated", handleLocalMessageUpdated);
    };
  }, []);

  const handleRemoveChat = async (chatId: string) => {
    setOpenMenuId(null);
    try {
      const response = await apiFetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (selectedChatId === chatId) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error removing chat:', error);
    }
  };

  const handleLeaveGroup = async (chatId: string) => {
    setOpenMenuId(null);
    try {
      const response = await apiFetch(`/api/chat/${chatId}/leave`, {
        method: 'POST',
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (selectedChatId === chatId) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleBlockUser = async (targetUserId: string, chatId: string) => {
    setBlocking(true);
    try {
      const response = await apiFetch(`/api/users/block`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (selectedChatId === chatId) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    } finally {
      setBlocking(false);
      setBlockConfirm(null);
    }
  };

  const handleChatClick = (chatId: string, onChatSelect?: (chatId: string) => void) => {
    setChats(prev => prev.map(c =>
      c._id === chatId ? { ...c, unreadCount: 0 } : c
    ));

    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  const getOtherParticipant = useCallback((chat: ChatListItem) => {
    const other = chat.participants.find(p => p._id !== currentUserId);
    return other || { _id: '', username: 'Unknown', avatar: '' };
  }, [currentUserId]);

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      if (!searchQuery) return true;
      const otherUser = getOtherParticipant(chat);
      const chatName = chat.isGroupChat ? chat.name : (otherUser?.username || 'Unknown');
      return chatName?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, getOtherParticipant]);

  return {
    chats,
    setChats,
    filteredChats,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    openMenuId,
    setOpenMenuId,
    blockConfirm,
    setBlockConfirm,
    reportData,
    setReportData,
    blocking,
    fetchChats,
    handleRemoveChat,
    handleLeaveGroup,
    handleBlockUser,
    handleChatClick,
    getOtherParticipant,
    drafts,
    requests,
    activeTab,
    setActiveTab,
    handleAcceptRequest,
    handleRejectRequest,
    followRequests,
    handleAcceptFollow,
    handleRejectFollow,
    handleFollowUser,
    handleUnfollowUser,
  };
}
