'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Users, MessageCircle } from 'lucide-react';
import { apiFetch } from "@/lib/api";

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
      const response = await apiFetch(`/api/users/search?username=${encodeURIComponent(query)}`);

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
      const response = await apiFetch('/api/chats', {
        method: 'POST',
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
      const response = await apiFetch('/api/chats/GroupChat', {
        method: 'POST',
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 bg-chat-glass backdrop-blur-2xl border border-chat-border">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-chat-border">
          <h2 className="text-xl font-semibold text-chat-text-primary">
            {isGroup ? 'New Group' : 'New Message'}
          </h2>
          <button
            className="p-1.5 rounded-lg transition-colors text-chat-text-secondary hover:bg-chat-hover"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-5 pt-4">
          <div className="flex p-1 rounded-xl bg-chat-input">
            <button
              onClick={() => setIsGroup(false)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                !isGroup
                  ? 'bg-chat-hover text-chat-text-primary shadow-sm'
                  : 'text-chat-text-secondary'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Direct
            </button>
            <button
              onClick={() => setIsGroup(true)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                isGroup
                  ? 'bg-chat-hover text-chat-text-primary shadow-sm'
                  : 'text-chat-text-secondary'
              }`}
            >
              <Users className="w-4 h-4" />
              Group
            </button>
          </div>
        </div>

        {/* Group Name Input */}
        {isGroup && (
          <div className="px-5 pt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-chat-text-secondary">Group Name</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all bg-chat-input border border-chat-border text-chat-text-primary placeholder-chat-text-tertiary"
            />
          </div>
        )}

        {/* Selected Users (Chips) */}
        {isGroup && selectedUsers.length > 0 && (
          <div className="px-5 pt-3 flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
            {selectedUsers.map(user => (
              <div key={user._id} className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-chat-accent/20 text-chat-accent rounded-lg text-xs font-medium border border-chat-accent/30">
                {user.username}
                <button onClick={() => removeSelectedUser(user._id)} className="p-0.5 hover:bg-chat-accent/20 rounded-md">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search Container */}
        <div className="relative p-4 border-b border-chat-border">
          <svg className="absolute left-8 top-1/2 -translate-y-1/2 text-chat-text-tertiary" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder={isGroup ? "Add participants..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all bg-chat-input border border-chat-border text-chat-text-primary placeholder-chat-text-tertiary"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto min-h-[150px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-chat-text-secondary gap-3">
              <div className="w-6 h-6 border-2 border-chat-border border-t-chat-accent rounded-full animate-spin" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : users.length === 0 && searchQuery.trim().length >= 2 ? (
            <div className="flex items-center justify-center py-10 text-chat-text-tertiary">
              <p className="text-sm italic">No users found</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-chat-text-tertiary">
              <p className="text-sm">Type to search for users</p>
            </div>
          ) : (
            <div className="border-t border-chat-border">
              {users.map(user => (
                <div
                  key={user._id}
                  className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${(creating) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-chat-hover'}`}
                  onClick={() => !creating && startChat(user._id)}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center font-semibold text-white text-lg shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>

                  {/* User Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate text-chat-text-primary">
                      {user.username}
                    </p>
                    {user.name && (
                      <p className="text-xs truncate text-chat-text-secondary">
                        {user.name}
                      </p>
                    )}
                  </div>

                  {creating && !isGroup && (
                    <div className="w-5 h-5 border-2 border-chat-border border-t-chat-accent rounded-full animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Action Footer */}
        {isGroup && (
          <div className="p-4 border-t border-chat-border bg-chat-input">
            <button
              onClick={createGroupChat}
              disabled={creating || !groupName.trim() || selectedUsers.length < 2}
              className="w-full py-3 bg-chat-accent hover:bg-chat-accent-hover text-white rounded-xl font-semibold shadow-lg shadow-chat-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
