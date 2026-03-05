import React from "react";
import { X, Check, CheckCheck } from "lucide-react";
import { Message } from "../../types/chat";

interface ReadReceiptModalProps {
  message: Message;
  onClose: () => void;
  currentUserId: string;
}

const ReadReceiptModal = ({ message, onClose, currentUserId }: ReadReceiptModalProps) => {
  const readByUsers = message.readBy?.filter(r => r.userId !== currentUserId) || [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Message Info
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic border-l-2 border-blue-500 pl-3">
            {message.text || (message.mediaUrl ? `Attached ${message.mediaType}` : "Message")}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
              <CheckCheck className="w-4 h-4 text-blue-500" /> Read by
            </h3>
            
            {readByUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No one has read this yet.
              </div>
            ) : (
              <div className="space-y-1">
                {readByUsers.map((readRecord: any) => {
                  const user = readRecord.userId; // Populated in API
                  const readAt = new Date(readRecord.readAt).toLocaleString();
                  
                  return (
                    <div key={user._id || user} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="relative w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          user.username?.charAt(0).toUpperCase() || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                          {user.username || "Unknown User"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {readAt}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
              <Check className="w-4 h-4 text-slate-400" /> Delivered to
            </h3>
            <div className="px-1 py-2 text-sm text-slate-600 dark:text-slate-400">
                {(message as any).deliveredTo?.length > 0 
                    ? `${(message as any).deliveredTo.length} participants` 
                    : "Unknown delivery status"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadReceiptModal;
