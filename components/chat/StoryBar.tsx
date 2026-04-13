'use client';

import React, { useEffect, useState } from 'react';
import StoryRing from './StoryRing';
import { Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { Story, StoryUser } from '../../types/chat';

interface StoryBarProps {
  currentUserId: string;
  currentUserAvatar?: string;
  currentUserUsername: string;
  onStoryClick: (userId: string, stories: Story[], username: string, avatar?: string) => void;
  onMyStoryClick: () => void;
  refreshKey?: number;
}

export default function StoryBar({
  currentUserId,
  currentUserAvatar,
  currentUserUsername,
  onStoryClick,
  onMyStoryClick,
  refreshKey = 0,
}: StoryBarProps) {
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStories();
  }, [refreshKey]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stories', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Only images and videos are allowed');
      return;
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size exceeds ${isVideo ? '50MB' : '10MB'} limit`);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (uploadRes.ok) {
        toast.success('Story posted!');
        fetchStories();
        onMyStoryClick();
      } else {
        const error = await uploadRes.json();
        toast.error(error.error || 'Failed to upload story');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload story');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const hasUnviewedStories = (storyUser: StoryUser) => {
    return storyUser.stories.some((s) => !s.viewed);
  };

  if (loading) {
    return (
      <div className="h-24 border-b border-chat-border px-4 flex items-center gap-3 overflow-x-auto">
        <div className="w-14 h-14 rounded-full bg-chat-border animate-pulse" />
        <div className="w-14 h-14 rounded-full bg-chat-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-auto min-h-[100px] border-b border-chat-border px-4 py-3 flex items-center gap-3 overflow-x-auto custom-scrollbar">
      {/* My Story - Add Story Button */}
      <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`relative rounded-full p-[2px] bg-chat-border transition-transform group-hover:scale-105 disabled:opacity-50`}
            type="button"
          >
            <div className="w-[52px] h-[52px] rounded-full bg-chat-bg-primary p-[2px]">
              {uploading ? (
                <div className="w-full h-full rounded-full bg-chat-accent/20 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-chat-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : currentUserAvatar ? (
                <img
                  src={currentUserAvatar}
                  alt={currentUserUsername}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center text-white font-bold">
                  {currentUserUsername.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </button>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-chat-accent rounded-full flex items-center justify-center border-2 border-chat-bg-primary">
            <Camera className="w-3 h-3 text-white" />
          </div>
        </div>
        <span className="text-xs font-medium text-chat-text-secondary">
          {uploading ? 'Uploading...' : 'Add'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Other Users' Stories */}
      {stories.map((storyUser) => (
        <StoryRing
          key={storyUser.user._id}
          username={storyUser.user.username}
          avatarUrl={storyUser.user.avatar}
          hasUnviewedStory={hasUnviewedStories(storyUser)}
          onClick={() => onStoryClick(storyUser.user._id, storyUser.stories, storyUser.user.username, storyUser.user.avatar)}
        />
      ))}
    </div>
  );
}
