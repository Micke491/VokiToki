import React from "react";
import { Users, Image as ImageIcon, X, Video, ShieldCheck, Link as LinkIcon, Loader2, Edit2, LogOut, UserPlus, Trash2, Save, Camera, MessageSquareX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Message } from "@/features/chat/types/chat";
import AddParticipantModal from "@/features/chat/components/AddParticipantModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ImagePreviewModal from "@/components/ui/ImagePreviewModal";
import { useChatSidebar, Participant } from "@/features/chat/hooks/useChatSidebar";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isGroup: boolean;
  chatId?: string;
  wallpaper?: string | null;
  setWallpaper?: (url: string | null) => void;
  participants?: Participant[];
  recipientUsername?: string;
  recipientAvatar?: string;
  messages: Message[];
  groupAdminId?: string;
  currentUserId?: string;
  onViewProfile?: (userId: string) => void;
  isBlocked?: boolean;
  isDeleted?: boolean;
  onChatUpdated?: (updatedChat: any) => void;
}

const ChatSidebar = ({
  isOpen,
  onClose,
  isGroup,
  chatId,
  wallpaper,
  setWallpaper,
  participants = [],
  recipientUsername,
  recipientAvatar,
  messages,
  groupAdminId,
  currentUserId,
  onViewProfile,
  isBlocked,
  isDeleted,
  onChatUpdated,
}: ChatSidebarProps) => {
  const {
    sharedMedia,
    loadingMedia,
    previewMediaUrl,
    setPreviewMediaUrl,
    previewMediaType,
    setPreviewMediaType,
    isEditingGroup,
    setIsEditingGroup,
    editGroupName,
    setEditGroupName,
    isSavingGroupInfo,
    isLeaving,
    showAddModal,
    setShowAddModal,
    isUploadingAvatar,
    avatarInputRef,
    confirmModal,
    setConfirmModal,
    localParticipants,
    localGroupAdminId,
    isAdmin,
    handleUpdateGroupInfo,
    handleRemoveParticipant,
    handleChangeAdmin,
    handleLeaveOrRemove,
    handleRemoveAvatar,
    handleAvatarUpload,
  } = useChatSidebar({
    chatId,
    isGroup,
    participants,
    recipientUsername,
    messages,
    groupAdminId,
    currentUserId,
    onChatUpdated,
    isOpen,
  });

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0, stiffness: 300, damping: 30 }}
          className="border-l border-chat-border bg-chat-glass backdrop-blur-md flex flex-col h-full overflow-hidden z-20 flex-shrink-0"
        >
          <div className="w-80 flex flex-col h-full min-w-[320px]">
            {/* Header */}
            <div className="p-4 border-b border-chat-border flex items-center justify-between">
        <h2 className="font-bold text-chat-text-primary">
          {isGroup ? "Group Info" : "User Info"}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-chat-hover rounded-full text-chat-text-tertiary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center text-center border-b border-chat-border relative">
          <div className="relative group">
            <div className={`w-24 h-24 rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden transition-all ${isGroup && isAdmin ? 'ring-offset-2 ring-chat-accent ring-2 scale-105' : ''} ${isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-chat-accent to-chat-accent-secondary'}`}>
              {isUploadingAvatar ? (
                <div className="w-full h-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              ) : recipientAvatar ? (
                <img src={recipientAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                  isGroup ? (
                      <Users className="w-12 h-12" />
                  ) : (
                      recipientUsername?.charAt(0).toUpperCase() || "?"
                  )
              )}
            </div>
            
            {isGroup && isAdmin && (
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
                  disabled={isUploadingAvatar}
                  className="absolute bottom-4 right-0 p-2 bg-chat-accent text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                  title="Change group photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                {recipientAvatar && (
                  <button 
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-4 -left-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                    title="Remove group photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
          {isGroup && isAdmin ? (
             <div className="flex items-center gap-2 mb-1 w-full justify-center">
                {isEditingGroup ? (
                   <div className="flex items-center gap-1 w-full max-w-[200px]">
                      <input 
                         type="text"
                         className="flex-1 bg-chat-bg-secondary px-2 py-1 rounded border border-chat-border text-sm outline-none text-chat-text-primary"
                         value={editGroupName}
                         onChange={(e) => setEditGroupName(e.target.value)}
                         autoFocus
                      />
                      <button 
                         onClick={handleUpdateGroupInfo}
                         disabled={isSavingGroupInfo}
                         className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50"
                      >
                         {isSavingGroupInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button 
                         onClick={() => setIsEditingGroup(false)}
                         className="p-1.5 hover:bg-chat-hover text-chat-text-tertiary rounded transition-colors"
                      >
                         <X className="w-4 h-4" />
                      </button>
                   </div>
                ) : (
                   <div className="flex items-center gap-2 group cursor-pointer justify-center" onClick={() => setIsEditingGroup(true)}>
                      <h3 className="text-xl font-bold text-chat-text-primary">
                        {recipientUsername}
                      </h3>
                      <Edit2 className="w-4 h-4 text-chat-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                   </div>
                )}
             </div>
          ) : (
            <h3 className="text-xl font-bold text-chat-text-primary mb-1">
              {recipientUsername}
            </h3>
          )}
        </div>

        {/* Participants Section (Groups) */}
        {isGroup && localParticipants.length > 0 && (
          <div className="p-4 border-b border-chat-border">
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-xs font-bold text-chat-text-tertiary uppercase tracking-widest flex items-center gap-2">
                 <Users className="w-3.5 h-3.5" />
                 Participants
               </h4>
               <button
                  onClick={() => setShowAddModal(true)}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors flex items-center gap-1"
                  title="Add user"
               >
                  <UserPlus className="w-4 h-4" />
               </button>
            </div>
            <div className="space-y-3">
              {localParticipants.map((user, index) => (
                <div
                  key={user._id || index}
                  className={`flex items-center gap-3 group ${user._id !== currentUserId && onViewProfile ? 'cursor-pointer hover:bg-chat-hover rounded-xl p-2 -m-2 transition-colors' : ''}`}
                  onClick={() => {
                    if (user._id !== currentUserId && onViewProfile) {
                      onViewProfile(user._id);
                    }
                  }}
                >
                  <div className="relative w-9 h-9 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-chat-bg-secondary flex items-center justify-center text-sm font-bold text-chat-text-tertiary overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username || "Avatar"} className="w-full h-full object-cover" />
                      ) : (
                        (user.username || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <p className="text-sm font-semibold text-chat-text-secondary truncate flex items-center gap-1.5">
                      {user.username || "Unknown User"}
                      {user._id === currentUserId && (
                        <span className="text-xs text-chat-text-tertiary font-normal">(you)</span>
                      )}
                      {localGroupAdminId === user._id && (
                        <span title="Admin">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </p>
                    {isAdmin && localGroupAdminId !== user._id && (
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <button
                             onClick={(e) => {
                                e.stopPropagation();
                                handleChangeAdmin(user._id, user.username || "this user");
                             }}
                             className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full"
                             title="Make admin"
                          >
                             <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                             onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveParticipant(user._id);
                             }}
                             className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                             title="Remove user"
                          >
                             <X className="w-4 h-4" />
                          </button>
                       </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared Media Section */}
        <div className="p-4">
          <h4 className="text-xs font-bold text-chat-text-tertiary uppercase tracking-widest mb-4 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" />
            Shared Media & Links
          </h4>
          
          {loadingMedia ? (
             <div className="py-8 flex flex-col items-center justify-center text-chat-text-tertiary">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-xs">Loading media...</p>
             </div>
          ) : !sharedMedia || sharedMedia.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-chat-text-tertiary bg-chat-bg-secondary rounded-xl border border-dashed border-chat-border">
              <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs">No media or links shared yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.map((media) => {
                const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
                const linkMatch = media.text?.match(urlRegex);
                const isLinkOnly = !media.mediaUrl && linkMatch;

                if (isLinkOnly) {
                   return (
                     <div 
                        key={media._id} 
                        className="aspect-square rounded-lg overflow-hidden bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-100 dark:border-blue-800/50 flex flex-col items-center justify-center p-2 text-center"
                        onClick={() => window.open(linkMatch[0], "_blank")}
                        title={linkMatch[0]}
                      >
                       <LinkIcon className="w-5 h-5 text-blue-500 mb-1" />
                       <span className="text-[8px] text-blue-700 dark:text-blue-400 font-medium truncate w-full">{new URL(linkMatch[0]).hostname}</span>
                     </div>
                   );
                }

                return (
                  <div 
                    key={media._id} 
                    className="aspect-square rounded-lg overflow-hidden bg-chat-bg-secondary cursor-pointer hover:opacity-80 transition-opacity border border-chat-border"
                    onClick={() => {
                      setPreviewMediaUrl(media.mediaUrl || null);
                      setPreviewMediaType(media.mediaType);
                    }}
                  >
                    {media.mediaType === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-chat-bg-secondary">
                        <Video className="w-5 h-5 text-white/30" />
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <img 
                          src={media.mediaUrl} 
                          className="w-full h-full object-cover" 
                          alt="Shared"
                        />
                        {media.mediaType === "gif" && (
                          <div className="absolute bottom-1 right-1 px-1 bg-black/60 backdrop-blur-sm rounded text-[8px] text-white font-bold select-none uppercase">
                            GIF
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="p-4 border-t border-chat-border mt-auto">
           {isGroup ? (
              <button
                onClick={() => handleLeaveOrRemove(false)}
                disabled={isLeaving}
                className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLeaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Leave Group
              </button>
           ) : (
              <button
                onClick={() => handleLeaveOrRemove(true)}
                disabled={isLeaving}
                className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLeaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareX className="w-4 h-4" />}
                Remove Chat
              </button>
           )}
        </div>
      </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    
    {isGroup && chatId && (
      <AddParticipantModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        chatId={chatId} 
        existingParticipantIds={localParticipants.map(p => p._id)} 
        currentUserId={currentUserId}
      />
    )}

    <ConfirmModal 
      isOpen={confirmModal.isOpen}
      onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      onConfirm={confirmModal.onConfirm}
      title={confirmModal.title}
      message={confirmModal.message}
      confirmText={confirmModal.confirmText}
      type={confirmModal.type}
      isLoading={isLeaving}
    />

    <ImagePreviewModal 
      imageUrl={previewMediaUrl}
      mediaType={previewMediaType}
      onClose={() => {
        setPreviewMediaUrl(null);
        setPreviewMediaType(undefined);
      }}
    />
    </>
  );
};

export default ChatSidebar;
