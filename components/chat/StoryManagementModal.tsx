'use client';

import React, { useState, useEffect } from 'react';
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
  onViewStory?: (storyId: string) => void;
}

export default function StoryManagementModal({
  isOpen,
  onClose,
  stories,
  onDeleteStory,
  onAddStory,
  uploading,
  onViewStory,
}: StoryManagementModalProps) {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (stories.length > 0 && !selectedStoryId) {
      setSelectedStoryId(stories[0]._id);
    }
  }, [stories, selectedStoryId]);

  const handleDelete = async (storyId: string) => {
    try {
      setDeletingId(storyId);
      await onDeleteStory(storyId);
      if (selectedStoryId === storyId) {
        const remaining = stories.filter(s => s._id !== storyId);
        setSelectedStoryId(remaining.length > 0 ? remaining[0]._id : null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const formatViewCount = (viewedBy?: { userId: string; viewedAt: string }[]) => {
    if (!viewedBy) return 0;
    // Count unique user IDs
    const uniqueIds = new Set(viewedBy.map(v => v.userId));
    return uniqueIds.size;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4 md:p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-chat-bg-primary/90 backdrop-blur-2xl rounded-[var(--radius-lg)] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-4xl h-[92vh] md:h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-8 border-b border-white/5">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">My Stories</h2>
              <p className="text-gray-400 text-xs md:text-sm mt-1 font-medium">
                Manage your active moments and see who's watching
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={onAddStory}
                disabled={uploading}
                className="px-4 md:px-6 py-2 md:py-3 bg-white text-black hover:bg-gray-200 active:scale-95 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 shadow-xl disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Post New</span>
                <span className="sm:hidden">Post</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 md:p-3 bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 rounded-xl md:rounded-2xl text-white transition-all shadow-lg"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Grid of Stories */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              {stories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 md:py-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-white/20" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">No active stories</h3>
                  <p className="text-gray-400 max-w-xs mx-auto text-xs md:text-sm leading-relaxed mb-8">
                    Share a moment with your contacts! Stories disappear after 24 hours.
                  </p>
                  <button
                    onClick={onAddStory}
                    disabled={uploading}
                    className="px-6 md:px-8 py-3 md:py-4 bg-chat-accent text-white rounded-xl md:rounded-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-chat-accent/40"
                  >
                    Post Your First Story
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
                  {stories.map((story) => (
                    <motion.div
                      key={story._id}
                      layoutId={story._id}
                      onClick={() => {
                        setSelectedStoryId(story._id);
                        onViewStory?.(story._id);
                      }}
                      className={`relative group aspect-[9/16] rounded-3xl overflow-hidden bg-black border-2 transition-all cursor-pointer ${
                        selectedStoryId === story._id ? 'border-chat-accent ring-4 ring-chat-accent/20' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      {story.mediaType === 'video' ? (
                        <video
                          src={story.mediaUrl}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-10 transition-opacity"
                        />
                      ) : (
                        <img
                          src={story.mediaUrl}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-10 transition-opacity"
                          alt=""
                        />
                      )}

                      {/* Video Indicator */}
                      {story.mediaType === 'video' && (
                        <div className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-xl">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1.5">
                             <div className="flex items-center gap-2">
                                {/* Mini Avatar Stack */}
                                {story.viewedBy && story.viewedBy.length > 0 && (
                                  <div className="flex -space-x-1.5">
                                    {Array.from(new Map(story.viewedBy.map((v: any) => [v.userId, v])).values())
                                      .slice(0, 2)
                                      .map((view: any, i) => (
                                        <div key={i} className="w-4 h-4 rounded-full border border-black overflow-hidden bg-chat-bg-secondary">
                                          {view.user?.avatar ? (
                                            <img src={view.user.avatar} className="w-full h-full object-cover" alt="" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-chat-accent text-[6px] text-white">
                                              {(view.user?.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs md:text-sm font-bold text-white">
                                  <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                  {formatViewCount(story.viewedBy)}
                                </div>
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-gray-300 whitespace-nowrap">
                                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                {formatTimeRemaining(story.expiresAt)}
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(story._id);
                              }}
                              disabled={deletingId === story._id}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                            >
                              {deletingId === story._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Viewers Panel */}
            {stories.length > 0 && (
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/5 bg-white/[0.01] flex flex-col">
                <div className="p-4 md:p-6 border-b border-white/5 text-center md:text-left">
                  <h3 className="font-bold text-white flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-chat-accent" />
                    Story Views
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
                  {!selectedStoryId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-40 py-10">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Eye className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <p className="text-[10px] md:text-xs font-semibold uppercase tracking-tight">Select a story to<br/>see who's watched</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(() => {
                        const story = stories.find(s => s._id === selectedStoryId);
                        if (!story?.viewedBy?.length) {
                          return (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-40 py-10">
                              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-tight">No views yet</p>
                            </div>
                          );
                        }

                        // Deduplicate viewers by userId
                        const uniqueViewers = Array.from(
                          new Map(
                            story.viewedBy.map((view: any) => [view.userId, view])
                          ).values()
                        ).sort((a: any, b: any) => 
                          new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
                        );

                        return uniqueViewers.map((view: any, idx) => (
                           <div key={idx} className="flex items-center justify-between p-2 md:p-3 rounded-xl md:rounded-2xl hover:bg-white/5 transition-colors group">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-chat-accent/20 to-chat-accent-secondary/20 flex items-center justify-center border border-white/10 overflow-hidden">
                                    {view.user?.avatar ? (
                                      <img src={view.user.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <span className="text-chat-accent font-black text-[10px] md:text-xs">
                                        {(view.user?.username || 'U').charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                 </div>
                                 <div className="flex flex-col text-left">
                                    <span className="text-xs md:text-sm font-bold text-white group-hover:text-chat-accent transition-colors">
                                      {view.user?.username || 'Anonymous User'}
                                    </span>
                                    <span className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                       {new Date(view.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 md:p-6 border-t border-white/5 bg-black/20 flex justify-center items-center px-8">
            <span className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] opacity-60">
              Stories expire automatically after 24 hours
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

