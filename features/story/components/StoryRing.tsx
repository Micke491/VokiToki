'use client';

import React from 'react';

interface StoryRingProps {
  avatarUrl?: string;
  username: string;
  hasStory?: boolean;
  hasUnviewedStory: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: (e: React.MouseEvent) => void;
  showLabel?: boolean;
}

const StoryRing = ({
  avatarUrl,
  username,
  hasStory = false,
  hasUnviewedStory,
  size = 'md',
  onClick,
  showLabel = true,
}: StoryRingProps) => {
  const ringColorClasses = !hasStory
    ? 'bg-transparent'
    : hasUnviewedStory
    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
    : 'bg-chat-border';

  const sizeConfigs = {
    sm: {
      ring: 'w-10 h-10 p-[1.5px]',
      gap: 'p-[1.5px]',
      image: 'w-full h-full',
      text: 'text-[10px] max-w-[50px]',
      icon: 'w-3 h-3',
    },
    md: {
      ring: 'w-16 h-16 p-[2px]',
      gap: 'p-[2px]',
      image: 'w-full h-full',
      text: 'text-xs max-w-[75px]',
      icon: 'w-4 h-4',
    },
    lg: {
      ring: 'w-24 h-24 p-[3px]',
      gap: 'p-[3px]',
      image: 'w-full h-full',
      text: 'text-sm max-w-[100px]',
      icon: 'w-6 h-6',
    },
    xl: {
      ring: 'w-32 h-32 p-[4px]',
      gap: 'p-[4px]',
      image: 'w-full h-full',
      text: 'text-base max-w-[150px]',
      icon: 'w-8 h-8',
    },
  };

  const config = sizeConfigs[size];

  return (
    <div className="flex flex-col items-center gap-1.5 scroll-ml-6">
      <button
        onClick={hasStory ? onClick : undefined}
        className={`relative rounded-full transition-all duration-300 ${
          hasStory ? 'cursor-pointer active:scale-95 group' : 'cursor-default'
        } ${
          hasStory && hasUnviewedStory ? 'hover:scale-105' : hasStory ? 'hover:opacity-80' : ''
        }`}
        type="button"
        disabled={!hasStory}
      >
        {/* The Ring */}
        <div className={`rounded-full ${ringColorClasses} ${config.ring} ${!hasStory ? '!p-0' : ''}`}>
          {/* Internal Gap (Instagram look) */}
          <div className={`w-full h-full rounded-full ${hasStory ? 'bg-chat-bg-primary' : 'bg-transparent'} ${config.gap} ${!hasStory ? '!p-0' : ''}`}>
            {/* The Image */}
            <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-chat-bg-secondary`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className={`w-full h-full object-cover transition-transform duration-500 ${hasStory ? 'group-hover:scale-110' : ''}`}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-chat-accent/20 to-chat-accent-secondary/20 text-chat-accent font-bold uppercase transition-transform duration-500 ${hasStory ? 'group-hover:scale-110' : ''}`}>
                  {(username || "U").charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </button>
      
      {showLabel && username && username.trim() !== "" && (
        <span className={`text-chat-text-secondary font-medium truncate ${config.text}`}>
          {username}
        </span>
      )}
    </div>
  );
};

export default StoryRing;
