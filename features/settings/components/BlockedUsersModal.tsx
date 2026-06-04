'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, UserX, Loader2, ShieldOff } from 'lucide-react';
import { useBlockedUsers } from '../hooks/useBlockedUsers';
import Portal from '@/components/ui/Portal';

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlockedUsersModal({ isOpen, onClose }: BlockedUsersModalProps) {
  const { blockedUsers, loading, unblockingId, handleUnblock } = useBlockedUsers(isOpen);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-chat-bg-primary border border-chat-border rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-chat-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 rounded-xl">
                <UserX className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-chat-text-primary">Blocked Users</h2>
                <p className="text-xs text-chat-text-tertiary mt-0.5">
                  {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-chat-hover rounded-xl text-chat-text-tertiary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-chat-text-tertiary gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm font-medium">Loading blocked users...</p>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-chat-text-tertiary gap-3 px-6">
                <div className="p-4 bg-chat-bg-secondary rounded-2xl">
                  <ShieldOff className="w-10 h-10 opacity-30" />
                </div>
                <p className="text-sm font-medium">No blocked users</p>
                <p className="text-xs text-center opacity-70">
                  Users you block will appear here. They won&apos;t be able to find or message you.
                </p>
              </div>
            ) : (
              <div className="p-3">
                {blockedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-chat-bg-secondary transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>

                    {/* Username */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-chat-text-primary truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-chat-text-tertiary">Blocked</p>
                    </div>

                    {/* Unblock Button */}
                    <button
                      onClick={() => handleUnblock(user._id)}
                      disabled={unblockingId === user._id}
                      className="px-4 py-2 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {unblockingId === user._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Unblock'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
