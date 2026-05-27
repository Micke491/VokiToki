'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface BlockedUser {
  _id: string;
  username: string;
  avatar?: string;
}

export function useBlockedUsers(isOpen: boolean) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/users/blocked`);

      if (!response.ok) throw new Error('Failed to fetch blocked users');

      const data = await response.json();
      setBlockedUsers(data.blockedUsers || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
    }
  }, [isOpen]);

  const handleUnblock = async (userId: string) => {
    try {
      setUnblockingId(userId);
      const response = await apiFetch(`/api/users/block`, {
        method: 'DELETE',
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!response.ok) throw new Error('Failed to unblock user');

      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (error) {
      console.error('Error unblocking user:', error);
    } finally {
      setUnblockingId(null);
    }
  };

  return {
    blockedUsers,
    loading,
    unblockingId,
    handleUnblock,
    refetch: fetchBlockedUsers,
  };
}
