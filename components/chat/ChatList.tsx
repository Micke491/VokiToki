'use client';

import { useEffect, useState, useRef } from 'react';
import StoryRing from "./StoryRing";
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/storage';
import { pusherClient } from '@/lib/pusher-client';
import ConfirmModal from '../ui/ConfirmModal';
import { Plus, Menu, Search, X, MoreVertical, LogOut, ShieldAlert } from 'lucide-react';
import ReportModal from '../ui/ReportModal';
import { apiFetch } from '@/lib/api';

interface Chat {
  _id: string;
  name?: string;
  isGroupChat?: boolean;
  avatar?: string;
  participants: Array<{
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  }>;
  lastMessage?: {
    _id: string;
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'call';
    sender?: {
      _id: string;
      username: string;
    };
    createdAt: string;
    isSystemMessage?: boolean;
    storyId?: string;
    storyMediaUrl?: string;
    isDeletedForEveryone?: boolean;
  };
  updatedAt: string;
  unreadCount?: number;
}

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
  onMenuClick, 
  onViewProfile,
  storiesUsers = [],
  onStoryClick
}: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [blockConfirm, setBlockConfirm] = useState<{ chatId: string; userId: string; username: string } | null>(null);
  const [reportData, setReportData] = useState<{ userId: string; username: string } | null>(null);
  const [blocking, setBlocking] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchChats();
  }, []);

  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !currentUserId) return;

    const channel = pusherClient.subscribe(`user-${currentUserId}`);

    const onChatUpdate = (data: { chatId: string, lastMessage?: any, unreadCount?: number, name?: string, avatar?: string, participants?: Chat['participants'] }) => {
      setChats(prevChats => {
        const existingChatIndex = prevChats.findIndex(c => c._id === data.chatId);
        if (existingChatIndex === -1) {
          fetchChats();
          return prevChats;
        }

        const existingChat = prevChats[existingChatIndex];
        const isCurrentChat = data.chatId === selectedChatIdRef.current;
        const amISender = data.lastMessage?.sender?._id === currentUserId || data.lastMessage?.sender === currentUserId;

        let newUnreadCount = existingChat.unreadCount || 0;

        if (isCurrentChat || amISender) {
          newUnreadCount = 0;
        } else if (data.unreadCount !== undefined) {
          newUnreadCount = data.unreadCount;
        } else if (data.lastMessage) {
          newUnreadCount += 1;
        }

        const updatedChat: Chat = {
          ...existingChat,
          updatedAt: new Date().toISOString(),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.participants !== undefined && { participants: data.participants }),
          lastMessage: data.lastMessage ? {
            _id: data.lastMessage._id,
            text: data.lastMessage.text,
            mediaUrl: data.lastMessage.mediaUrl,
            mediaType: data.lastMessage.mediaType,
            sender: data.lastMessage.sender,
            createdAt: data.lastMessage.createdAt,
            isSystemMessage: data.lastMessage.isSystemMessage,
            storyId: data.lastMessage.storyId,
            storyMediaUrl: data.lastMessage.storyMediaUrl,
            isDeletedForEveryone: data.lastMessage.isDeletedForEveryone
          } : existingChat.lastMessage,
          unreadCount: newUnreadCount
        };

        const otherChats = prevChats.filter((_, index) => index !== existingChatIndex);

        const shouldMoveToTop = !existingChat.lastMessage ||
          (data.lastMessage && new Date(data.lastMessage.createdAt) > new Date(existingChat.lastMessage.createdAt));

        if (!isCurrentChat && !amISender && data.lastMessage?._id) {
          apiFetch(`/api/chat/message/messages/${data.lastMessage._id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ chatId: data.chatId, messageIds: [data.lastMessage._id], status: "delivered" }),
          }).catch(err => console.error("Error marking as delivered:", err));
        }

        if (shouldMoveToTop) {
          return [updatedChat, ...otherChats];
        } else {
          const newChats = [...prevChats];
          newChats[existingChatIndex] = updatedChat;
          return newChats;
        }
      });
    };

    const onChatRemoved = (data: { chatId: string }) => {
      setChats(prevChats => prevChats.filter(c => c._id !== data.chatId));
      if (data.chatId === selectedChatIdRef.current) {
        router.push('/chat');
      }
    };

    const onChatNew = (newChat: Chat) => {
      setChats(prevChats => {
        if (prevChats.some(c => c._id === newChat._id)) return prevChats;
        return [newChat, ...prevChats];
      });
    };

    const onProfileUpdate = (data: { userId: string, username: string, avatar?: string }) => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.isGroupChat) return chat;
        const isParticipant = chat.participants.some(p => p._id === data.userId);
        if (!isParticipant) return chat;

        return {
          ...chat,
          participants: chat.participants.map(p => 
            p._id === data.userId 
              ? { ...p, username: data.username, avatar: data.avatar }
              : p
          )
        };
      }));
    };

    channel.bind('chat-update', onChatUpdate);
    channel.bind('chat-removed', onChatRemoved);
    channel.bind('chat-new', onChatNew);
    channel.bind('profile-updated', onProfileUpdate);

    return () => {
      channel.unbind('chat-update', onChatUpdate);
      channel.unbind('chat-removed', onChatRemoved);
      channel.unbind('chat-new', onChatNew);
      channel.unbind('profile-updated', onProfileUpdate);
    };
  }, [currentUserId]);

  useEffect(() => {
    const handleLocalMessageUpdated = (e: Event) => {
      const updatedMessage = (e as CustomEvent).detail;
      if (!updatedMessage) return;

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.lastMessage && String(chat.lastMessage._id) === String(updatedMessage._id)) {
            return {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                text: updatedMessage.text,
                mediaUrl: updatedMessage.mediaUrl,
                mediaType: updatedMessage.mediaType,
                isDeletedForEveryone: updatedMessage.isDeletedForEveryone,
              },
            };
          }
          return chat;
        })
      );
    };

    window.addEventListener("local-message-updated", handleLocalMessageUpdated);
    return () => {
      window.removeEventListener("local-message-updated", handleLocalMessageUpdated);
    };
  }, []);


  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/chats', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const data = await response.json();
      const processedData = data.map((c: Chat) => 
        c._id === selectedChatIdRef.current ? { ...c, unreadCount: 0 } : c
      );
      setChats(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleRemoveChat = async (chatId: string) => {
    setOpenMenuId(null);
    try {
      const response = await apiFetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (selectedChatId === chatId) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error removing chat:', error);
    }
  };

  const handleLeaveGroup = async (chatId: string) => {
    setOpenMenuId(null);
    try {
      const response = await apiFetch(`/api/chat/${chatId}/leave`, {
        method: 'POST',
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (selectedChatId === chatId) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleBlockUser = async (targetUserId: string, chatId: string) => {
    setBlocking(true);
    try {
      const response = await apiFetch(`/api/users/block`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (selectedChatId === chatId) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    } finally {
      setBlocking(false);
      setBlockConfirm(null);
    }
  };

  const handleChatClick = (chatId: string) => {
    setChats(prev => prev.map(c =>
      c._id === chatId ? { ...c, unreadCount: 0 } : c
    ));

    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    const other = chat.participants.find(p => p._id !== currentUserId);
    return other || { _id: '', username: 'Unknown', avatar: '' };
  };

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

  const filteredChats = chats.filter(chat => {
      if (!searchQuery) return true;
      const otherUser = getOtherParticipant(chat);
      const chatName = chat.isGroupChat ? chat.name : (otherUser?.username || 'Unknown');
      return chatName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
        {chats.length === 0 ? (
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
        ) : filteredChats.length === 0 ? (
          <div className="p-5 text-center text-chat-text-tertiary">No chats found</div>
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
                onClick={() => handleChatClick(chat._id)}
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
                    ref={menuRef}
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