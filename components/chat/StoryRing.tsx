'use client';

import React from 'react';

interface StoryRingProps {
  avatarUrl?: string;
  username: string;
  hasUnviewedStory: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const StoryRing = ({
  avatarUrl,
  username,
  hasUnviewedStory,
  size = 'md',
  onClick,
}: StoryRingProps) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const ringGradient = hasUnviewedStory
    ? 'bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500'
    : 'bg-chat-border';

  const innerSize = {
    sm: 'w-8 h-8',
    md: 'w-[52px] h-[52px]',
    lg: 'w-[60px] h-[60px]',
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group cursor-pointer"
      type="button"
    >
      <div
        className={`relative rounded-full p-[2px] ${ringGradient} transition-transform group-hover:scale-105`}
      >
        <div className={`rounded-full bg-chat-bg-primary p-[2px] ${innerSize[size]}`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center text-white font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-chat-text-secondary truncate max-w-[72px]">
        {username.length > 10 ? username.slice(0, 9) + '...' : username}
      </span>
    </button>
  );
};

export default StoryRing;
