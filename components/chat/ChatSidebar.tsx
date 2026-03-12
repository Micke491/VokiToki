import React, { useMemo, useState, useEffect } from "react";
import { Users, Image as ImageIcon, X, Mic, Video, ShieldCheck, Link as LinkIcon, ExternalLink, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Message } from "../../types/chat";

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
}: ChatSidebarProps) => {
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  useEffect(() => {
    if (isOpen && chatId) {
      fetchMedia();
    }
  }, [isOpen, chatId]);

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

  return (
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
        <div className="p-6 flex flex-col items-center text-center border-b border-chat-border">
          <div className={`w-24 h-24 rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden ${isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-chat-accent to-chat-accent-secondary'}`}>
            {recipientAvatar ? (
              <img src={recipientAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                isGroup ? (
                    <Users className="w-12 h-12" />
                ) : (
                    recipientUsername?.charAt(0).toUpperCase() || "?"
                )
            )}
          </div>
          <h3 className="text-xl font-bold text-chat-text-primary mb-1">
            {recipientUsername}
          </h3>
        </div>

        {/* Participants Section (Groups) */}
        {isGroup && participants.length > 0 && (
          <div className="p-4 border-b border-chat-border">
            <h4 className="text-xs font-bold text-chat-text-tertiary uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Participants
            </h4>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-chat-text-secondary truncate flex items-center gap-1.5">
                      {user.username}
                      {groupAdminId === user._id && (
                        <span title="Admin">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </p>
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
                      <div className="w-full h-full flex items-center justify-center relative bg-slate-950">
                        <Video className="w-5 h-5 text-white/50" />
                         <span className="absolute bottom-1 right-1 text-[8px] text-white/80 bg-black/40 px-1 rounded">VID</span>
                      </div>
                    ) : (
                      <img
                        src={media.mediaUrl}
                        alt="Shared"
                        className="w-full h-full object-cover"
                      />
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
      </div>
    </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatSidebar;
