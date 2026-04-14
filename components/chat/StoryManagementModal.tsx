'use client';

import React, { useState } from 'react';
import { X, Trash2, Eye, Clock, Image as ImageIcon, Video, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Story {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  viewedBy?: { userId: string; viewedAt: string }[];
  createdAt: string;
  expiresAt: string;
}

interface StoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  onDeleteStory: (storyId: string) => Promise<void>;
  onAddStory: () => void;
  uploading: boolean;
}

export default function StoryManagementModal({
  isOpen,
  onClose,
  stories,
  onDeleteStory,
  onAddStory,
  uploading,
}: StoryManagementModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (storyId: string) => {
    setDeletingId(storyId);
    try {
      await onDeleteStory(storyId);
    } finally {
      setDeletingId(null);
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

  const formatViewCount = (viewedBy?: { userId: string; viewedAt: string }[]) => {
    if (!viewedBy) return 0;
    return viewedBy.length;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-chat-glass backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-chat-border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-chat-border/50">
            <div>
              <h2 className="text-2xl font-black text-chat-text-primary">My Stories</h2>
              <p className="text-chat-text-tertiary text-sm mt-1">
                Manage your active stories
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onAddStory}
                disabled={uploading}
                className="px-4 py-2 bg-chat-accent text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-chat-accent/20 disabled:opacity-50 hover:scale-105"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-chat-bg-secondary hover:bg-chat-hover border border-chat-border rounded-xl text-chat-text-primary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {stories.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-chat-text-tertiary">
                <div className="w-20 h-20 rounded-3xl bg-chat-bg-secondary border border-chat-border flex items-center justify-center mb-4">
                  <ImageIcon className="w-10 h-10 opacity-30" />
                </div>
                <p className="font-semibold text-chat-text-secondary">No active stories</p>
                <p className="text-sm mt-1 max-w-xs">
                  Share a moment with your contacts! Stories disappear after 24 hours.
                </p>
                <button
                  onClick={onAddStory}
                  disabled={uploading}
                  className="mt-6 px-6 py-3 bg-chat-accent text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-chat-accent/20 disabled:opacity-50 hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Story
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {stories.map((story) => (
                  <motion.div
                    key={story._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-chat-bg-secondary border border-chat-border"
                  >
                    {story.mediaType === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-chat-bg-primary">
                        <video
                          src={story.mediaUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      </div>
                    ) : (
                      <img
                        src={story.mediaUrl}
                        alt={story.caption || 'Story'}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Video indicator */}
                    {story.mediaType === 'video' && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-bold uppercase flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        Video
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      {/* Actions */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <Eye className="w-3 h-3" />
                            {formatViewCount(story.viewedBy)}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-white/80 bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <Clock className="w-3 h-3" />
                            {formatTimeRemaining(story.expiresAt)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(story._id)}
                          disabled={deletingId === story._id}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50"
                        >
                          {deletingId === story._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Caption */}
                      {story.caption && (
                        <p className="text-[11px] text-white/90 line-clamp-2 leading-tight drop-shadow-md">
                          {story.caption}
                        </p>
                      )}
                    </div>

                    {/* Always visible view count on mobile */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm sm:hidden">
                      <Eye className="w-3 h-3" />
                      {formatViewCount(story.viewedBy)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-chat-border/50 bg-chat-bg-secondary/50">
            <p className="text-xs text-chat-text-tertiary text-center">
              Stories automatically disappear after 24 hours
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
