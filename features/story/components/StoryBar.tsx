'use client';

import React, { useRef, useState } from 'react';
import StoryRing from '@/features/story/components/StoryRing';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Story, StoryUser } from '@/features/story/types/story';
import { apiFetch } from '@/lib/api';

interface StoryBarProps {
  currentUserId: string;
  currentUserAvatar?: string;
  currentUserUsername: string;
  stories: StoryUser[];
  hasUnviewedStories: (storyUser: StoryUser) => boolean;
  onStoryClick: (userId: string, stories: Story[], username: string, avatar?: string) => void;
  onMyStoryClick: () => void;
  onStoryUploaded: () => void; 
}

export default function StoryBar({
  currentUserId,
  currentUserAvatar,
  currentUserUsername,
  stories,
  hasUnviewedStories,
  onStoryClick,
  onMyStoryClick,
  onStoryUploaded,
}: StoryBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const myStories = stories.find(su => su.user._id === currentUserId)?.stories || [];
  const otherStories = stories.filter(su => su.user._id !== currentUserId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!navigator.onLine) {
      toast.error("Offline: Cannot publish stories without an internet connection.");
      return;
    }

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

      const uploadRes = await apiFetch(`/api/stories`, {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        toast.success('Story posted!');
        onStoryUploaded(); // notify parent to refresh its own stories state
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

  return (
    <div className="h-auto min-h-[90px] border-b border-chat-border px-4 py-3 flex items-center gap-3 overflow-x-auto custom-scrollbar">
      {/* My Story Circle */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="relative group">
          <button
            onClick={() => {
              if (myStories.length > 0) {
                onMyStoryClick();
              } else {
                fileInputRef.current?.click();
              }
            }}
            disabled={uploading}
            className={`relative rounded-full transition-all duration-300 active:scale-95 ${
              myStories.length > 0 ? 'hover:scale-105' : 'hover:opacity-80'
            }`}
            type="button"
          >
            {/* The Ring for My Story */}
            <div className={`rounded-full shadow-sm ${
              myStories.length > 0 
                ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]' 
                : 'bg-chat-border p-[1.5px]'
            } w-14 h-14 md:w-16 md:h-16`}>
              <div className="w-full h-full rounded-full bg-chat-bg-primary p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-chat-bg-secondary relative">
                  {uploading ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : null}
                  
                  {currentUserAvatar ? (
                    <img
                      src={currentUserAvatar}
                      alt={currentUserUsername}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${uploading ? 'blur-[1px]' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-chat-accent/20 to-chat-accent-secondary/20 text-chat-accent font-bold uppercase text-[10px]">
                      {currentUserUsername.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
 
            {/* Plus indicator */}
            {!uploading && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="absolute bottom-0 right-0 w-4.5 h-4.5 md:w-5 md:h-5 bg-chat-accent rounded-full flex items-center justify-center border-2 border-chat-bg-primary hover:scale-110 transition-transform shadow-lg z-20 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        </div>
        <span className="text-[10px] md:text-xs font-medium text-chat-text-secondary">
          {uploading ? 'Uploading...' : 'My Story'}
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
      {otherStories.map((storyUser) => (
        <StoryRing
          key={storyUser.user._id}
          username={storyUser.user.username}
          avatarUrl={storyUser.user.avatar}
          hasStory={true}
          hasUnviewedStory={hasUnviewedStories(storyUser)}
          onClick={() => onStoryClick(storyUser.user._id, storyUser.stories, storyUser.user.username, storyUser.user.avatar)}
        />
      ))}
    </div>
  );
}
