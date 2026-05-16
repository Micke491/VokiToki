'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, MoreVertical, Volume2, VolumeX, Plus, Eye, ArrowLeft, ShieldAlert } from 'lucide-react';
import ReportModal from '../ui/ReportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Story } from '../../types/chat';
import { apiFetch } from '@/lib/api';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  username: string;
  userId: string;
  userAvatar?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  currentUserId?: string;
  onAddStory?: () => void;
  onShowViewers?: (storyId: string) => void;
  onStoryViewed?: (userId: string, storyId: string) => void;
}

const PROGRESS_INTERVAL = 50;
const IMAGE_DURATION = 5000;
const VIDEO_INDICATOR_DELAY = 3000;

export default function StoryViewer({
  stories,
  initialIndex,
  username,
  userId,
  userAvatar,
  onClose,
  onIndexChange,
  currentUserId,
  onAddStory,
  onShowViewers,
  onStoryViewed,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [showVideoIndicator, setShowVideoIndicator] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.mediaType === 'video';
  const isOwner = currentUserId === userId;

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  const handleVideoTimeUpdate = () => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    setVideoCurrentTime(video.currentTime);

    if (video.duration) {
      setVideoDuration(video.duration);
      const newProgress = (video.currentTime / video.duration) * 100;
      setProgress(newProgress);

      if (video.ended || video.currentTime >= video.duration - 0.1) {
        handleNext();
      }
    }
  };

  useEffect(() => {
    const isViewed = (currentStory?.viewedBy || []).some(v => v.userId === currentUserId);
    if (currentStory && !isViewed && currentUserId && userId !== currentUserId) {
      apiFetch(`/api/stories/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ storyId: currentStory._id }),
      }).then(() => {
        onStoryViewed?.(userId, currentStory._id);
      }).catch(console.error);
    }
  }, [currentIndex, userId, stories, currentUserId, onStoryViewed]);

  useEffect(() => {
    setProgress(0);
    setVideoCurrentTime(0);
    setIsLoading(true);
    setShowVideoIndicator(false);

    if (videoIndicatorTimeoutRef.current) {
      clearTimeout(videoIndicatorTimeoutRef.current);
    }

    if (isVideo) {
      videoIndicatorTimeoutRef.current = setTimeout(() => {
        setShowVideoIndicator(true);
      }, VIDEO_INDICATOR_DELAY);
    }

    onIndexChange(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const video = videoRefs.current[currentIndex];

    if (isVideo && video) {
      video.muted = isMuted;
      
      if (isPaused) {
        video.pause();
      } else {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name === 'AbortError') {
              return;
            }
            console.error('Video play error:', err);
            setTimeout(handleNext, 1000);
          });
        }
      }
    }
  }, [currentIndex, isMuted, isPaused, isVideo, handleNext]);

  useEffect(() => {
    return () => {
      const video = videoRefs.current[currentIndex];
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    };
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused || isLoading || isVideo) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = (PROGRESS_INTERVAL / IMAGE_DURATION) * 100;
        const newProgress = prev + increment;

        if (newProgress >= 100) {
          handleNext();
          return 0;
        }
        return newProgress;
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(interval);
  }, [isPaused, isLoading, isVideo, currentIndex, handleNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);

    if (touchStartX.current === null || touchStartTime.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const duration = Date.now() - touchStartTime.current;

    if (Math.abs(diff) > 50 || duration < 300) {
      if (diff > 30) {
        handleNext();
      } else if (diff < -30) {
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartTime.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (x < halfWidth) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const handleMouseDown = () => {
    setIsPaused(true);
  };

  const handleMouseUp = () => {
    setIsPaused(false);
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center overflow-hidden"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Subtle background glow based on story content (optional, but premium) */}
        {!isLoading && (
           <div 
             className="absolute inset-0 opacity-20 blur-[100px] pointer-events-none"
             style={{
               background: `radial-gradient(circle at center, rgba(236, 72, 153, 0.4) 0%, transparent 70%)`
             }}
           />
        )}

        {/* Story Container (Always Desktop View) */}
        <div className="relative w-full max-w-lg h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center bg-black">
          
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 px-4 pt-4">
            {stories.map((_, index) => (
              <div
                key={stories[index]._id}
                className="flex-1 h-[2px] bg-white/20 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-[50ms] ease-linear"
                  style={{
                    width:
                      index < currentIndex
                        ? '100%'
                        : index === currentIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-30 pt-8 pb-16 px-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-chat-bg-secondary border border-white/10">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-chat-accent text-[10px] text-white font-bold uppercase">
                    {username.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm leading-none drop-shadow-md">{username}</span>
                <span className="text-white/70 text-[10px] drop-shadow-md mt-0.5">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReportModal(true);
                    setIsPaused(true);
                  }}
                  className="p-2 text-amber-500/90 hover:text-amber-500 transition-colors"
                  title="Report Story"
                >
                  <ShieldAlert className="w-5 h-5 shadow-sm" />
                </button>
              )}
              {isVideo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted((prev) => !prev);
                  }}
                  className="p-2 text-white/90 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 shadow-sm" /> : <Volume2 className="w-5 h-5 shadow-sm" />}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 text-white/90 hover:text-white transition-colors"
              >
                <X className="w-6 h-6 shadow-sm" />
              </button>
            </div>
          </div>

          {/* Story content */}
          <div className="w-full h-full flex items-center justify-center p-2">
            {isVideo ? (
              <video
                key={currentStory._id}
                ref={(el) => {
                  videoRefs.current[currentIndex] = el;
                }}
                src={currentStory.mediaUrl}
                className="w-full h-full object-contain"
                onLoadedData={() => setIsLoading(false)}
                onTimeUpdate={handleVideoTimeUpdate}
                onPlay={() => setIsLoading(false)}
                muted={isMuted}
                playsInline
              />
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt={currentStory.caption || 'Story'}
                className="w-full h-full object-contain"
                onLoad={() => setIsLoading(false)}
              />
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Video indication */}
            {isVideo && showVideoIndicator && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300">
                <div className="p-4 rounded-full bg-black/40 backdrop-blur-md">
                   {isMuted ? <VolumeX className="w-8 h-8 text-white" /> : <Volume2 className="w-8 h-8 text-white" />}
                </div>
              </div>
            )}

            {/* Caption & View Count */}
            {(currentStory.caption || isOwner) && (
              <div className="absolute bottom-0 left-0 right-0 px-6 py-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-30">
                <div className="flex flex-col items-center gap-4">
                  {currentStory.caption && (
                    <p className="text-white text-center text-[15px] font-medium leading-relaxed drop-shadow-md max-w-[90%]">
                      {currentStory.caption}
                    </p>
                  )}
                  
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowViewers?.(currentStory._id);
                      }}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 transition-all group active:scale-95"
                    >
                      {/* Mini Avatar Stack (Mini Views) */}
                      {currentStory.viewedBy && currentStory.viewedBy.length > 0 && (
                        <div className="flex -space-x-2 mr-1">
                          {Array.from(new Map(currentStory.viewedBy.map(v => [v.userId, v])).values())
                            .slice(0, 3)
                            .map((view: any, i) => (
                              <div 
                                key={i} 
                                className="w-5 h-5 rounded-full border-2 border-black overflow-hidden bg-chat-bg-secondary"
                              >
                                {view.user?.avatar ? (
                                  <img src={view.user.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-chat-accent text-[8px] text-white">
                                    {(view.user?.username || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                      
                      <Eye className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-white text-[14px] font-bold tracking-tight">
                         {Array.from(new Set(currentStory.viewedBy?.map(v => v.userId) || [])).length} views
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Controls (Always Desktop View) */}
        <div className="flex absolute inset-y-0 left-0 right-0 pointer-events-none items-center justify-between px-10 z-40">
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              handlePrev(); 
            }}
            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 backdrop-blur-md flex items-center justify-center pointer-events-auto transition-all group border border-white/10 shadow-xl cursor-pointer"
            title="Previous Story"
          >
            <ArrowLeft className="w-8 h-8 text-white group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              handleNext(); 
            }}
            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 backdrop-blur-md flex items-center justify-center pointer-events-auto transition-all group border border-white/10 shadow-xl cursor-pointer"
            title="Next Story"
          >
            <ArrowLeft className="w-8 h-8 text-white group-hover:translate-x-0.5 transition-transform rotate-180" />
          </button>
        </div>

        {/* Report Story Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setIsPaused(false);
          }}
          targetId={currentStory._id}
          targetType="story"
          targetName={`story by ${username}`}
        />
      </motion.div>
    </AnimatePresence>
  );
}
