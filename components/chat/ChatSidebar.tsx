"use client";

import React, { useMemo } from "react";
import { Users, Image as ImageIcon, X, Mic, Video, ShieldCheck } from "lucide-react";
import { Message } from "../../types/chat";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isGroup: boolean;
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
  participants = [],
  recipientUsername,
  recipientAvatar,
  messages,
  groupAdminId,
}: ChatSidebarProps) => {
  const sharedMedia = useMemo(() => {
    return messages.filter((m) => m.mediaUrl && !m.isDeletedForEveryone);
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300 z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 dark:text-white">
          {isGroup ? "Group Info" : "User Info"}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center text-center border-b border-slate-100 dark:border-slate-900">
          <div className={`w-24 h-24 rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden ${isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            {recipientUsername}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isGroup ? `${participants.length} Participants` : "Active Now"}
          </p>
        </div>

        {/* Participants Section (Groups) */}
        {isGroup && participants.length > 0 && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-900">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Participants
            </h4>
            <div className="space-y-3">
              {participants.map((user) => (
                <div key={user._id} className="flex items-center gap-3 group">
                  <div className="relative w-9 h-9 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-500 overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                      {user.username}
                      {groupAdminId === user._id && (
                        <span title="Admin">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
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
            Shared Media
          </h4>
          
          {sharedMedia.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs">No media shared yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.map((media) => (
                <div 
                  key={media._id} 
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer hover:opacity-80 transition-opacity border border-slate-200 dark:border-slate-700"
                  onClick={() => window.open(media.mediaUrl, "_blank")}
                >
                  {media.mediaType === "video" ? (
                    <div className="w-full h-full flex items-center justify-center relative bg-slate-950">
                      <Video className="w-5 h-5 text-white/50" />
                       <span className="absolute bottom-1 right-1 text-[8px] text-white/80 bg-black/40 px-1 rounded">VID</span>
                    </div>
                  ) : media.mediaType === "audio" ? (
                     <div className="w-full h-full flex items-center justify-center text-blue-500">
                       <Mic className="w-5 h-5" />
                     </div>
                  ) : (
                    <img
                      src={media.mediaUrl}
                      alt="Shared"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
