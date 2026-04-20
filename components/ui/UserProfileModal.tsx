'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Link as LinkIcon, Globe, Calendar, CheckCircle } from 'lucide-react';
import { getAuthToken } from '@/lib/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

import { UserProfile } from '../../types/chat';

export default function UserProfileModal({
  isOpen,
  onClose,
  userId,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load profile');
      }
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatJoinDate = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-chat-bg-primary rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden border border-chat-border">
              {/* Header */}
              <div className="relative h-32 bg-gradient-to-r from-chat-accent to-chat-accent-secondary">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Avatar */}
              <div className="relative -mt-16 flex justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-chat-bg-primary overflow-hidden bg-gradient-to-br from-chat-accent to-chat-accent-secondary">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                      {profile?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                {profile?.isOnline && (
                  <div className="absolute bottom-2 right-1/2 translate-x-20 w-5 h-5 bg-green-500 border-4 border-chat-bg-primary rounded-full" />
                )}
              </div>

              {/* Content */}
              {loading ? (
                <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                  <div className="w-8 h-8 border-2 border-chat-accent border-t-transparent rounded-full animate-spin" />
                  <p className="mt-3 text-chat-text-tertiary">Loading profile...</p>
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-500">
                  <p>{error}</p>
                  <button
                    onClick={fetchProfile}
                    className="mt-3 px-4 py-2 bg-chat-accent text-white rounded-lg hover:bg-chat-accent-hover transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : profile ? (
                <div className="p-6">
                  {/* Name and username */}
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-chat-text-primary">
                      {profile.name || profile.username}
                    </h2>
                    <p className="text-chat-text-tertiary text-sm">@{profile.username}</p>
                  </div>

                  {/* Status */}
                  {profile.status && (
                    <div className="text-center mb-4 p-3 bg-chat-bg-secondary rounded-xl">
                      <p className="text-chat-text-secondary text-sm">{profile.status}</p>
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-chat-text-secondary text-center mb-4 text-sm">
                      {profile.bio}
                    </p>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {profile.location && (
                      <div className="flex items-center gap-2 text-chat-text-tertiary text-sm">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{profile.location}</span>
                      </div>
                    )}
                    {profile.links && profile.links.length > 0 && profile.links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-chat-accent text-sm hover:underline col-span-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span className="truncate">{link.label || link.url}</span>
                      </a>
                    ))}
                    <div className="flex items-center gap-2 text-chat-text-tertiary text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {formatJoinDate(profile.createdAt)}</span>
                    </div>
                    {profile.lastSeen && (
                      <div className="flex items-center gap-2 text-chat-text-tertiary text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Active {formatLastSeen(profile.lastSeen)}</span>
                      </div>
                    )}
                  </div>

                  {/* Stories count */}
                  {profile.activeStoriesCount > 0 && (
                    <div className="pt-4 border-t border-chat-border">
                      <p className="text-center text-chat-text-tertiary text-sm">
                        {profile.activeStoriesCount} active story
                        {profile.activeStoriesCount > 1 ? 'ies' : ''}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
