import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import CallButton from "@/features/calls/components/CallButton";
import StoryRing from "@/features/story/components/StoryRing";

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
  onViewProfile,
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

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-transparent shrink-0 z-10 relative">
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
                  hasStory={hasStories}
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
               </div>
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
