import React, { useState, useRef, useEffect } from "react";
import { Search, X, MoreVertical, User as UserIcon } from "lucide-react";
import CallButton from "./CallButton";
import StoryRing from "./StoryRing";

interface ChatHeaderProps {
  recipientUsername?: string;
  recipientAvatar?: string;
  recipientId?: string;
  onClose?: () => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isGroup?: boolean;
  onToggleSidebar?: () => void;
  chatId: string;
  currentUserId: string;
  currentUserUsername: string;
  currentUserAvatar?: string;
  onCallStart: (callType: "voice" | "video") => void;
  onMenuClick?: () => void;
  onViewProfile?: (userId: string) => void;
  recipientOnline?: boolean;
  recipientLastSeen?: string;
  recipientStoriesUser?: any;
  onStoryClick?: (userId: string, stories: any[], username: string, avatar?: string) => void;
  isBlocked?: boolean;
  isDeleted?: boolean;
}

const ChatHeader = ({
  recipientUsername,
  recipientAvatar,
  recipientId,
  onClose,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  isGroup,
  onToggleSidebar,
  chatId,
  currentUserId,
  currentUserUsername,
  currentUserAvatar,
  onCallStart,
  onMenuClick,
  onViewProfile,
  recipientOnline,
  recipientLastSeen,
  recipientStoriesUser,
  onStoryClick,
  isBlocked,
  isDeleted,
}: ChatHeaderProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasStories = (recipientStoriesUser?.stories?.length || 0) > 0;
  const hasUnviewedStories = hasStories && recipientStoriesUser.stories.some((s: any) => !(s.viewedBy || []).some((v: any) => v.userId === currentUserId));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'last seen just now';
    if (diffMins < 60) return `last seen ${diffMins}m ago`;
    if (diffHours < 24) return `last seen ${diffHours}h ago`;
    if (diffDays < 7) return `last seen ${diffDays}d ago`;
    return `last seen ${date.toLocaleDateString()}`;
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-chat-border bg-transparent shrink-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex md:hidden items-center mr-1">
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center w-9 h-9 text-chat-text-tertiary hover:bg-chat-hover rounded-full transition-colors mr-1"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <line x1="3" y1="12" x2="21" y2="12"></line>
               <line x1="3" y1="6" x2="21" y2="6"></line>
               <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 text-chat-text-secondary hover:bg-chat-hover rounded-full transition-colors"
            aria-label="Back to chats"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M12 4L6 10L12 16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {!showSearch ? (
          <>
            <div className="shrink-0">
              {isGroup ? (
                <div className={`flex items-center justify-center w-11 h-11 text-lg font-bold text-white rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-sm overflow-hidden`}>
                  {recipientAvatar ? (
                    <img src={recipientAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (recipientUsername || "G").charAt(0).toUpperCase()
                  )}
                </div>
              ) : (
                <StoryRing
                  size="sm"
                  avatarUrl={recipientAvatar}
                  username={recipientUsername || "?"}
                  showLabel={false}
                  hasUnviewedStory={hasUnviewedStories}
                  onClick={() => {
                    if (hasStories && onStoryClick) {
                      onStoryClick(recipientStoriesUser.user._id, recipientStoriesUser.stories, recipientStoriesUser.user.username, recipientStoriesUser.user.avatar);
                    }
                  }}
                />
              )}
            </div>
            <div className="min-w-0">
               <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-base font-semibold text-chat-text-primary leading-tight truncate">
                    {recipientUsername || "Chat"}
                  </h3>
                  {recipientOnline && !isGroup && (
                    <span className="w-2 h-2 bg-green-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  )}
               </div>
               {/* Last seen text */}
              {!isGroup && !recipientOnline && (
                <p className="text-[11px] text-chat-text-tertiary truncate leading-none mt-1">
                  {formatLastSeen(recipientLastSeen)}
                </p>
              )}
               {!isGroup && recipientOnline && (
                <p className="text-[11px] text-green-500/80 font-medium truncate leading-none mt-1">
                  Online
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center bg-chat-bg-secondary rounded-full px-4 py-1.5 animate-in slide-in-from-right-4 duration-300">
            <Search className="w-4 h-4 text-chat-text-tertiary mr-2" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-chat-text-primary placeholder:text-chat-text-tertiary"
            />
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(""); }}
              className="p-1 hover:bg-chat-hover rounded-full text-chat-text-tertiary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {!showSearch && (
        <div className="flex items-center gap-2">
          <CallButton 
            chatId={chatId}
            isGroup={!!isGroup}
            onCallStart={onCallStart}
            currentUserId={currentUserId}
            currentUserUsername={currentUserUsername}
            currentUserAvatar={currentUserAvatar}
            isBlocked={isBlocked}
            isDeleted={isDeleted}
          />
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-chat-text-tertiary hover:bg-chat-hover rounded-full transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => onToggleSidebar?.()}
            className="p-2 text-chat-text-tertiary hover:bg-chat-hover rounded-full transition-colors"
            title="Chat Info"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

        </div>
      )}
    </header>
  );
};

export default ChatHeader;
