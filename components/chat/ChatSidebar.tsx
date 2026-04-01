import React, { useMemo, useState, useEffect } from "react";
import { Users, Image as ImageIcon, X, Mic, Video, ShieldCheck, Link as LinkIcon, ExternalLink, Loader2, Edit2, LogOut, UserPlus, Trash2, Save, Camera, Zap, MessageSquareX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Message } from "../../types/chat";
import toast from "react-hot-toast";
import AddParticipantModal from "./AddParticipantModal";
import ConfirmModal from "../ui/ConfirmModal";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isGroup: boolean;
  chatId?: string;
  wallpaper?: string | null;
  setWallpaper?: (url: string | null) => void;
  participants?: Array<{
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  }>;
  recipientUsername?: string;
  recipientAvatar?: string;
  messages: Message[];
  groupAdminId?: string;
  currentUserId?: string;
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
}: ChatSidebarProps) => {
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(recipientUsername || "");
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "info";
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "info",
  });

  const isAdmin = currentUserId === groupAdminId;

  useEffect(() => {
    if (isOpen && chatId) {
      fetchMedia();
    }
  }, [isOpen, chatId]);

  useEffect(() => {
    setEditGroupName(recipientUsername || "");
  }, [recipientUsername]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
      const isMedia = lastMsg.mediaUrl && lastMsg.mediaType !== 'audio';
      const isLink = lastMsg.text && urlRegex.test(lastMsg.text);

      if (isMedia || isLink) {
        setSharedMedia(prev => {
          if (prev.some(m => m._id === lastMsg._id)) return prev;
          return [lastMsg, ...prev];
        });
      }
    }
  }, [messages]);

  const fetchMedia = async () => {
    try {
      setLoadingMedia(true);
      const response = await fetch(`/api/chat/media/list?chatId=${chatId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSharedMedia(data);
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleUpdateGroupInfo = async () => {
    if (!editGroupName.trim() || !chatId) return;
    try {
      setIsSavingGroupInfo(true);
      const res = await fetch(`/api/chat/${chatId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: editGroupName }),
      });
      if (res.ok) {
        toast.success("Group info updated");
        setIsEditingGroup(false);
      } else {
        toast.error("Failed to update group info");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!chatId) return;

    setConfirmModal({
      isOpen: true,
      title: "Remove Participant",
      message: "Are you sure you want to remove this participant from the group?",
      confirmText: "Remove",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/chat/${chatId}/remove`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ userId }),
          });
          if (res.ok) {
            toast.success("Participant removed");
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to remove participant");
          }
        } catch (error) {
          console.error(error);
          toast.error("An error occurred");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleLeaveOrRemove = async (isRemoveOnly = false) => {
    if (!chatId) return;

    setConfirmModal({
      isOpen: true,
      title: isRemoveOnly ? "Remove Chat" : "Leave Group",
      message: isRemoveOnly 
        ? "This chat will be removed from your list. Your messages and media will be saved and restored if you message this user again."
        : "Are you sure you want to leave this group? You will no longer receive new messages.",
      confirmText: isRemoveOnly ? "Remove" : "Leave",
      type: "danger",
      onConfirm: async () => {
        try {
          setIsLeaving(true);
          const endpoint = isGroup ? `/api/chat/${chatId}/leave` : `/api/chats/${chatId}`;
          const method = isGroup ? "POST" : "DELETE";

          const res = await fetch(endpoint, {
            method,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          
          if (res.ok) {
            toast.success(isRemoveOnly ? "Chat removed" : "Left group");
            window.location.href = "/chat";
          } else {
            toast.error(`Failed to ${isRemoveOnly ? "remove" : "leave"} chat`);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        } catch (error) {
          console.error(error);
          toast.error("An error occurred");
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setIsLeaving(false);
        }
      },
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/chat/media/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();

      const res = await fetch(`/api/chat/${chatId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ avatar: uploadData.url }),
      });

      if (res.ok) {
        toast.success("Group avatar updated");
      } else {
        toast.error("Failed to update group avatar");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0, stiffness: 300, damping: 30 }}
          className="border-l border-chat-border bg-chat-bg-primary flex flex-col h-full overflow-hidden z-20 flex-shrink-0"
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
        {isGroup && participants.length > 0 && (
          <div className="p-4 border-b border-chat-border">
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-xs font-bold text-chat-text-tertiary uppercase tracking-widest flex items-center gap-2">
                 <Users className="w-3.5 h-3.5" />
                 Participants
               </h4>
               {isAdmin && (
                  <button
                     onClick={() => setShowAddModal(true)}
                     className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors flex items-center gap-1"
                     title="Add user"
                  >
                     <UserPlus className="w-4 h-4" />
                  </button>
               )}
            </div>
            <div className="space-y-3">
              {participants.map((user) => (
                <div key={user._id} className="flex items-center gap-3 group">
                  <div className="relative w-9 h-9 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-chat-bg-secondary flex items-center justify-center text-sm font-bold text-chat-text-tertiary overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <p className="text-sm font-semibold text-chat-text-secondary truncate flex items-center gap-1.5">
                      {user.username}
                      {groupAdminId === user._id && (
                        <span title="Admin">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </p>
                    {isAdmin && groupAdminId !== user._id && (
                       <button
                          onClick={() => handleRemoveParticipant(user._id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Remove user"
                       >
                          <X className="w-4 h-4" />
                       </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared Media Section */}
        <div className="p-4">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" />
            Shared Media & Links
          </h4>
          
          {loadingMedia ? (
             <div className="py-8 flex flex-col items-center justify-center text-chat-text-tertiary">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-xs">Loading media...</p>
             </div>
          ) : sharedMedia.length === 0 ? (
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
                    onClick={() => window.open(media.mediaUrl, "_blank")}
                  >
                    {media.mediaType === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-950">
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
        {/* Wallpaper Section */}
        {setWallpaper && (
          <div className="p-4 border-t border-chat-border">
            <h4 className="text-xs font-bold text-chat-text-tertiary uppercase tracking-widest mb-3 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" />
              Chat Wallpaper
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1553095066-5014bc7b7f2d?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1604079628040-94301bb21b91?auto=format&fit=crop&q=80&w=800",
              ].map((url) => (
                <button
                  key={url}
                  onClick={() => {
                    if (chatId) localStorage.setItem(`chat-wallpaper-${chatId}`, url);
                    setWallpaper(url);
                  }}
                  className={`h-14 rounded-lg bg-cover bg-center border-2 transition-all hover:scale-105 ${
                    wallpaper === url
                      ? "border-chat-accent shadow-md shadow-chat-accent/30"
                      : "border-transparent hover:border-chat-border"
                  }`}
                  style={{ backgroundImage: `url(${url})` }}
                />
              ))}
            </div>
            {wallpaper && (
              <button
                onClick={() => {
                  if (chatId) localStorage.removeItem(`chat-wallpaper-${chatId}`);
                  setWallpaper(null);
                }}
                className="w-full py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Remove Wallpaper
              </button>
            )}
          </div>
        )}

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
        existingParticipantIds={participants.map(p => p._id)} 
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
    </>
  );
};

export default ChatSidebar;