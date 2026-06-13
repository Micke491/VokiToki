'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Volume2, VolumeX, Eye, ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';
import ReportModal from '@/components/ui/ReportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Story } from '@/features/story/types/story';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

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
const QUICK_REACTIONS = ['😂', '😮', '😢', '😍', '👏', '🔥'];

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
  
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showSentCheck, setShowSentCheck] = useState(false);
  const [activeFlyingEmojis, setActiveFlyingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videoIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const reactionIdCounter = useRef(0);

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

  const triggerFlyingEmoji = (emoji: string) => {
    const id = reactionIdCounter.current++;
    const x = Math.floor(Math.random() * 120) - 60;
    setActiveFlyingEmojis((prev) => [...prev, { id, emoji, x }]);
    
    setTimeout(() => {
      setActiveFlyingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2000);
  };

  const handleSendReply = async (reactionText: string) => {
    if (!reactionText.trim() || sendingReply) return;

    setIsPaused(true);
    setSendingReply(true);

    const isEmojiReaction = QUICK_REACTIONS.includes(reactionText.trim());
    if (isEmojiReaction) {
      triggerFlyingEmoji(reactionText.trim());
    }

    let chatId = '';
    try {
      const chatRes = await apiFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ recipientId: userId }),
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        chatId = chatData._id;
      } else {
        throw new Error('Failed to start chat');
      }

      const msgRes = await apiFetch('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          chatId,
          senderId: currentUserId,
          text: reactionText.trim(),
          storyId: currentStory._id,
          storyMediaUrl: currentStory.mediaUrl,
          storyMediaType: currentStory.mediaType,
          storyCaption: currentStory.caption || '',
          storyExpiresAt: currentStory.expiresAt,
        }),
      });

      if (msgRes.ok) {
        setReplyText('');
        setShowSentCheck(true);
        setTimeout(() => setShowSentCheck(false), 1500);
      } else {
        const errData = await msgRes.json();
        toast.error(errData.error || 'Failed to send reply');
      }
    } catch (err) {
      console.error('Error sending story response:', err);
      toast.error('Could not send reply. Try again.');
    } finally {
      setSendingReply(false);
      setReplyText('');
      setIsPaused(false);
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
      setProgress((prev) => prev + (PROGRESS_INTERVAL / IMAGE_DURATION) * 100);
    }, PROGRESS_INTERVAL);

    return () => clearInterval(interval);
  }, [isPaused, isLoading, isVideo]);

  useEffect(() => {
    if (progress >= 100) {
      handleNext();
      setProgress(0);
    }
  }, [progress, handleNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('button')) return;
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
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('button')) return;

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
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('button')) return;
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
        {!isLoading && (
           <div 
             className="absolute inset-0 opacity-20 blur-[100px] pointer-events-none"
             style={{
               background: `radial-gradient(circle at center, rgba(236, 72, 153, 0.4) 0%, transparent 70%)`
             }}
           />
        )}

        {/* Story Container */}
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
                  title="Report Highlight"
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
          <div className="w-full h-full flex items-center justify-center p-2 relative">
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

            {/* Floating Reactions Canvas */}
            <div className="absolute inset-0 pointer-events-none z-[45] overflow-hidden">
              <AnimatePresence>
                {activeFlyingEmojis.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: '80%', x: item.x, scale: 0.5 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0], 
                      y: ['80%', '40%', '20%'],
                      x: [item.x, item.x + (item.x > 0 ? -20 : 20), item.x],
                      scale: [0.5, 1.4, 1.4, 0.8]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                    className="absolute bottom-0 left-1/2 text-5xl"
                  >
                    {item.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Reply Sent Success Overlay */}
            <AnimatePresence>
              {showSentCheck && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute p-6 rounded-2xl bg-black/85 border border-white/10 backdrop-blur-lg flex flex-col items-center gap-3 shadow-2xl z-50 pointer-events-none"
                >
                  <motion.div
                    initial={{ rotate: -90, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                  </motion.div>
                  <span className="text-white text-sm font-bold tracking-tight">Response Sent</span>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Caption, View Count & Reply Bar */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 pointer-events-auto">
              <div className="flex flex-col items-center gap-4">
                {currentStory.caption && (
                  <p className="text-white text-center text-[15px] font-medium leading-relaxed drop-shadow-md max-w-[90%]">
                    {currentStory.caption}
                  </p>
                )}
                
                {isOwner ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowViewers?.(currentStory._id);
                    }}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 transition-all group active:scale-95"
                  >
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
                ) : (
                  /* Input Box for other accounts */
                  <div className="w-full flex flex-col gap-3.5" onClick={(e) => e.stopPropagation()}>
                    {/* Emoticons */}
                    <div className="flex items-center justify-center gap-4">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleSendReply(emoji)}
                          disabled={sendingReply}
                          className="text-2xl hover:scale-125 active:scale-95 transition-transform duration-200 cursor-pointer p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Chat Reply Field */}
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 px-4 py-2 focus-within:border-white/40 transition-colors">
                      <input
                        type="text"
                        placeholder="Type a response..."
                        value={replyText}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => {
                          if (!replyText.trim()) {
                            setTimeout(() => setIsPaused(false), 150);
                          }
                        }}
                        onChange={(e) => {
                          setReplyText(e.target.value);
                          setIsPaused(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSendReply(replyText);
                          }
                        }}
                        disabled={sendingReply}
                        className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white text-sm placeholder-white/60"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendReply(replyText)}
                        disabled={sendingReply || !replyText.trim()}
                        className="p-1.5 bg-white text-black hover:bg-gray-200 active:scale-95 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center"
                      >
                        {sendingReply ? (
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Controls */}
        <div className="flex absolute inset-y-0 left-0 right-0 pointer-events-none items-center justify-between px-10 z-40">
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              handlePrev(); 
            }}
            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 backdrop-blur-md flex items-center justify-center pointer-events-auto transition-all group border border-white/10 shadow-xl cursor-pointer"
            title="Previous Highlight"
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
            title="Next Highlight"
          >
            <ArrowLeft className="w-8 h-8 text-white group-hover:translate-x-0.5 transition-transform rotate-180" />
          </button>
        </div>

        {/* Report Highlight Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setIsPaused(false);
          }}
          targetId={currentStory._id}
          targetType="story"
          targetName={`highlight by ${username}`}
        />
      </motion.div>
    </AnimatePresence>
  );
}
