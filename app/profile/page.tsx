'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from "@/lib/storage";
import SideBar from '@/components/layout/Sidebar';
import {
  ArrowLeft, Camera, Save, Loader2, CheckCircle, AlertTriangle,
  User as UserIcon, MapPin, Link as LinkIcon, Edit2, X,
  Trash2, Image as ImageIcon, Menu, Plus, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pusherClient } from '@/lib/pusher-client';
import StoryManagementModal from '@/components/chat/StoryManagementModal';
import StoryRing from '@/components/chat/StoryRing';
import StoryViewer from '@/components/chat/StoryViewer';
import { useStories } from '@/hooks/useStories';

interface User {
  _id: string;
  username: string;
  email: string;
  name?: string;
  bio?: string;
  avatar?: string;
  links?: { label: string; url: string }[];
  location?: string;
  status?: string;
  readReceipts: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface Story {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  viewedBy?: { userId: string; viewedAt: string }[];
  createdAt: string;
  expiresAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    bio: '',
    avatar: '',
    location: '',
    status: '',
    links: [] as { label: string; url: string }[],
  });
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    stories: allStories, 
    loading: storiesLoading, 
    markStoryAsViewed, 
    hasUnviewedStories 
  } = useStories(currentUser?._id || '');

  const myStoryUser = allStories.find(su => su.user._id === currentUser?._id);
  const userHasStories = (myStoryUser?.stories.length || 0) > 0;

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
  }, [currentUser?._id]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) throw new Error('Not authenticated');
      const data = await response.json();

      setCurrentUser(data.user);
      setStories(data.stories || []);
      setFormData({
        username: data.user.username || '',
        name: data.user.name || '',
        bio: data.user.bio || '',
        avatar: data.user.avatar || '',
        location: data.user.location || '',
        status: data.user.status || 'Hey there!',
        links: data.user.links || [],
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.push('/auth-pages/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      setCurrentUser((prev) => (prev ? { ...prev, ...data.user } : null));
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setFeedback({ type: 'error', message: error.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch('/api/users/profile/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formDataUpload,
      });

      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();

      setFormData((prev) => ({ ...prev, avatar: data.url }));
      setFeedback({ type: 'success', message: 'Avatar updated successfully!' });
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to upload.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStoryFromModal = async (storyId: string) => {
    try {
      const response = await fetch(`/api/profile?storyId=${storyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        setStories((prev) => prev.filter((s) => s._id !== storyId));
        setFeedback({ type: 'success', message: 'Story deleted' });
      } else {
        const data = await response.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to delete story' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete story' });
    }
  };

  const handleAddStory = () => {
    fileInputRef.current?.click();
  };

  const handleStoryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setFeedback({ type: 'error', message: 'Only images and videos are allowed' });
      return;
    }

    setUploading(true);
    const formDataStory = new FormData();
    formDataStory.append('file', file);

    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formDataStory,
      });

      if (response.ok) {
        const data = await response.json();
        setStories((prev) => [data.story, ...prev]);
        setFeedback({ type: 'success', message: 'Story posted!' });
      } else {
        const data = await response.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to upload story' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to upload story' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="ambient-glow">
          <div className="ambient-glow-inner" />
        </div>
        <Loader2 className="w-10 h-10 text-chat-accent animate-spin relative z-10" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative selection:bg-chat-accent/30">
      {/* Ambient Glow */}
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      {/* Sidebar */}
      <div className={`${!showSidebarDrawer ? 'hidden md:block' : 'block'} relative z-[100]`}>
        <SideBar
          currentUser={currentUser || undefined}
          isMobileDrawerOpen={showSidebarDrawer}
          onCloseMobileDrawer={() => setShowSidebarDrawer(false)}
        />
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl"
            style={{
              backgroundColor:
                feedback.type === 'success'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              borderColor:
                feedback.type === 'success'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
              color: feedback.type === 'success' ? '#22c55e' : '#ef4444',
            }}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="font-bold tracking-tight">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 relative z-10 w-full">
        {/* Header */}
        <header className="px-6 py-8 md:px-10 max-w-5xl mx-auto border-b border-chat-border/50 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-3 bg-chat-bg-secondary hover:bg-chat-hover border border-chat-border rounded-2xl text-chat-text-primary transition-all hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-chat-text-primary tracking-tight">Profile</h1>
              <p className="text-chat-text-secondary font-medium mt-1">
                Manage your public profile and stories
              </p>
            </div>
            <button
              onClick={() => setShowSidebarDrawer(true)}
              className="md:hidden p-3 bg-chat-bg-secondary hover:bg-chat-hover border border-chat-border rounded-2xl text-chat-text-primary transition-all ml-auto"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="max-w-5xl px-6 md:px-10 mx-auto pb-12">
          {/* Profile Card - Glassmorphic Design */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-8 md:p-10 mb-8"
          >
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <StoryRing
                  avatarUrl={formData.avatar}
                  username={formData.username}
                  hasUnviewedStory={myStoryUser ? hasUnviewedStories(myStoryUser) : false}
                  size="lg"
                  onClick={() => {
                    if (userHasStories) {
                      setIsViewerOpen(true);
                    } else if (isEditing) {
                      fileInputRef.current?.click();
                    }
                  }}
                />
                {isEditing && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-6 right-0 p-2.5 bg-chat-accent text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 z-10 border-2 border-chat-bg-primary"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold text-chat-text-primary mt-4">
                {formData.name || formData.username}
              </h2>
              <p className="text-chat-text-tertiary">@{formData.username}</p>
            </div>

            {/* Edit Toggle */}
            <div className="flex justify-end mb-6">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-chat-input border border-chat-border hover:bg-chat-hover rounded-xl text-sm font-bold text-chat-text-primary transition-all flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        username: currentUser?.username || '',
                        name: currentUser?.name || '',
                        bio: currentUser?.bio || '',
                        avatar: currentUser?.avatar || '',
                        location: currentUser?.location || '',
                        status: currentUser?.status || 'Hey there!',
                        links: currentUser?.links || [],
                      });
                    }}
                    className="px-6 py-3 bg-chat-bg-secondary border border-chat-border hover:bg-chat-hover rounded-xl text-sm font-bold text-chat-text-primary transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-3 bg-chat-accent text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-chat-accent/20 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid gap-6 max-w-2xl mx-auto">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-chat-accent rounded-full" />
                  Status
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, status: e.target.value }))
                    }
                    placeholder="Hey there!"
                    className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
                  />
                ) : (
                  <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                    {formData.status || 'Hey there!'}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <UserIcon className="w-3 h-3" />
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Your name"
                    className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
                  />
                ) : (
                  <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                    {formData.name || 'Not set'}
                  </div>
                )}
              </div>

              {/* Username (read-only) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  @
                  Username
                </label>
                <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                  {formData.username}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-chat-accent rounded-full" />
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                    className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary placeholder-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all font-medium resize-none"
                  />
                ) : (
                  <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                    {formData.bio || 'No bio yet'}
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="City, Country"
                    className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
                  />
                ) : (
                  <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                    {formData.location || 'Not set'}
                  </div>
                )}
              </div>

              {/* Links Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" />
                  Links
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    {formData.links.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => {
                            const newLinks = [...formData.links];
                            newLinks[index].label = e.target.value;
                            setFormData((prev) => ({ ...prev, links: newLinks }));
                          }}
                          placeholder="Label (e.g., Twitter)"
                          className="flex-1 px-4 py-3 bg-chat-input border border-chat-border rounded-xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium text-sm"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...formData.links];
                            newLinks[index].url = e.target.value;
                            setFormData((prev) => ({ ...prev, links: newLinks }));
                          }}
                          placeholder="https://..."
                          className="flex-1 px-4 py-3 bg-chat-input border border-chat-border rounded-xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium text-sm"
                        />
                        <button
                          onClick={() => {
                            const newLinks = formData.links.filter((_, i) => i !== index);
                            setFormData((prev) => ({ ...prev, links: newLinks }));
                          }}
                          className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          links: [...prev.links, { label: '', url: '' }],
                        }));
                      }}
                      className="w-full py-3 border-2 border-dashed border-chat-border rounded-xl text-chat-text-secondary hover:border-chat-accent hover:text-chat-accent transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Link
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.links && formData.links.length > 0 ? (
                      formData.links.map((link, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 bg-chat-bg-secondary border border-chat-border rounded-xl flex items-center gap-3"
                        >
                          <LinkIcon className="w-4 h-4 text-chat-accent" />
                          <a
                            href={
                              link.url.startsWith('http')
                                ? link.url
                                : `https://${link.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-chat-accent hover:underline font-medium"
                          >
                            {link.label || link.url}
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                        No links added yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* My Stories Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-8 md:p-10"
          >
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowStoryModal(true)}
                className="text-xl font-bold text-chat-text-primary flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <ImageIcon className="w-6 h-6 text-chat-accent" />
                My Stories
              </button>
              <button
                onClick={handleAddStory}
                disabled={uploading}
                className="px-4 py-2 bg-chat-accent text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-chat-accent/20 disabled:opacity-50 hover:scale-105"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Story
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*"
              onChange={handleStoryFileSelect}
            />

            {stories.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-chat-text-tertiary bg-chat-bg-secondary rounded-2xl border border-dashed border-chat-border">
                <ImageIcon className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-medium">No stories yet</p>
                <p className="text-sm mt-1">Add a photo or video to share with your contacts</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {stories.map((story) => (
                  <motion.div
                    key={story._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-chat-bg-secondary border border-chat-border cursor-pointer hover:shadow-xl transition-all"
                    onClick={() => setShowStoryModal(true)}
                  >
                    {story.mediaType === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-chat-bg-primary">
                        <video
                          src={story.mediaUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      </div>
                    ) : (
                      <img
                        src={story.mediaUrl}
                        alt={story.caption || 'Story'}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                              <Eye className="w-3 h-3" />
                              {new Set(story.viewedBy?.map(v => v.userId)).size || 0}
                           </div>
                           <span className="text-[10px] font-medium text-white/90 drop-shadow-md">
                              {formatTimeRemaining(story.expiresAt)}
                           </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStoryFromModal(story._id);
                          }}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {story.caption && (
                        <p className="text-[11px] text-white/90 mt-1 line-clamp-2 leading-tight drop-shadow-md">
                          {story.caption}
                        </p>
                      )}
                    </div>

                    {/* Video indicator */}
                    {story.mediaType === 'video' && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-bold uppercase">
                        Video
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </div>

      {/* Story Viewer Overlay */}
      {isViewerOpen && myStoryUser && (
        <StoryViewer
          stories={myStoryUser.stories}
          initialIndex={viewerInitialIndex}
          username={formData.username}
          userId={currentUser?._id || ''}
          userAvatar={formData.avatar}
          onClose={() => setIsViewerOpen(false)}
          onIndexChange={(index) => setViewerInitialIndex(index)}
          currentUserId={currentUser?._id}
          onShowViewers={() => {
            setIsViewerOpen(false);
            setShowStoryModal(true);
          }}
        />
      )}

      {/* Story Management Modal */}
      <StoryManagementModal
        isOpen={showStoryModal}
        onClose={() => setShowStoryModal(false)}
        stories={stories}
        onDeleteStory={handleDeleteStoryFromModal}
        onAddStory={handleAddStory}
        uploading={uploading}
        onViewStory={(storyId) => {
          const index = stories.findIndex(s => s._id === storyId);
          if (index !== -1) {
            setViewerInitialIndex(index);
            setIsViewerOpen(true);
          }
        }}
      />
    </div>
  );
}
