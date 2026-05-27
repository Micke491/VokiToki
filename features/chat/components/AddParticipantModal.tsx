'use client';

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { apiFetch } from "@/lib/api";

interface User {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
}

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  existingParticipantIds: string[];
}

export default function AddParticipantModal({ isOpen, onClose, chatId, existingParticipantIds }: AddParticipantModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setUsers([]);
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
      
      const filteredUsers = (data.users || []).filter((u: User) => 
        !existingParticipantIds.includes(u._id) && 
        !selectedUsers.some(selected => selected._id === u._id)
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const addParticipants = async () => {
    if (selectedUsers.length === 0 || !chatId) return;

    try {
      setAdding(true);
      const response = await apiFetch(`/api/chat/${chatId}/add`, { 
        method: 'POST',
        body: JSON.stringify({ 
          userIds: selectedUsers.map(u => u._id) 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add participants');
      }

      toast.success('Participants added successfully');
      onClose();
    } catch (error: any) {
      console.error('Error adding participants:', error);
      toast.error(error.message || 'Failed to add participants');
    } finally {
      setAdding(false);
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
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 bg-chat-glass backdrop-blur-2xl border border-chat-border">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-chat-border">
          <h2 className="text-xl font-semibold text-chat-text-primary">
            Add Participants
          </h2>
          <button 
            className="p-1.5 rounded-lg transition-colors text-chat-text-secondary hover:bg-chat-hover"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Selected Users (Chips) */}
        {selectedUsers.length > 0 && (
            <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2 max-h-[100px] overflow-y-auto border-b border-chat-border">
                {selectedUsers.map(user => (
                    <div key={user._id} className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-chat-accent/20 text-chat-accent rounded-lg text-xs font-medium border border-chat-accent/30">
                        {user.username}
                        <button onClick={() => removeSelectedUser(user._id)} className="p-0.5 hover:bg-chat-accent/20 rounded-md">
                            <X className="w-3.5 h-3.5" />
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
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-chat-accent/20 transition-all bg-chat-input border border-chat-border text-chat-text-primary placeholder-chat-text-tertiary"
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
            <div className="flex items-center justify-center py-10 text-chat-text-secondary">
              <p className="text-sm italic">No users found to add</p>
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
                  className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors hover:bg-chat-hover ${(adding) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={() => !adding && toggleUserSelection(user)}
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-chat-border bg-chat-input/50 backdrop-blur-md">
            <button
                onClick={addParticipants}
                disabled={adding || selectedUsers.length === 0}
                className="w-full py-3 bg-chat-accent hover:bg-chat-accent-hover text-white rounded-xl font-semibold shadow-lg shadow-chat-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                {adding ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                    </>
                ) : (
                    `Add ${selectedUsers.length} Participant${selectedUsers.length !== 1 ? 's' : ''}`
                )}
            </button>
        </div>
      </div>
    </div>
  );
}
