'use client';

import React, { useState } from 'react';
import StoryRing from "@/features/story/components/StoryRing";
import ConfirmModal from '@/components/ui/ConfirmModal';
import ReportModal from '@/components/ui/ReportModal';
import { Plus, Search, X, MoreVertical, LogOut, ShieldAlert, BellOff, Pin, UserCheck, UserPlus, UserMinus } from 'lucide-react';
import { useChatList, ChatListItem } from '../hooks/useChatList';
import { AnimatePresence } from 'framer-motion';
import { useChatSession } from '@/hooks/useChatSession';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

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
  const [muteSelectChat, setMuteSelectChat] = useState<{ chatId: string; username: string } | null>(null);
  const [mutedChatIds, setMutedChatIds] = React.useState<string[]>([]);
  const [pinnedChatIds, setPinnedChatIds] = React.useState<string[]>([]);
  const { currentUser } = useChatSession();
  const [showFollowRequestsModal, setShowFollowRequestsModal] = useState(false);

  React.useEffect(() => {
    const fetchMuted = async () => {
      try {
        const res = await apiFetch('/api/chats/muted');
        if (res.ok) {
          const data = await res.json();
          const activeMutes = (data.mutedChats || [])
            .filter((m: any) => new Date(m.mutedUntil) > new Date())
            .map((m: any) => m.chatId);
          setMutedChatIds(activeMutes);
        }
      } catch (err) {
        console.error(err);
      }
    };
    const fetchPinned = async () => {
      try {
        const res = await apiFetch('/api/chats/pinned');
        if (res.ok) {
          const data = await res.json();
          setPinnedChatIds(data.pinnedChats || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMuted();
    fetchPinned();
  }, []);

  const handleUnmute = async (chatId: string, chatName: string) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot unmute chat without an internet connection.");
      return;
    }
    try {
      const res = await apiFetch(`/api/chats/unmute?chatId=${chatId}`, { method: 'POST' });
      if (res.ok) {
        setMutedChatIds(prev => prev.filter(id => id !== chatId));
        toast.success(`Unmuted ${chatName}`);
      } else {
        toast.error('Failed to unmute chat');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handlePin = async (chatId: string, chatName: string) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot pin chat without an internet connection.");
      return;
    }
    try {
      const res = await apiFetch('/api/chats/pin', {
        method: 'POST',
        body: JSON.stringify({ chatId })
      });
      if (res.ok) {
        setPinnedChatIds(prev => [...prev, chatId]);
        toast.success(`Pinned ${chatName}`);
      } else {
        toast.error('Failed to pin chat');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleUnpin = async (chatId: string, chatName: string) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot unpin chat without an internet connection.");
      return;
    }
    try {
      const res = await apiFetch(`/api/chats/unpin?chatId=${chatId}`, { method: 'POST' });
      if (res.ok) {
        setPinnedChatIds(prev => prev.filter(id => id !== chatId));
        toast.success(`Unpinned ${chatName}`);
      } else {
        toast.error('Failed to unpin chat');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

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
    drafts,
    requests,
    activeTab,
    setActiveTab,
    handleAcceptRequest,
    handleRejectRequest,
    followRequests,
    handleAcceptFollow,
    handleRejectFollow,
    handleFollowUser,
    handleUnfollowUser,
  } = useChatList(currentUserId, selectedChatId);

  const sortedChats = React.useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      const aPinned = pinnedChatIds.includes(a._id);
      const bPinned = pinnedChatIds.includes(b._id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [filteredChats, pinnedChatIds]);

  const renderMessagePreview = (msg: any, chatName: string) => {
    if (!msg) return 'No messages yet';

    if (msg.isDeletedForEveryone) {
      return <span className="italic">Deleted message</span>;
    }

    if (msg.storyId || msg.storyMediaUrl) {
      const amISender = msg.sender?._id === currentUserId || msg.sender === currentUserId;
      if (amISender) {
        return `You replied to ${chatName}'s highlight`;
      } else {
        return `${msg.sender?.username || chatName} replied to your highlight`;
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


  const displayChats = activeTab === 'chats' ? sortedChats : requests;

  return (
    <div className="flex flex-col h-full bg-transparent transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 p-5 border-b border-chat-border">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-chat-text-primary tracking-tight">Messages</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFollowRequestsModal(true)}
              className="relative p-2 text-chat-accent hover:bg-chat-accent/10 rounded-full transition-all"
              title="Connection Requests"
            >
              <UserCheck className="w-6 h-6" />
              {followRequests && followRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-md">
                  {followRequests.length}
                </span>
              )}
            </button>
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
        <div className="flex gap-4 pt-2">
          <button onClick={() => setActiveTab('chats')} className={`pb-2 text-sm transition-all ${activeTab === 'chats' ? 'border-b-2 border-chat-accent font-bold text-chat-text-primary' : 'text-chat-text-secondary hover:text-chat-text-primary'}`}>Chats</button>
          <button onClick={() => setActiveTab('requests')} className={`pb-2 text-sm transition-all flex items-center gap-1.5 ${activeTab === 'requests' ? 'border-b-2 border-chat-accent font-bold text-chat-text-primary' : 'text-chat-text-secondary hover:text-chat-text-primary'}`}>
            Requests {requests.length > 0 && <span className="bg-chat-accent text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{requests.length}</span>}
          </button>
        </div>
      </div>

      {/* List Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-safe">
        {displayChats.length === 0 && searchQuery ? (
          <div className="p-5 text-center text-chat-text-tertiary">No chats found</div>
        ) : displayChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center text-chat-text-tertiary">
            <svg className="w-16 h-16 mb-5 opacity-40 text-chat-text-tertiary" viewBox="0 0 64 64" fill="none">
              <path d="M32 8C18.745 8 8 17.969 8 30c0 4.5 1.5 8.7 4 12.2V56l12.8-6.4c2.4.6 4.8 1 7.2 1 13.255 0 24-9.969 24-22S45.255 8 32 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p className="mb-5 text-base">No {activeTab} yet</p>
            {activeTab === 'chats' && (
              <button
                className="px-6 py-2.5 font-medium text-white bg-chat-accent rounded-lg hover:bg-chat-accent-hover transition-colors"
                onClick={onNewChat}
              >
                Start a chat
              </button>
            )}
          </div>
        ) : (
          displayChats.map(chat => {
            const otherUser = getOtherParticipant(chat);
            const isSelected = selectedChatId === chat._id;
            const isUnread = (chat.unreadCount || 0) > 0;
            const isGroup = chat.isGroupChat;
            const chatName = isGroup ? chat.name : (otherUser.username || 'Unknown User');
            const chatAvatar = isGroup ? chat.avatar : otherUser.avatar;
            const isDeleted = !isGroup && (otherUser.username === "Unknown User" || !otherUser.username || otherUser.username === "Unknown");

            const chatDraft = !isSelected && drafts ? drafts[chat._id] : undefined;

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
                      const isFollowing = currentUser?.following?.includes(otherUser._id) ?? false;

                      return (
                        <div className="flex flex-col items-center">
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
                    <span className={`text-[15px] truncate ${isUnread ? 'font-bold text-chat-text-primary' : 'font-semibold text-chat-text-primary'} flex items-center gap-1.5`}>
                      {chatName}

                      {/* Connection Action Display */}
                      {!isGroup && !isDeleted && (() => {
                        const isFollowing = currentUser?.following?.includes(otherUser._id) ?? false;
                        const isRequested = currentUser?.sentFollowRequests?.includes(otherUser._id) ?? false;

                        if (!isFollowing) {
                          if (isRequested) {
                            return (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleUnfollowUser(otherUser._id);
                                }}
                                className="text-[11px] text-chat-text-tertiary hover:text-red-500 font-bold shrink-0 ml-1.5 cursor-pointer transition-colors"
                                title="Cancel Connection Request"
                              >
                                Pending
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleFollowUser(otherUser._id);
                              }}
                              className="text-[11px] font-black text-blue-500 hover:text-blue-400 transition-colors shrink-0 ml-1.5 cursor-pointer"
                            >
                              Connect
                            </button>
                          );
                        }
                        return null;
                      })()}

                      {pinnedChatIds.includes(chat._id) && (
                        <Pin className="w-3.5 h-3.5 text-chat-accent shrink-0 fill-chat-accent/20" />
                      )}
                      {mutedChatIds.includes(chat._id) && (
                        <BellOff className="w-3.5 h-3.5 text-chat-text-tertiary shrink-0" />
                      )}
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
                  <div className={`text-sm truncate flex items-center gap-1 ${isUnread && !chatDraft ? 'font-bold text-chat-text-secondary' : 'text-chat-text-secondary'}`}>
                    {chatDraft ? (
                      <>
                        <span className="text-red-500 dark:text-red-400 font-bold shrink-0">Draft:</span>
                        <span className="truncate text-chat-text-secondary">{chatDraft}</span>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  {activeTab === 'requests' && (
                    <div className="mt-2 flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleAcceptRequest(chat._id); }} className="text-xs bg-chat-accent text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-chat-accent-hover transition-colors">Accept</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRejectRequest(chat._id); }} className="text-xs bg-chat-bg-secondary text-chat-text-primary border border-chat-border px-3 py-1.5 rounded-lg font-semibold hover:bg-chat-hover transition-colors">Decline</button>
                    </div>
                  )}
                </div>

                {/* Dropdown Menu */}
                {openMenuId === chat._id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-4 top-12 z-50 w-44 bg-chat-bg-primary border border-chat-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Pin / Unpin Option */}
                    {(() => {
                      const isCurrentlyPinned = pinnedChatIds.includes(chat._id);
                      return (
                        <>
                          {isCurrentlyPinned ? (
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleUnpin(chat._id, chatName || 'Chat');
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-chat-text-primary hover:bg-chat-hover transition-colors"
                            >
                              <Pin className="w-4 h-4 text-chat-accent shrink-0 rotate-45" />
                              Unpin Chat
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handlePin(chat._id, chatName || 'Chat');
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-chat-text-primary hover:bg-chat-hover transition-colors"
                            >
                              <Pin className="w-4 h-4 text-chat-text-tertiary shrink-0" />
                              Pin Chat
                            </button>
                          )}
                        </>
                      );
                    })()}
                    <div className="h-px bg-chat-border mx-2" />
                    {/* Add Mute / Unmute Option */}
                    {(() => {
                      const isCurrentlyMuted = mutedChatIds.includes(chat._id);
                      return (
                        <>
                          {isCurrentlyMuted ? (
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleUnmute(chat._id, chatName || 'Chat');
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-chat-text-primary hover:bg-chat-hover transition-colors"
                            >
                              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              Unmute Chat
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setMuteSelectChat({ chatId: chat._id, username: chatName || 'Chat' });
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-chat-text-primary hover:bg-chat-hover transition-colors"
                            >
                              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                              </svg>
                              Mute Settings
                            </button>
                          )}
                        </>
                      );
                    })()}
                    <div className="h-px bg-chat-border mx-2" />
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
                        {!isDeleted && (currentUser?.following?.includes(otherUser._id) || currentUser?.sentFollowRequests?.includes(otherUser._id)) && (
                          <>
                            <div className="h-px bg-chat-border mx-2" />
                            {currentUser?.following?.includes(otherUser._id) ? (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleUnfollowUser(otherUser._id);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                                 Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleUnfollowUser(otherUser._id);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-chat-text-secondary hover:bg-chat-hover transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                                 Cancel Request
                              </button>
                            )}
                          </>
                        )}
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

      {/* Mute Chat Modal with Options */}
      <AnimatePresence>
        {muteSelectChat && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMuteSelectChat(null)} />
            <div className="relative w-full max-w-sm bg-chat-glass backdrop-blur-2xl border border-chat-border rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-chat-text-primary mb-2">Mute "{muteSelectChat.username}"</h3>
              <p className="text-xs text-chat-text-secondary mb-4">Choose how long you'd like to silence notifications from this conversation:</p>
              
              <div className="flex flex-col gap-2">
                {[
                  { label: '8 Hours', value: 8 },
                  { label: '1 Week', value: 168 },
                  { label: 'Until I turn it off', value: -1 },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={async () => {
                      if (!navigator.onLine) {
                        toast.error("Offline: Cannot mute conversation without an internet connection.");
                        setMuteSelectChat(null);
                        return;
                      }
                      try {
                        const response = await apiFetch('/api/chats/mute', {
                           method: 'POST',
                           body: JSON.stringify({ chatId: muteSelectChat.chatId, durationHours: option.value }),
                        });
                        if (response.ok) {
                          toast.success(`Muted ${muteSelectChat.username}`);
                          setMutedChatIds(prev => [...prev, muteSelectChat.chatId]);
                        } else {
                          toast.error('Failed to mute conversation');
                        }
                      } catch (err) {
                        toast.error('Network error');
                      }
                      setMuteSelectChat(null);
                    }}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-chat-text-primary bg-chat-input hover:bg-chat-hover text-left transition-colors border border-chat-border"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMuteSelectChat(null)}
                className="w-full mt-4 py-2 text-xs font-bold text-chat-text-tertiary hover:text-chat-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Follow Requests Modal */}
      <AnimatePresence>
        {showFollowRequestsModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFollowRequestsModal(false)} />
            <div className="relative w-full max-w-md bg-chat-glass backdrop-blur-2xl border border-chat-border rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-xl font-bold text-chat-text-primary">Connection Requests</h3>
                <button
                  onClick={() => setShowFollowRequestsModal(false)}
                  className="p-1.5 hover:bg-chat-hover text-chat-text-tertiary hover:text-chat-text-primary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {!followRequests || followRequests.length === 0 ? (
                  <div className="text-center py-8 text-chat-text-tertiary">
                    No pending connection requests
                  </div>
                ) : (
                  followRequests.map((reqUser: any) => (
                    <div
                      key={reqUser._id}
                      className="flex items-center justify-between bg-chat-bg-secondary p-3.5 rounded-xl border border-chat-border hover:border-chat-border/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-chat-accent flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                          {reqUser.avatar ? (
                            <img src={reqUser.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            (reqUser.username || "U").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-chat-text-primary truncate">{reqUser.name || reqUser.username}</span>
                          <span className="text-xs text-chat-text-tertiary truncate">@{reqUser.username}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleRejectFollow(reqUser._id)}
                          className="px-3 py-1.5 bg-chat-bg-primary hover:bg-chat-hover border border-chat-border text-chat-text-secondary rounded-lg text-xs font-semibold transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptFollow(reqUser._id)}
                          className="px-3 py-1.5 bg-chat-accent hover:bg-chat-accent-hover text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
