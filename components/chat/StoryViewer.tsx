'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Story } from '../../types/chat';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  username: string;
  userId: string;
  userAvatar?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
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
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [showVideoIndicator, setShowVideoIndicator] = useState(false);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.mediaType === 'video';

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
    if (currentStory && !currentStory.viewed) {
      fetch(`/api/stories/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ storyId: currentStory._id }),
      }).catch(console.error);
    }
  }, [currentIndex, userId, stories]);

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-3">
          {stories.map((_, index) => (
            <div
              key={stories[index]._id}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-white"
                initial={{ width: index < currentIndex ? '100%' : '0%' }}
                animate={{
                  width:
                    index < currentIndex
                      ? '100%'
                      : index === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-white font-semibold text-sm">{username}</span>
            <span className="text-white/60 text-xs">
              {new Date(currentStory.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isVideo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Add more options menu
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story content */}
        <div className="relative w-full h-full flex items-center justify-center">
          {isVideo ? (
            <video
              key={currentStory._id}
              ref={(el) => {
                videoRefs.current[currentIndex] = el;
              }}
              src={currentStory.mediaUrl}
              className="max-w-full max-h-full object-contain"
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
              className="max-w-full max-h-full object-contain"
              onLoad={() => setIsLoading(false)}
            />
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Video indicator */}
          {isVideo && showVideoIndicator && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-white" />
              <span className="text-white text-sm">Tap to unmute</span>
            </div>
          )}

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-center text-sm max-w-md mx-auto">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {/* Navigation hints */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-10" />
        <div className="absolute inset-y-0 right-0 w-1/3 z-10" />
      </motion.div>
    </AnimatePresence>
  );
}
