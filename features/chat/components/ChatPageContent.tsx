"use client";

import { registerServiceWorker } from "@/lib/pushNotifications";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatList from "@/features/chat/components/ChatList";
import ChatWindow from "@/features/chat/components/ChatWindow";
import NewChatModal from "@/features/chat/components/NewChatModal";
import SideBar from "@/features/sidebar/components/Sidebar";
import StoryBar from "@/features/story/components/StoryBar";
import StoryViewer from "@/features/story/components/StoryViewer";
import StoryManagementModal from "@/features/story/components/StoryManagementModal";
import UserProfileModal from "./UserProfileModal";
import { useStories } from "@/features/story/hooks/useStories";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import { Story } from "@/features/story/types/story";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatDetails } from "../hooks/useChatDetails";

interface ChatPageContentProps {
  chatId?: string;
}

export default function ChatPageContent({ chatId }: ChatPageContentProps) {
  const router = useRouter();
  const { currentUser, loading } = useChatSession();
  const { selectedChat, chatMetadata, handleChatUpdated } = useChatDetails(chatId, currentUser);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const { 
    stories: allStoriesUsers, 
    markStoryAsViewed, 
    hasUnviewedStories,
    setStories,
    fetchStories
  } = useStories(currentUser);

  const [showStoryManagement, setShowStoryManagement] = useState(false);

  const [viewingStory, setViewingStory] = useState<{
    isOpen: boolean;
    userId: string;
    username: string;
    userAvatar?: string;
    stories: Story[];
    currentIndex: number;
  } | null>(null);

  const [viewingProfile, setViewingProfile] = useState<{ isOpen: boolean; userId: string } | null>(null);

  const storyInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStory, setUploadingStory] = useState(false);

  const handleStoryClick = useCallback((userId: string, stories: Story[], username: string, avatar?: string) => {
    const unviewedIndex = stories.findIndex((s) => {
      const viewedBy = s.viewedBy || [];
      return !viewedBy.some(v => v.userId === currentUser?._id);
    });
    setViewingStory({
      isOpen: true,
      userId,
      username,
      userAvatar: avatar,
      stories,
      currentIndex: unviewedIndex >= 0 ? unviewedIndex : 0,
    });
  }, [currentUser]);

  const handleViewStoryById = useCallback((storyId: string) => {
    const storyUser = allStoriesUsers.find((su) =>
      su.stories.some((s) => s._id === storyId)
    );

    if (storyUser) {
      const storyIndex = storyUser.stories.findIndex((s) => s._id === storyId);
      setViewingStory({
        isOpen: true,
        userId: storyUser.user._id,
        username: storyUser.user.username,
        userAvatar: storyUser.user.avatar,
        stories: storyUser.stories,
        currentIndex: storyIndex >= 0 ? storyIndex : 0,
      });
    } else {
      toast.error("Story could not be found or has expired");
    }
  }, [allStoriesUsers]);

  const handleMyStoryClick = () => {
    setShowStoryManagement(true);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const response = await apiFetch(`/api/profile?storyId=${storyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setStories((prev) => prev.map(storyUser => (
          storyUser.user._id === currentUser?._id
            ? { ...storyUser, stories: storyUser.stories.filter((s: Story) => s._id !== storyId) }
            : storyUser
        )));
        toast.success('Story deleted');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete story');
      }
    } catch (error) {
      toast.error('Failed to delete story');
    }
  };

  const handleStoryViewerClose = () => {
    setViewingStory(null);
  };

  const handleStoryIndexChange = (index: number) => {
    if (viewingStory) {
      setViewingStory((prev) => (prev ? { ...prev, currentIndex: index } : null));
    }
  };
  
  const handleStoryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Only images and videos are allowed');
      return;
    }

    try {
      setUploadingStory(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch(`/api/stories`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Story posted!');
        fetchStories(); 
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload story');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload story');
    } finally {
      setUploadingStory(false);
      if (storyInputRef.current) {
        storyInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen-safe bg-background text-chat-text-secondary gap-4 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="ambient-glow">
          <div className="ambient-glow-inner" />
        </div>
        <div className="w-12 h-12 border-4 border-chat-border border-t-chat-accent rounded-full animate-spin relative z-10" />
        <p className="text-chat-text-secondary font-medium animate-pulse relative z-10">
          Loading your messages...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen-safe bg-background text-chat-text-primary overflow-hidden relative">
      {/* Signature Ambient Gradient */}
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      {/* 1. Global Navigation Sidebar */}
      <div className="relative z-[100]">
        <SideBar
          currentUser={currentUser || undefined}
          isMobileDrawerOpen={false}
          onCloseMobileDrawer={() => {}}
        />
      </div>

      <main className="flex flex-1 overflow-hidden relative z-10">
        {/* 2. Conversations List Panel — hidden on mobile when a chat is open */}
        <div
          className={`
          relative flex-shrink-0 border-r border-chat-border bg-chat-glass backdrop-blur-md
          transition-all duration-300 ease-in-out
          w-full md:w-[320px] lg:w-[360px]
          ${chatId ? 'hidden md:block' : 'block'}
        `}
        >
          {/* StoryBar - horizontal scroll row at top of ChatList */}
          {currentUser && (
            <StoryBar
              currentUserId={currentUser._id}
              currentUserAvatar={currentUser.avatar}
              currentUserUsername={currentUser.username}
              stories={allStoriesUsers}
              hasUnviewedStories={hasUnviewedStories}
              onStoryClick={handleStoryClick}
              onMyStoryClick={handleMyStoryClick}
              onStoryUploaded={fetchStories}
            />
          )}
          <ChatList
            currentUserId={currentUser?._id}
            selectedChatId={chatId}
            onChatSelect={(id: string) => router.push(`/chat/${id}`)}
            onNewChat={() => setShowNewChatModal(true)}
            onMenuClick={() => {}}
            onViewProfile={(userId: string) => setViewingProfile({ isOpen: true, userId })}
            storiesUsers={allStoriesUsers}
            onStoryClick={handleStoryClick}
          />
        </div>

        {/* 3. Chat Window Panel — full width on mobile, flex-1 on desktop */}
        <div
          className={`
          flex-1 flex flex-col min-w-0 bg-transparent
          ${chatId ? 'block' : 'hidden md:flex'}
        `}
        >
          {chatId && currentUser ? (
            <ChatWindow
              chatId={chatId}
              currentUserId={currentUser._id}
              currentUserUsername={currentUser.username}
              recipientUsername={chatMetadata.name}
              recipientAvatar={chatMetadata.avatar}
              isGroup={chatMetadata.isGroup}
              groupAdminId={selectedChat?.groupAdmin}
              participants={selectedChat?.participants}
              onMenuClick={() => {}}
              recipientStoriesUser={allStoriesUsers.find(u => u.user._id === selectedChat?.participants.find(p => p._id !== currentUser?._id)?._id)}
              onStoryClick={handleStoryClick}
              onChatUpdated={handleChatUpdated}
              onViewStory={handleViewStoryById}
              selectedChat={selectedChat}
            />
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-chat-accent/10 blur-3xl rounded-full" />
                <svg
                  className="relative w-32 h-32 text-chat-border animate-[float_3s_ease-in-out_infinite]"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M60 35c-15 0-27 10-27 22 0 4.5 1.5 8.7 4 12.2V83l12.8-6.4c2.4.6 4.8 1 7.2 1 15 0 27-10 27-22S75 35 60 35z"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="currentColor"
                    fillOpacity="0.05"
                  />
                  <path
                    d="M45 52h30M45 62h15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-chat-text-primary mb-2">
                Select a conversation
              </h2>
              <p className="text-chat-text-secondary max-w-sm mb-8">
                Choose an existing chat from the list or start a fresh
                conversation with someone new.
              </p>

              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-6 py-3 bg-chat-accent text-white rounded-xl font-semibold hover:bg-chat-accent-hover transition-all active:scale-95 shadow-lg shadow-chat-accent/20"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </main>

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
      />

      {/* Story Viewer Modal */}
      {viewingStory && viewingStory.isOpen && (
        <StoryViewer
          stories={viewingStory.stories}
          initialIndex={viewingStory.currentIndex}
          username={viewingStory.username}
          userId={viewingStory.userId}
          userAvatar={viewingStory.userAvatar}
          onClose={handleStoryViewerClose}
          onIndexChange={handleStoryIndexChange}
          currentUserId={currentUser?._id}
          onAddStory={() => {
            handleStoryViewerClose();
          }}
          onShowViewers={() => {
            handleStoryViewerClose();
            setShowStoryManagement(true);
          }}
          onStoryViewed={markStoryAsViewed}
        />
      )}

      {/* Story Management Modal */}
      {currentUser && (
        <StoryManagementModal
          isOpen={showStoryManagement}
          onClose={() => setShowStoryManagement(false)}
          stories={allStoriesUsers.find(su => su.user._id === currentUser._id)?.stories || []}
          onDeleteStory={handleDeleteStory}
          onAddStory={() => storyInputRef.current?.click()}
          uploading={uploadingStory} 
          onViewStory={(storyId) => {
            const myStoriesUser = allStoriesUsers.find(su => su.user._id === currentUser._id);
            if (myStoriesUser) {
              const selectedStory = myStoriesUser.stories.find(s => s._id === storyId);
              if (selectedStory) {
                handleStoryClick(
                  currentUser._id, 
                  [selectedStory], 
                  currentUser.username, 
                  currentUser.avatar
                );
              }
            }
          }}
        />
      )}

      {/* User Profile Modal */}
      {viewingProfile && (
        <UserProfileModal
          isOpen={viewingProfile.isOpen}
          onClose={() => setViewingProfile(null)}
          userId={viewingProfile.userId}
        />
      )}
      
      <input
        type="file"
        ref={storyInputRef}
        onChange={handleStoryFileSelect}
        accept="image/*,video/*"
        className="hidden"
      />
    </div>
  );
}
