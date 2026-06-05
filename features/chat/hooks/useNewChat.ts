'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

export interface User {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
}

export interface ListItem {
  type: 'header' | 'user';
  id: string;
  label?: string;
  user?: User;
}

interface UseNewChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function useNewChat({ isOpen, onClose }: UseNewChatProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  
  const [suggestedContacts, setSuggestedContacts] = useState<User[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [allSearchedUsers, setAllSearchedUsers] = useState<User[]>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoadingInitial(true);
      
      const [contactsRes, recommendedRes] = await Promise.all([
        apiFetch('/api/users/suggested-contacts'),
        apiFetch('/api/users/recommended'),
      ]);

      let contacts: User[] = [];
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        contacts = contactsData.contacts || [];
        setSuggestedContacts(contacts);
      }

      if (recommendedRes.ok) {
        const recData = await recommendedRes.json();
        const filtered = (recData.users || []).filter(
          (u: User) => !contacts.some(rc => rc._id === u._id)
        );
        setRecommendedUsers(filtered.slice(0, 30));
      }
    } catch (error) {
      console.error('Error fetching initial modal data:', error);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const resetModal = useCallback(() => {
    setSearchQuery('');
    setIsGroup(false);
    setGroupName('');
    setGroupAvatar('');
    setSelectedUsers([]);
    setSuggestedContacts([]);
    setRecommendedUsers([]);
    setAllSearchedUsers([]);
    setPage(1);
    setHasMore(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    } else {
      resetModal();
    }
  }, [isOpen, fetchInitialData, resetModal]);

  const searchUsers = useCallback(async (query: string, pageNum: number) => {
    try {
      setLoading(true);
      const response = await apiFetch(
        `/api/users/search?username=${encodeURIComponent(query)}&page=${pageNum}&pageSize=30`
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      
      if (pageNum === 1) {
        setAllSearchedUsers(data.users || []);
      } else {
        setAllSearchedUsers(prev => [...prev, ...(data.users || [])]);
      }
      
      setPage(pageNum);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setAllSearchedUsers([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery, 1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  const startChat = useCallback(async (recipientId: string) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot start new conversations without an internet connection.");
      return;
    }
    try {
      setCreating(true);
      const response = await apiFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      });

      if (!response.ok) throw new Error('Failed to create chat');

      const chat = await response.json();
      onClose();
      router.push(`/chat/${chat._id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setCreating(false);
    }
  }, [onClose, router]);

  const createGroupChat = useCallback(async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;

    if (!navigator.onLine) {
      toast.error("Offline: Cannot create group chats without an internet connection.");
      return;
    }

    try {
      setCreating(true);
      const payload: any = {
        name: groupName,
        participants: selectedUsers.map(u => u._id)
      };

      if (groupAvatar) {
        payload.avatar = groupAvatar;
      }

      const response = await apiFetch('/api/chats/GroupChat', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create group chat');

      const chat = await response.json();
      onClose();
      router.push(`/chat/${chat._id}`);
    } catch (error) {
      console.error('Error creating group chat:', error);
      toast.error('Failed to create group chat');
    } finally {
      setCreating(false);
    }
  }, [groupName, selectedUsers, groupAvatar, onClose, router]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await apiFetch("/api/chat/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      setGroupAvatar(uploadData.url);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const toggleUserSelection = useCallback((user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      return isSelected 
        ? prev.filter(u => u._id !== user._id)
        : [...prev, user];
    });
  }, []);

  const removeSelectedUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  }, []);

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    
    if (searchQuery.trim().length >= 1) {
      allSearchedUsers.forEach(u => {
        items.push({ type: 'user', id: u._id, user: u });
      });
    } else {
      if (suggestedContacts.length > 0) {
        items.push({ type: 'header', id: 'h-suggested', label: 'Suggested Contacts' });
        suggestedContacts.forEach(u => {
          items.push({ type: 'user', id: `s-${u._id}`, user: u });
        });
      }
      
      if (recommendedUsers.length > 0) {
        items.push({ type: 'header', id: 'h-recommended', label: 'Explore / Discover' });
        recommendedUsers.forEach(u => {
          items.push({ type: 'user', id: `r-${u._id}`, user: u });
        });
      }
    }
    
    return items;
  }, [searchQuery, allSearchedUsers, suggestedContacts, recommendedUsers]);

  const virtualScrollData = useMemo(() => ({
    items: listItems,
    isGroup,
    selectedUsers,
    onToggle: toggleUserSelection,
    onCreate: startChat,
    creating
  }), [listItems, isGroup, selectedUsers, toggleUserSelection, startChat, creating]);

  return {
    searchQuery,
    setSearchQuery,
    loading,
    creating,
    isGroup,
    setIsGroup,
    groupName,
    setGroupName,
    groupAvatar,
    setGroupAvatar,
    uploadingAvatar,
    selectedUsers,
    suggestedContacts,
    recommendedUsers,
    loadingInitial,
    page,
    hasMore,
    allSearchedUsers,
    avatarInputRef,
    listItems,
    virtualScrollData,
    searchUsers,
    startChat,
    createGroupChat,
    handleAvatarUpload,
    toggleUserSelection,
    removeSelectedUser,
    resetModal,
  };
}
