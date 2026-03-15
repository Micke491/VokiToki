'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setUsers([]);
      setIsGroup(false);
      setGroupName('');
      setSelectedUsers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/search?username=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      // Filter out already selected users in group mode
      const filteredUsers = data.users.filter((u: User) => 
        !selectedUsers.some(selected => selected._id === u._id)
      );
      setUsers(filteredUsers || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (recipientId: string) => {
    if (isGroup) {
      toggleUserSelection(users.find(u => u._id === recipientId)!);
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/chats', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ recipientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error details:', errorData.details || errorData.message);
        throw new Error('Failed to create chat');
      }

      const chat = await response.json();
      onClose();
      router.push(`/chat/${chat._id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setCreating(false);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;

    try {
      setCreating(true);
      const response = await fetch('/api/chats/GroupChat', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          name: groupName, 
          participants: selectedUsers.map(u => u._id) 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create group chat');
      }

      const chat = await response.json();
      onClose();
      router.push(`/chat/${chat._id}`);
    } catch (error) {
      console.error('Error creating group chat:', error);
      alert('Failed to create group chat');
    } finally {
      setCreating(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
    setSearchQuery('');
    setUsers([]);
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isGroup ? 'New Group' : 'New Message'}
          </h2>
          <button 
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-5 pt-4">
            <div className="flex p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <button
                    onClick={() => setIsGroup(false)}
                    className="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all"
                    style={!isGroup ? { background: 'var(--bg-hover)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: 'var(--text-secondary)' }}
                >
                    Direct Message
                </button>
                <button
                    onClick={() => setIsGroup(true)}
                    className="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all"
                    style={isGroup ? { background: 'var(--bg-hover)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: 'var(--text-secondary)' }}
                >
                    Group Chat
                </button>
            </div>
        </div>

        {/* Group Name Input */}
        {isGroup && (
           <div className="px-5 pt-4">
               <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Group Name</label>
               <input
                 type="text"
                 placeholder="Enter group name"
                 value={groupName}
                 onChange={(e) => setGroupName(e.target.value)}
                 className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                 style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
               />
           </div>
        )}

        {/* Selected Users (Chips) */}
        {isGroup && selectedUsers.length > 0 && (
            <div className="px-5 pt-3 flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                {selectedUsers.map(user => (
                    <div key={user._id} className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800">
                        {user.username}
                        <button onClick={() => removeSelectedUser(user._id)} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6L18 18"></path></svg>
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* Search Container */}
        <div className="relative p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <svg className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder={isGroup ? "Add participants..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto min-h-[150px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-3">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : users.length === 0 && searchQuery.trim().length >= 2 ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <p className="text-sm italic">No users found</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <p className="text-sm">Type to search for users</p>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-color)' }}>
              {users.map(user => (
                <div 
                  key={user._id} 
                  className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${(creating) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onMouseEnter={e => { if (!creating) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => !creating && startChat(user._id)}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-semibold text-white text-lg shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* User Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {user.username}
                    </p>
                    {user.name && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {user.name}
                      </p>
                    )}
                  </div>

                  {creating && !isGroup && (
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Action Footer */}
        {isGroup && (
            <div className="p-4" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                <button
                    onClick={createGroupChat}
                    disabled={creating || !groupName.trim() || selectedUsers.length < 2}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {creating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating...
                        </>
                    ) : (
                        `Create Group (${selectedUsers.length})`
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}