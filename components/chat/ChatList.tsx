'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Pusher from 'pusher-js';

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
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio';
    sender?: {
      _id: string;
      username: string;
    };
    createdAt: string;
  };
  updatedAt: string;
  unreadCount?: number;
}

interface ChatListProps {
  currentUserId?: string;
  onChatSelect?: (chatId: string) => void;
  selectedChatId?: string;
}

export default function ChatList({ currentUserId, onChatSelect, selectedChatId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pusherClientRef = useRef<Pusher | null>(null);

  useEffect(() => {
    fetchChats();
  }, []);

  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !currentUserId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    pusherClientRef.current = pusher;
    const channel = pusher.subscribe(`user-${currentUserId}`);
    
    const onChatUpdate = (data: { chatId: string, lastMessage?: any, unreadCount?: number, name?: string, avatar?: string, participants?: Chat['participants'] }) => {
      setChats(prevChats => {
        const existingChatIndex = prevChats.findIndex(c => c._id === data.chatId);
        if (existingChatIndex === -1) {
          fetchChats();
          return prevChats;
        }

        const existingChat = prevChats[existingChatIndex];
        const isCurrentChat = data.chatId === selectedChatIdRef.current;
        
        let newUnreadCount = 0;
        if (isCurrentChat) {
          newUnreadCount = 0;
        } else if (data.unreadCount !== undefined && data.unreadCount > 0) {
          newUnreadCount = (existingChat.unreadCount || 0) + data.unreadCount;
        } else {
          newUnreadCount = existingChat.unreadCount || 0;
        }

        const updatedChat: Chat = {
          ...existingChat,
          updatedAt: new Date().toISOString(),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.participants !== undefined && { participants: data.participants }),
          lastMessage: data.lastMessage ? {
            text: data.lastMessage.text,
            mediaUrl: data.lastMessage.mediaUrl,
            mediaType: data.lastMessage.mediaType,
            sender: data.lastMessage.sender,
            createdAt: data.lastMessage.createdAt
          } : existingChat.lastMessage,
          unreadCount: newUnreadCount
        };

        const otherChats = prevChats.filter((_, index) => index !== existingChatIndex);

        const shouldMoveToTop = !existingChat.lastMessage || 
          (data.lastMessage && new Date(data.lastMessage.createdAt) > new Date(existingChat.lastMessage.createdAt));

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

    channel.bind('chat-update', onChatUpdate);
    channel.bind('chat-removed', onChatRemoved);
    channel.bind('chat-new', onChatNew);

    return () => {
      pusher.unsubscribe(`user-${currentUserId}`);
      pusher.disconnect();
      pusherClientRef.current = null;
    };
  }, [currentUserId]); 
  
  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const data = await response.json();
      setChats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
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
    return chat.participants.find(p => p._id !== currentUserId);
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
          className="px-5 py-2 text-white bg-chat-accent rounded-md hover:opacity-90 transition-colors"
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
    <div className="flex flex-col h-full bg-chat-sidebar border-r border-chat-border transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 p-5 border-b border-chat-border">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-chat-text-primary">Messages</h2>
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => router.push('/settings')}
              className="p-2 text-chat-text-tertiary hover:bg-chat-hover rounded-full transition-colors"
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-chat-bg-primary border border-chat-border rounded-lg focus:ring-2 focus:ring-chat-accent outline-none text-sm transition-all text-chat-text-primary"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-chat-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-chat-text-tertiary hover:text-chat-text-secondary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* List Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-20 md:pb-0">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center text-chat-text-tertiary">
            <svg className="w-16 h-16 mb-5 opacity-40 text-chat-text-tertiary" viewBox="0 0 64 64" fill="none">
              <path d="M32 8C18.745 8 8 17.969 8 30c0 4.5 1.5 8.7 4 12.2V56l12.8-6.4c2.4.6 4.8 1 7.2 1 13.255 0 24-9.969 24-22S45.255 8 32 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p className="mb-5 text-base">No conversations yet</p>
            <button 
              className="px-6 py-2.5 font-medium text-white bg-chat-accent rounded-lg hover:opacity-90 transition-colors"
              onClick={() => router.push('/chat')}
            >
              Start a chat
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-5 text-center text-gray-500">No chats found</div>
        ) : (
          filteredChats.map(chat => {
            const otherUser = getOtherParticipant(chat);
            const isSelected = selectedChatId === chat._id;
            const isUnread = (chat.unreadCount || 0) > 0;
            const isGroup = chat.isGroupChat;
            const chatName = isGroup ? chat.name : (otherUser?.username || 'Unknown');
            const chatAvatar = isGroup ? chat.avatar : otherUser?.avatar;
            
            return (
              <div 
                key={chat._id}
                onClick={() => handleChatClick(chat._id)}
                className={`
                  flex gap-3 px-5 py-3 border-b border-chat-border cursor-pointer transition-colors
                  hover:bg-chat-hover
                  ${isSelected ? 'bg-chat-selected border-l-[3px] border-l-chat-accent' : 'border-l-[3px] border-l-transparent'}
                `}
              >
                {/* Avatar */}
                <div className={`relative flex items-center justify-center flex-shrink-0 w-12 h-12 text-lg font-semibold text-white rounded-full ${isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-chat-accent to-chat-accent-secondary'} overflow-hidden`}>
                  {chatAvatar ? (
                    <img src={chatAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                     isGroup ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                           <circle cx="9" cy="7" r="4"></circle>
                           <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                           <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                     ) : (
                        chatName?.charAt(0).toUpperCase() || '?'
                     )
                  )}
                  {isUnread && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-chat-bg-primary rounded-full"></span>
                  )}
                </div>
                
                {/* Chat Info */}
                <div className="flex flex-col flex-1 min-w-0 gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[15px] truncate ${isUnread ? 'font-bold text-chat-text-primary' : 'font-semibold text-chat-text-primary'}`}>
                      {chatName}
                    </span>
                    <span className={`text-xs whitespace-nowrap ml-2 ${isUnread ? 'font-bold text-chat-accent' : 'text-chat-text-tertiary'}`}>
                      {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : formatTime(chat.updatedAt)}
                    </span>
                  </div>
                  <div className={`text-sm truncate flex items-center gap-1 ${isUnread ? 'font-bold text-chat-text-secondary' : 'text-chat-text-secondary'}`}>
                    {chat.lastMessage && (
                      <span className="shrink-0">
                        {chat.lastMessage.sender?._id === currentUserId ? 'You: ' : 
                         isGroup ? `${chat.lastMessage.sender?.username}: ` : ''}
                      </span>
                    )}
                    {chat.lastMessage?.mediaType === 'image' && <span className="flex items-center gap-1 opacity-80"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Photo</span>}
                    {chat.lastMessage?.mediaType === 'video' && <span className="flex items-center gap-1 opacity-80"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Video</span>}
                    {chat.lastMessage?.mediaType === 'audio' && <span className="flex items-center gap-1 opacity-80"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Voice record</span>}
                    {chat.lastMessage?.text || (!chat.lastMessage && 'No messages yet')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}