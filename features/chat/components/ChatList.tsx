'use client';

import React from 'react';
import StoryRing from "@/features/story/components/StoryRing";
import ConfirmModal from '@/components/ui/ConfirmModal';
import ReportModal from '@/components/ui/ReportModal';
import { Plus, Search, X, MoreVertical, LogOut, ShieldAlert } from 'lucide-react';
import { useChatList, ChatListItem } from '../hooks/useChatList';

interface ChatListProps {
  currentUserId?: string;
  onChatSelect?: (chatId: string) => void;
  selectedChatId?: string;
  onNewChat?: () => void;
  onMenuClick?: () => void;
  onViewProfile?: (userId: string) => void;
  storiesUsers?: any[];
  onStoryClick?: (userId: string, stories: any[], username: string, avatar?: string) => void;
}

export default function ChatList({ 
  currentUserId, 
  onChatSelect, 
  selectedChatId, 
  onNewChat, 
  onViewProfile,
  storiesUsers = [],
  onStoryClick
}: ChatListProps) {
  const {
    filteredChats,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    openMenuId,
    setOpenMenuId,
    blockConfirm,
    setBlockConfirm,
    reportData,
    setReportData,
    blocking,
    handleRemoveChat,
    handleLeaveGroup,
    handleBlockUser,
    handleChatClick,
    getOtherParticipant,
    fetchChats,
  } = useChatList(currentUserId, selectedChatId);

  const renderMessagePreview = (msg: any, chatName: string) => {
    if (!msg) return 'No messages yet';

    if (msg.isDeletedForEveryone) {
      return <span className="italic">Deleted message</span>;
    }

    if (msg.storyId || msg.storyMediaUrl) {
      const amISender = msg.sender?._id === currentUserId || msg.sender === currentUserId;
      if (amISender) {
        return `You replied to ${chatName}'s story`;
      } else {
        return `${msg.sender?.username || chatName} replied to your story`;
      }
    }

    if (msg.text) return msg.text;
    
    switch (msg.mediaType) {
      case 'image': return 'Image';
      case 'video': return 'Video';
      case 'audio': return 'Voice message';
      case 'gif': return 'GIF';
      case 'sticker': return 'Sticker';
      case 'call': return 'Call';
      default:
        if (msg.mediaUrl) return 'Attachment';
        return 'Sent a message';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-chat-text-secondary">
        <div className="w-10 h-10 mb-4 border-[3px] border-chat-border border-t-chat-accent rounded-full animate-spin"></div>
        <p>Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-chat-text-secondary">
        <p className="mb-3 text-red-500">{error}</p>
        <button
          onClick={fetchChats}
          className="px-5 py-2 text-white bg-chat-accent rounded-md hover:bg-chat-accent-hover transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 p-5 border-b border-chat-border">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-chat-text-primary tracking-tight">Messages</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-2 text-chat-accent hover:bg-chat-accent/10 rounded-full transition-all"
              title="New Chat"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-chat-text-tertiary" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-chat-input border border-chat-border rounded-lg focus:ring-2 focus:ring-chat-accent/50 outline-none text-sm transition-all text-chat-text-primary placeholder-chat-text-tertiary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-chat-text-tertiary hover:text-chat-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-safe">
        {filteredChats.length === 0 && searchQuery ? (
          <div className="p-5 text-center text-chat-text-tertiary">No chats found</div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center text-chat-text-tertiary">
            <svg className="w-16 h-16 mb-5 opacity-40 text-chat-text-tertiary" viewBox="0 0 64 64" fill="none">
              <path d="M32 8C18.745 8 8 17.969 8 30c0 4.5 1.5 8.7 4 12.2V56l12.8-6.4c2.4.6 4.8 1 7.2 1 13.255 0 24-9.969 24-22S45.255 8 32 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p className="mb-5 text-base">No conversations yet</p>
            <button
              className="px-6 py-2.5 font-medium text-white bg-chat-accent rounded-lg hover:bg-chat-accent-hover transition-colors"
              onClick={onNewChat}
            >
              Start a chat
            </button>
          </div>
        ) : (
          filteredChats.map(chat => {
            const otherUser = getOtherParticipant(chat);
            const isSelected = selectedChatId === chat._id;
            const isUnread = (chat.unreadCount || 0) > 0;
            const isGroup = chat.isGroupChat;
            const chatName = isGroup ? chat.name : (otherUser.username || 'Unknown User');
            const chatAvatar = isGroup ? chat.avatar : otherUser.avatar;
            const isDeleted = !isGroup && (otherUser.username === "Unknown User" || !otherUser.username || otherUser.username === "Unknown");

            return (
              <div
                key={chat._id}
                onClick={() => handleChatClick(chat._id, onChatSelect)}
                className={`
                  group/chat relative flex gap-3 px-5 py-3 border-b border-chat-border cursor-pointer transition-colors
                  hover:bg-chat-hover
                  ${isSelected ? 'bg-chat-selected border-l-[3px] border-l-chat-accent' : 'border-l-[3px] border-l-transparent'}
                `}
              >
                {/* Avatar with Story support */}
                <div className="flex-shrink-0">
                  {isGroup ? (
                    <div className={`relative flex items-center justify-center w-12 h-12 text-lg font-semibold text-white rounded-full bg-gradient-to-br from-purple-500 to-pink-600 overflow-hidden`}>
                      {chatAvatar ? (
                        <img src={chatAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (chatName || "G").charAt(0).toUpperCase()
                      )}
                    </div>
                  ) : (
                    (() => {
                      const su = storiesUsers.find(u => u.user._id === otherUser._id);
                      const hasStories = (su?.stories.length || 0) > 0;
                      const hasUnviewed = hasStories && su.stories.some((s: any) => !(s.viewedBy || []).some((v: any) => v.userId === currentUserId));

                      return (
                        <div className="relative">
                           <StoryRing
                             size="sm"
                             avatarUrl={otherUser.avatar}
                             username={otherUser.username}
                             showLabel={false}
                             hasStory={hasStories}
                             hasUnviewedStory={hasUnviewed}
                             onClick={(e) => {
                               if (hasStories && onStoryClick) {
                                 e.stopPropagation();
                                 onStoryClick(su.user._id, su.stories, su.user.username, su.user.avatar);
                               }
                             }}
                           />
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex flex-col flex-1 min-w-0 gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[15px] truncate ${isUnread ? 'font-bold text-chat-text-primary' : 'font-semibold text-chat-text-primary'}`}>
                      {chatName}
                    </span>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className={`text-xs whitespace-nowrap ${isUnread ? 'font-bold text-chat-accent' : 'text-chat-text-tertiary'}`}>
                        {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : formatTime(chat.updatedAt)}
                      </span>
                      {/* Three-dot menu button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === chat._id ? null : chat._id);
                        }}
                        className="p-1 rounded-full text-chat-text-tertiary hover:text-chat-text-primary hover:bg-chat-bg-secondary opacity-0 group-hover/chat:opacity-100 transition-all"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className={`text-sm truncate flex items-center gap-1 ${isUnread ? 'font-bold text-chat-text-secondary' : 'text-chat-text-secondary'}`}>
                    {chat.lastMessage && 
                     !chat.lastMessage.isSystemMessage && 
                     !chat.lastMessage.storyId && 
                     !chat.lastMessage.storyMediaUrl && 
                     !chat.lastMessage.isDeletedForEveryone && (
                      <span className="shrink-0">
                        {chat.lastMessage.sender?._id === currentUserId ? 'You: ' :
                         isGroup ? `${chat.lastMessage.sender?.username || 'Unknown User'}: ` : ''}
                      </span>
                    )}
                    {renderMessagePreview(chat.lastMessage, chatName || '')}
                  </div>
                </div>

                {/* Dropdown Menu */}
                {openMenuId === chat._id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-4 top-12 z-50 w-44 bg-chat-bg-primary border border-chat-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  >
                    {isGroup ? (
                      <button
                        onClick={() => handleLeaveGroup(chat._id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Leave Group
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            if (onViewProfile) onViewProfile(otherUser._id);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-chat-text-primary hover:bg-chat-hover transition-colors"
                        >
                          <svg className="w-4 h-4 text-chat-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          View Profile
                        </button>
                        <div className="h-px bg-chat-border mx-2" />
                        <button
                          onClick={() => handleRemoveChat(chat._id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-chat-text-primary hover:bg-chat-hover transition-colors"
                        >
                          <X className="w-4 h-4 text-chat-text-tertiary" />
                          Remove Chat
                        </button>
                      </>
                    )}
                    {!isGroup && !isDeleted && (
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          setBlockConfirm({
                            chatId: chat._id,
                            userId: otherUser._id,
                            username: otherUser.username,
                          });
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors border-t border-chat-border"
                      >
                        <LogOut className="w-4 h-4" />
                        Block User
                      </button>
                    )}
                    {!isGroup && !isDeleted && (
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          setReportData({
                            userId: otherUser._id,
                            username: otherUser.username,
                          });
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-amber-500 hover:bg-amber-500/10 transition-colors border-t border-chat-border"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Report User
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Block User Confirmation Modal */}
      <ConfirmModal
        isOpen={!!blockConfirm}
        onClose={() => setBlockConfirm(null)}
        onConfirm={() => {
          if (blockConfirm) {
            handleBlockUser(blockConfirm.userId, blockConfirm.chatId);
          }
        }}
        title="Block User"
        message={`Are you sure you want to block ${blockConfirm?.username || 'this user'}? They won't be able to find or message you, and this chat will be removed from your list.`}
        confirmText="Block"
        type="danger"
        isLoading={blocking}
      />
      {/* Report User Modal */}
      <ReportModal
        isOpen={!!reportData}
        onClose={() => setReportData(null)}
        targetId={reportData?.userId || ''}
        targetType="user"
        targetName={reportData?.username}
      />
    </div>
  );
}
