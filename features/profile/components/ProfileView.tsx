'use client';

import { useRouter } from 'next/navigation';
import SideBar from '@/features/sidebar/components/Sidebar';
import {
  ArrowLeft, Camera, Loader2, CheckCircle, AlertTriangle,
  User as UserIcon, MapPin, Link as LinkIcon, Edit2,
  Trash2, Image as ImageIcon, Plus, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StoryManagementModal from '@/features/story/components/StoryManagementModal';
import StoryRing from '@/features/story/components/StoryRing';
import StoryViewer from '@/features/story/components/StoryViewer';
import { useProfile } from '../hooks/useProfile';

export function ProfileView() {
  const {
    router,
    currentUser,
    stories,
    loading,
    uploading,
    feedback,
    showStoryModal,
    setShowStoryModal,
    isViewerOpen,
    setIsViewerOpen,
    viewerInitialIndex,
    setViewerInitialIndex,
    avatarInputRef,
    storyInputRef,
    myStoryUser,
    userHasStories,
    hasUnviewedStories,
    handleAvatarUpload,
    handleDeleteStoryFromModal,
    handleAddStory,
    handleStoryFileSelect,
    formatTimeRemaining,
  } = useProfile();

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
      <div className="relative z-[100]">
        <SideBar
          currentUser={currentUser || undefined}
          isMobileDrawerOpen={false}
          onCloseMobileDrawer={() => {}}
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

      <div className="flex-1 overflow-y-auto pb-0 relative z-10 w-full">
        {/* Header */}
        <header className="px-10 py-8 max-w-5xl mx-auto border-b border-chat-border/50 mb-8">
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
          </div>
        </header>

        <div className="max-w-5xl px-10 mx-auto pb-12">
          {/* Profile Card - Glassmorphic Design */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-10 mb-8"
          >
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <StoryRing
                  avatarUrl={currentUser?.avatar}
                  username={currentUser?.username || ''}
                  hasUnviewedStory={myStoryUser ? hasUnviewedStories(myStoryUser) : false}
                  size="lg"
                  onClick={() => {
                    if (userHasStories) {
                      setIsViewerOpen(true);
                    } else {
                      avatarInputRef.current?.click();
                    }
                  }}
                />
                <>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
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
                <input
                  type="file"
                  ref={storyInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleStoryFileSelect}
                />
              </div>
              <h2 className="text-2xl font-bold text-chat-text-primary mt-4">
                {currentUser?.name || currentUser?.username}
              </h2>
              <p className="text-chat-text-tertiary">@{currentUser?.username}</p>
            </div>

            {/* Edit Button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => router.push('/settings')}
                className="px-6 py-3 bg-chat-accent hover:bg-chat-accent-hover text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-chat-accent/20"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>

            {/* Read-only Details Grid */}
            <div className="grid gap-6 max-w-2xl mx-auto">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <UserIcon className="w-3 h-3 text-chat-accent" />
                  Name
                </label>
                <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                  {currentUser?.name || 'Not set'}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-chat-accent rounded-full" />
                  Bio
                </label>
                <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary whitespace-pre-wrap leading-relaxed">
                  {currentUser?.bio || 'No bio yet'}
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-chat-accent rounded-full" />
                  Gender
                </label>
                <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary capitalize">
                  {currentUser?.gender || 'Not specified'}
                </div>
              </div>

              {/* Location - Only rendered if a location is set */}
              {currentUser?.location && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-chat-accent" />
                    Location
                  </label>
                  <div className="px-4 py-4 bg-chat-bg-secondary border border-chat-border rounded-2xl text-chat-text-secondary">
                    {currentUser.location}
                  </div>
                </div>
              )}

              {/* Links Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3 text-chat-accent" />
                  Links
                </label>
                <div className="space-y-2">
                  {currentUser?.links && currentUser.links.length > 0 ? (
                    currentUser.links.map((link, index) => (
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
              </div>
            </div>
          </motion.section>

          {/* My Stories Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-chat-glass backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-chat-border p-10"
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

            {stories.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-chat-text-tertiary bg-chat-bg-secondary rounded-2xl border border-dashed border-chat-border">
                <ImageIcon className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-medium">No stories yet</p>
                <p className="text-sm mt-1">Add a photo or video to share with your contacts</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                              {new Set(story.viewedBy?.map((v: { userId: string }) => v.userId)).size || 0}
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
          username={currentUser?.username || ''}
          userId={currentUser?._id || ''}
          userAvatar={currentUser?.avatar}
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
