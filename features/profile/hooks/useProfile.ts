'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from "@/lib/api";
import { useStories } from '@/features/story/hooks/useStories';
import { Story } from '@/features/story/types/story';

export interface User {
  _id: string;
  username: string;
  email: string;
  name?: string;
  bio?: string;
  avatar?: string;
  links?: { label: string; url: string }[];
  location?: string;
  gender?: string;
  readReceipts: boolean;
  theme: 'light' | 'dark' | 'system';
}

export function useProfile() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  const { 
    stories: allStories, 
    loading: storiesLoading, 
    markStoryAsViewed, 
    hasUnviewedStories 
  } = useStories(currentUser);

  const myStoryUser = allStories.find(su => su.user._id === currentUser?._id);
  const userHasStories = (myStoryUser?.stories.length || 0) > 0;

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiFetch(`/api/profile`);
      if (!response.ok) throw new Error('Not authenticated');
      const data = await response.json();

      setCurrentUser(data.user);
      setStories(data.stories || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.push('/auth-pages/login');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await apiFetch(`/api/users/profile/upload`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) throw new Error('Failed to upload image');
      const uploadData = await response.json();
      const avatarUrl = uploadData.url;

      const saveResponse = await apiFetch(`/api/profile`, {
        method: 'PATCH',
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (!saveResponse.ok) throw new Error('Failed to save profile picture');

      setCurrentUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : null));
      setFeedback({ type: 'success', message: 'Avatar updated successfully!' });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setFeedback({ type: 'error', message: error.message || 'Failed to upload.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStoryFromModal = async (storyId: string) => {
    try {
      const response = await apiFetch(`/api/profile?storyId=${storyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setStories((prev) => prev.filter((s) => s._id !== storyId));
        setFeedback({ type: 'success', message: 'Story deleted' });
      } else {
        const data = await response.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to delete story' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete story' });
    }
  };

  const handleAddStory = () => {
    storyInputRef.current?.click();
  };

  const handleStoryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setFeedback({ type: 'error', message: 'Only images and videos are allowed' });
      return;
    }

    setUploading(true);
    const formDataStory = new FormData();
    formDataStory.append('file', file);

    try {
      const response = await apiFetch(`/api/stories`, {
        method: 'POST',
        body: formDataStory,
      });

      if (response.ok) {
        const data = await response.json();
        setStories((prev) => [data.story, ...prev]);
        setFeedback({ type: 'success', message: 'Story posted!' });
      } else {
        const data = await response.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to upload story' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to upload story' });
    } finally {
      setUploading(false);
      if (storyInputRef.current) {
        storyInputRef.current.value = '';
      }
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  return {
    router,
    currentUser,
    stories,
    loading,
    uploading,
    showSidebarDrawer,
    setShowSidebarDrawer,
    feedback,
    setFeedback,
    showStoryModal,
    setShowStoryModal,
    isViewerOpen,
    setIsViewerOpen,
    viewerInitialIndex,
    setViewerInitialIndex,
    avatarInputRef,
    storyInputRef,
    myStoryUser,
    userHasStories,
    hasUnviewedStories,
    handleAvatarUpload,
    handleDeleteStoryFromModal,
    handleAddStory,
    handleStoryFileSelect,
    formatTimeRemaining,
  };
}
