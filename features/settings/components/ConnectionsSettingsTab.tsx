'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserMinus, Loader2, Link2Off } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface ConnectedUser {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
  bio?: string;
}

interface ConnectionsSettingsTabProps {
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function ConnectionsSettingsTab({ setFeedback }: ConnectionsSettingsTabProps) {
  const [connections, setConnections] = useState<ConnectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const limit = 20;

  const fetchConnections = async (page: number) => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/users/connections?page=${page}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
        setTotal(data.total || 0);
        setCurrentPage(data.page || page);
      } else {
        toast.error('Failed to load connections');
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections(currentPage);
  }, [currentPage]);

  const handleDisconnect = async (userId: string, username: string) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot remove connection without an internet connection.");
      return;
    }
    try {
      setDisconnectingId(userId);
      const response = await apiFetch(`/api/users/${userId}/unfollow`, {
        method: 'POST',
      });

      if (response.ok) {
        setConnections((prev) => prev.filter((c) => c._id !== userId));
        setTotal((prev) => Math.max(0, prev - 1));
        setFeedback({ type: 'success', message: `Disconnected from @${username}` });
        window.dispatchEvent(new CustomEvent('user-follow-updated'));
        
        if (connections.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else {
          fetchConnections(currentPage);
        }
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setDisconnectingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
        <Users className="w-6 h-6 text-chat-accent" />
        Connections Settings
      </h2>
      <p className="text-sm text-chat-text-secondary mb-6 leading-relaxed">
        Manage your connected network. Connected users can see each other's status and exchange direct messages freely.
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-chat-text-tertiary gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-chat-accent" />
          <p className="text-sm font-medium">Loading connections...</p>
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-chat-text-tertiary gap-3 px-6 bg-chat-bg-secondary/20 border border-dashed border-chat-border rounded-3xl">
          <div className="p-4 bg-chat-bg-secondary rounded-2xl">
            <Link2Off className="w-10 h-10 opacity-30" />
          </div>
          <p className="text-sm font-medium">No active connections</p>
          <p className="text-xs text-center opacity-70">
            Connect with other users via chat list to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between gap-4 p-4 bg-chat-input/50 border border-chat-border rounded-2xl group transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    user.username?.charAt(0).toUpperCase() || '?'
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-chat-text-primary truncate">
                    {user.name || user.username}
                  </p>
                  <p className="text-xs text-chat-text-tertiary truncate">@{user.username}</p>
                </div>
              </div>

              <button
                onClick={() => handleDisconnect(user._id, user.username)}
                disabled={disconnectingId === user._id}
                className="px-4 py-2 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                {disconnectingId === user._id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserMinus className="w-3.5 h-3.5" />
                )}
                Disconnect
              </button>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-chat-border/30">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    currentPage === p
                      ? 'bg-chat-accent text-white shadow-md shadow-chat-accent/20'
                      : 'bg-chat-input hover:bg-chat-hover text-chat-text-secondary border border-chat-border'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
