import React from "react";
import { Search, X } from "lucide-react";
import CallButton from "./CallButton";

interface ChatHeaderProps {
  recipientUsername?: string;
  recipientAvatar?: string;
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
  onCallStart: (roomUrl: string, callType: "voice" | "video") => void;
}

const ChatHeader = ({
  recipientUsername,
  recipientAvatar,
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
}: ChatHeaderProps) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-chat-border bg-chat-bg-primary shrink-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors mr-2"
          aria-label="Back to chats"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path d="M12 4L6 10L12 16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {!showSearch ? (
          <>
            <div className={`flex items-center justify-center w-11 h-11 text-lg font-bold text-white rounded-full ${isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-chat-accent to-chat-accent-secondary'} shadow-sm overflow-hidden shrink-0`}>
              {recipientAvatar ? (
                <img src={recipientAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : isGroup ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              ) : (
                recipientUsername?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-chat-text-primary leading-tight truncate">
                {recipientUsername || "Chat"}
              </h3>
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
