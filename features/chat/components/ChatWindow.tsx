"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Message, ChatWindowProps } from "@/features/chat/types/chat";
import ChatHeader from "@/features/chat/components/ChatHeader";
import MessageItem from "@/features/chat/components/MessageItem";
import MessageInput from "@/features/chat/components/MessageInput";
import ChatSidebar from "@/features/chat/components/ChatSidebar";
import ForwardMessageModal from "@/features/chat/components/ForwardMessageModal";
import ReadReceiptModal from "@/features/chat/components/ReadReceiptModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import GifPicker from "@/features/chat/components/GifPicker";
import StickerPicker from "@/features/chat/components/StickerPicker";
import EmojiPicker from "emoji-picker-react";
import ImagePreviewModal from "@/components/ui/ImagePreviewModal";
import UserProfileModal from "./UserProfileModal";
import ReportModal from "@/components/ui/ReportModal";
import StoryRing from "@/features/story/components/StoryRing";
import { motion, AnimatePresence } from "framer-motion";
import { useChatMessages } from "../hooks/useChatMessages";
import { useMessageSender } from "../hooks/useMessageSender";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";

export default function ChatWindow({
  chatId,
  currentUserId,
  currentUserUsername,
  recipientUsername,
  recipientAvatar,
  isGroup,
  groupAdminId,
  participants,
  onClose,
  onMenuClick,
  recipientStoriesUser,
  onStoryClick,
  onChatUpdated,
  onViewStory,
}: ChatWindowProps) {
  const router = useRouter();

  // 1. Messages Management Hook
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    pinnedMessages,
    typingUsers,
    unreadCountBelow,
    showScrollBadge,
    messagesEndRef,
    messagesContainerRef,
    jumpToMessage,
    scrollToBottom,
    markAllAsRead,
    handleScroll,
    firstUnreadId,
  } = useChatMessages({
    chatId,
    currentUserId,
    isGroup: !!isGroup,
  });

  // 2. Message Sender Hook
  const {
    newMessage,
    setNewMessage,
    sending,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    uploading: mediaUploading,
    showEmojiPicker,
    setShowEmojiPicker,
    showEmojiPickerInput,
    setShowEmojiPickerInput,
    showGifPicker,
    setShowGifPicker,
    showStickerPicker,
    setShowStickerPicker,
    showMoreMenu,
    setShowMoreMenu,
    wallpaper,
    setWallpaper,
    forwardingMessage,
    setForwardingMessage,
    viewingReceiptsFor,
    setViewingReceiptsFor,
    messageToDelete,
    setMessageToDelete,
    previewImage,
    setPreviewImage,
    isBlockedChat,
    viewingProfileUserId,
    setViewingProfileUserId,
    reportingMessage,
    setReportingMessage,
    recipientOnline,
    recipientLastSeen,
    inputRef,
    fileInputRef,
    handleSend,
    handleFileUpload,
    handleGifSelect,
    handleStickerSelect,
    handleKeyDown,
    handleDelete,
    confirmDeleteMessage,
    startEdit,
    startReply,
    handlePin,
    handleReaction,
    removeReaction,
    handleForwardSelection,
  } = useMessageSender({
    chatId,
    currentUserId,
    currentUserUsername,
    isGroup: !!isGroup,
    scrollToBottom,
    markAllAsRead,
  });

  // 3. Voice Recorder Hook
  const {
    isRecording,
    recordingDuration,
    uploading: voiceUploading,
    startRecording,
    stopRecording,
    cancelRecording,
    formatRecordingTime,
  } = useVoiceRecorder({
    chatId,
    currentUserId,
    replyingToId: replyingTo?._id,
    setReplyingTo,
    scrollToBottom,
    inputRef,
  });

  const uploading = mediaUploading || voiceUploading;
  const isRecipientDeleted = !isGroup && (recipientUsername === "Unknown User" || !recipientUsername);

  const handleCallAction = React.useCallback((type: "voice" | "video", callId?: string) => {
    if (isRecipientDeleted) {
      alert("You cannot call a deleted account.");
      return;
    }
    if (isBlockedChat) {
      alert("You cannot call this user. There is a block between you.");
      return;
    }
    const calleeId = !isGroup && participants ? participants.find(p => p._id !== currentUserId)?._id : undefined;
    window.dispatchEvent(new CustomEvent("start-call", {
      detail: {
        chatId,
        type,
        calleeId,
        callId,
        calleeName: recipientUsername,
        calleeAvatar: recipientAvatar,
      }
    }));
  }, [chatId, isRecipientDeleted, isBlockedChat, isGroup, participants, currentUserId, recipientUsername, recipientAvatar]);

  const [showSidebar, setShowSidebar] = React.useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-chat-text-secondary">
        <div className="w-10 h-10 mb-4 border-4 border-chat-border border-t-chat-accent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading messages...</p>
      </div>
    );
  }

  const filteredMessages = messages; // Search filter not requested or used globally

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative transition-colors duration-300">
      {forwardingMessage && (
        <ForwardMessageModal
          currentUserId={currentUserId}
          currentChatId={chatId}
          onForward={handleForwardSelection}
          onClose={() => setForwardingMessage(null)}
        />
      )}

      {viewingReceiptsFor && (
        <ReadReceiptModal
          message={viewingReceiptsFor}
          currentUserId={currentUserId}
          participants={participants || []}
          onClose={() => setViewingReceiptsFor(null)}
        />
      )}

      <ChatHeader
        recipientUsername={recipientUsername}
        recipientAvatar={recipientAvatar}
        recipientId={!isGroup && participants ? participants.find(p => p._id !== currentUserId)?._id : undefined}
        isGroup={isGroup}
        onClose={() => (onClose ? onClose() : router.push("/chat"))}
        showSearch={false}
        setShowSearch={() => {}}
        searchQuery=""
        setSearchQuery={() => {}}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onMenuClick={onMenuClick}
        chatId={chatId}
        currentUserId={currentUserId}
        currentUserUsername={currentUserUsername || "User"}
        onViewProfile={(userId: string) => setViewingProfileUserId(userId)}
        recipientOnline={recipientOnline}
        recipientLastSeen={recipientLastSeen}
        recipientStoriesUser={recipientStoriesUser}
        onStoryClick={onStoryClick}
        onCallStart={(callType: "voice" | "video") => {
          if (isRecipientDeleted) {
            alert("You cannot call a deleted account.");
            return;
          }
          if (isBlockedChat) {
            alert("You cannot call this user. There is a block between you.");
            return;
          }
          const calleeId = !isGroup && participants ? participants.find(p => p._id !== currentUserId)?._id : undefined;
          window.dispatchEvent(new CustomEvent("start-call", {
            detail: {
              chatId,
              type: callType,
              calleeId,
              calleeName: recipientUsername,
              calleeAvatar: recipientAvatar,
            }
          }));
        }}
        isBlocked={isBlockedChat}
        isDeleted={isRecipientDeleted}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div
            className="flex-1 overflow-y-auto custom-scrollbar relative"
            ref={messagesContainerRef}
            onScroll={handleScroll}
            style={{
              backgroundImage: wallpaper ? `url(${wallpaper})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }}
          >
            {/* Ambient Overlay for Wallpaper */}
            {wallpaper && (
              <div className="absolute inset-0 bg-chat-bg-primary/40 backdrop-blur-[2px] pointer-events-none" />
            )}

            {pinnedMessages.length > 0 && (
              <div className="sticky top-0 z-30 mb-6 bg-chat-bg-primary/90 backdrop-blur-md rounded-xl shadow-sm border border-chat-border overflow-hidden text-sm">
                <div className="px-3 py-2 border-b border-chat-border flex items-center gap-2 text-xs font-semibold text-chat-text-tertiary bg-chat-bg-secondary">
                  <span className="flex-1">Pinned Message</span>
                  <button 
                    onClick={() => handlePin(pinnedMessages[0])}
                    className="hover:text-red-500 transition-colors"
                  >
                    Unpin
                  </button>
                </div>
                <div>
                  {pinnedMessages.slice(0, 1).map((msg) => (
                    <div
                      key={`pinned-${msg._id}`}
                      className="px-4 py-2 hover:bg-chat-bg-secondary cursor-pointer flex flex-col gap-1 transition-colors"
                      onClick={() => jumpToMessage(msg._id)}
                    >
                      <div className="flex items-center gap-2 text-xs text-chat-text-tertiary">
                        <span className="font-semibold text-chat-text-primary">
                          {msg.sender?.username || msg.senderUsername || "Unknown User"}
                        </span>
                      </div>
                      <div className="text-chat-text-secondary line-clamp-1 text-xs">
                        {msg.text ||
                          (msg.mediaUrl
                            ? `Attached ${msg.mediaType === "video" ? "Video" : msg.mediaType === "gif" ? "GIF" : msg.mediaType === "audio" ? "Voice record" : "Photo"}`
                            : "Pinned Message")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 h-full text-center">
                <div className="w-20 h-20 bg-chat-bg-secondary rounded-full flex items-center justify-center mb-6">
                  <svg
                    className="w-10 h-10 text-chat-text-tertiary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-chat-text-primary mb-2">
                  No messages yet
                </h3>
                <p className="text-chat-text-secondary max-w-xs">
                  Send a message to start the conversation!
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-6 min-h-full flex flex-col justify-end relative z-10">
                {!hasMore && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="relative mb-4">
                      {isGroup ? (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl overflow-hidden ring-4 ring-chat-bg-primary">
                          {recipientAvatar ? (
                            <img src={recipientAvatar} alt={recipientUsername} className="w-full h-full object-cover" />
                          ) : (
                            (recipientUsername || "G").charAt(0).toUpperCase()
                          )}
                        </div>
                      ) : (
                        <StoryRing
                          size="xl"
                          avatarUrl={recipientAvatar}
                          username={recipientUsername || "?"}
                          showLabel={false}
                          hasStory={(recipientStoriesUser?.stories?.length || 0) > 0}
                          hasUnviewedStory={(recipientStoriesUser?.stories?.length || 0) > 0 && (recipientStoriesUser?.stories || []).some((s: any) => !(s.viewedBy || []).some((v: any) => v.userId === currentUserId))}
                          onClick={() => {
                            const otherUser = participants?.find(p => p._id !== currentUserId);
                            if (recipientStoriesUser?.stories && recipientStoriesUser.stories.length > 0 && onStoryClick) {
                              onStoryClick(recipientStoriesUser.user._id, recipientStoriesUser.stories, recipientStoriesUser.user.username, recipientStoriesUser.user.avatar);
                            } else if (otherUser) {
                              setViewingProfileUserId(otherUser._id);
                            }
                          }}
                        />
                      )}
                    </div>

                    <h2 className="text-2xl font-bold text-chat-text-primary mb-1">
                      {recipientUsername || (isGroup ? "Group Chat" : "Chat")}
                    </h2>
                    
                    {!isGroup && recipientUsername && (
                      <p className="text-sm text-chat-text-secondary mb-6 font-medium">
                        {recipientUsername}
                      </p>
                    )}
                    
                    {isGroup && (
                      <p className="text-sm text-chat-text-secondary mb-6 font-medium">
                         Group Chat · {participants?.length || 0} participants
                      </p>
                    )}

                    <button
                      onClick={() => {
                        if (isGroup) {
                          setShowSidebar(true);
                        } else {
                          const otherUser = participants?.find(p => p._id !== currentUserId);
                          if (otherUser) setViewingProfileUserId(otherUser._id);
                        }
                      }}
                      className="px-6 py-2 bg-chat-bg-secondary hover:bg-chat-bg-tertiary text-chat-text-primary text-sm font-semibold rounded-lg transition-all active:scale-95 shadow-sm border border-chat-border"
                    >
                      {isGroup ? "View Group Info" : "View Profile"}
                    </button>
                  </div>
                )}
                {loadingMore && (
                  <div className="flex justify-center py-2">
                    <div className="w-5 h-5 border-2 border-chat-border border-t-chat-accent rounded-full animate-spin" />
                  </div>
                )}
                {filteredMessages.map((message, index) => {
                  const isOwn = message.sender && message.sender._id === currentUserId;
                  const showDate =
                    index === 0 ||
                    new Date(message.createdAt).toDateString() !==
                      new Date(
                        filteredMessages[index - 1].createdAt,
                      ).toDateString();

                  const isFirstUnread = firstUnreadId === message._id;

                  return (
                    <div key={message._id}>
                      {isFirstUnread && (
                        <div id="unread-separator" className="flex items-center justify-center my-6 py-2 select-none">
                          <div className="flex-1 h-[1px] bg-chat-accent/30" />
                          <span className="mx-4 text-xs font-semibold tracking-wide text-chat-accent bg-chat-accent/10 px-3.5 py-1.5 rounded-full border border-chat-accent/20 shadow-sm transition-all duration-300">
                            New Messages
                          </span>
                          <div className="flex-1 h-[1px] bg-chat-accent/30" />
                        </div>
                      )}
                      <div id={`msg-${message._id}`}>
                        <MessageItem
                          message={message}
                          currentUserId={currentUserId}
                          searchQuery=""
                          isOwn={isOwn || false}
                          showDate={showDate}
                          dateLabel={formatDate(message.createdAt)}
                          onReply={startReply}
                          onEdit={startEdit}
                          onDelete={handleDelete}
                          onPin={handlePin}
                          onForward={setForwardingMessage}
                          onViewStatus={setViewingReceiptsFor}
                          onReaction={handleReaction}
                          onRemoveReaction={removeReaction}
                          scrollToBottom={scrollToBottom}
                          showEmojiPicker={showEmojiPicker}
                          setShowEmojiPicker={setShowEmojiPicker}
                          showMoreMenu={showMoreMenu}
                          setShowMoreMenu={setShowMoreMenu}
                          chatId={chatId}
                          isGroup={isGroup}
                          groupAdminId={groupAdminId}
                          onJumpToMessage={jumpToMessage}
                          onPreviewImage={setPreviewImage}
                          onCallAction={handleCallAction}
                          onReport={setReportingMessage}
                          onViewStory={onViewStory}
                          recipientUsername={recipientUsername}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <AnimatePresence>
            {showGifPicker && (
              <GifPicker 
                key="gif-picker"
                onSelect={handleGifSelect}
                onClose={() => setShowGifPicker(false)}
              />
            )}
            {showStickerPicker && (
              <StickerPicker 
                key="sticker-picker"
                onSelect={handleStickerSelect}
                onClose={() => setShowStickerPicker(false)}
              />
            )}
            {showEmojiPickerInput && (
              <motion.div
                key="emoji-picker"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-20 left-4 z-[100] shadow-2xl"
              >
                 <EmojiPicker
                   onEmojiClick={(emojiData) => {
                     setNewMessage(newMessage + emojiData.emoji);
                     setShowEmojiPickerInput(false);
                     inputRef.current?.focus();
                   }}
                   theme={"auto" as any}
                 />
              </motion.div>
            )}
            {showScrollBadge && (
              <motion.button
                key="scroll-badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-24 right-8 z-30 p-3 bg-chat-accent text-white rounded-full shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
              >
                <ChevronDown className="w-6 h-6" />
                {unreadCountBelow > 0 && (
                  <span className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-chat-bg-primary">
                    {unreadCountBelow}
                  </span>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          <ImagePreviewModal 
            imageUrl={previewImage}
            onClose={() => setPreviewImage(null)}
          />

          <div className="h-6 px-6 flex items-center bg-transparent relative z-20">
            <AnimatePresence>
              {typingUsers.length > 0 && !isRecipientDeleted && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-center gap-2 text-chat-text-tertiary"
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-chat-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-chat-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-chat-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-medium text-[11px] italic">
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers.length} people are typing...`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* READ-ONLY BANNER OR MESSAGE INPUT */}
          {isBlockedChat ? (
            <div className="p-4 bg-chat-bg-primary border-t border-chat-border shrink-0 flex items-center justify-center">
              <span className="px-4 py-2.5 bg-chat-bg-secondary rounded-xl text-sm text-chat-text-secondary font-medium border border-chat-border shadow-sm text-center">
                You can&apos;t send messages to this conversation. A block exists between you and this user.
              </span>
            </div>
          ) : isRecipientDeleted ? (
            <div className="p-4 bg-chat-bg-primary border-t border-chat-border shrink-0 flex items-center justify-center">
              <span className="px-4 py-2.5 bg-chat-bg-secondary rounded-xl text-sm text-chat-text-secondary font-medium border border-chat-border shadow-sm text-center">
                This account has been deleted. You can no longer send messages or call.
              </span>
            </div>
          ) : (
            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              editingMessage={editingMessage}
              setEditingMessage={setEditingMessage}
              sending={sending}
              uploading={uploading}
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              handleSend={handleSend}
              handleFileUpload={handleFileUpload}
              handleKeyDown={handleKeyDown}
              startRecording={startRecording}
              stopRecording={stopRecording}
              cancelRecording={cancelRecording}
              fileInputRef={fileInputRef}
              inputRef={inputRef}
              formatRecordingTime={formatRecordingTime}
              showGifPicker={showGifPicker}
              setShowGifPicker={(val: boolean) => {
                setShowGifPicker(val);
                if (val) {
                  setShowStickerPicker(false);
                  setShowEmojiPickerInput(false);
                }
              }}
              showStickerPicker={showStickerPicker}
              setShowStickerPicker={(val: boolean) => {
                setShowStickerPicker(val);
                if (val) {
                  setShowGifPicker(false);
                  setShowEmojiPickerInput(false);
                }
              }}
              showEmojiPickerInput={showEmojiPickerInput}
              setShowEmojiPickerInput={(val: boolean) => {
                setShowEmojiPickerInput(val);
                if (val) {
                  setShowGifPicker(false);
                  setShowStickerPicker(false);
                }
              }}
            />
          )}
        </div>

        {showSidebar && (
          <ChatSidebar
            isOpen={showSidebar}
            onClose={() => setShowSidebar(false)}
            isGroup={isGroup || false}
            chatId={chatId}
            wallpaper={wallpaper}
            setWallpaper={setWallpaper}
            participants={participants}
            recipientUsername={recipientUsername}
            recipientAvatar={recipientAvatar}
            messages={messages}
            groupAdminId={groupAdminId}
            currentUserId={currentUserId}
            onViewProfile={(userId: string) => setViewingProfileUserId(userId)}
            isBlocked={isBlockedChat}
            isDeleted={isRecipientDeleted}
            onChatUpdated={onChatUpdated}
          />
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={!!viewingProfileUserId}
        onClose={() => setViewingProfileUserId(null)}
        userId={viewingProfileUserId || ''}
      />

      {/* Report Message Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        targetId={reportingMessage?._id || ''}
        targetType="message"
        targetName={`message from ${reportingMessage?.sender?.username}`}
      />

      <ConfirmModal 
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message for everyone? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
