import React from "react";
import { X, Check, CheckCheck } from "lucide-react";
import { Message } from "@/features/chat/types/chat";

interface Participant {
  _id?: string;
  id?: string;
  username?: string;
  avatar?: string;
}

interface ReadReceiptModalProps {
  message: Message;
  onClose: () => void;
  currentUserId: string;
  participants?: Participant[];
}

const ReadReceiptModal = ({ message, onClose, currentUserId, participants = [] as Participant[] }: ReadReceiptModalProps) => {
  const rawReadReceipts = ((message.readBy ?? []) as any[]).filter((r: any) => {
    const rId = typeof r.userId === "object" ? (r.userId._id || r.userId.id) : r.userId;
    return rId !== currentUserId;
  });

  const uniqueReceiptsMap = new Map<string, any>();

  rawReadReceipts.forEach((receipt) => {
    const userIdStr = typeof receipt.userId === "object"
      ? (receipt.userId._id || receipt.userId.id)
      : receipt.userId;

    if (userIdStr) {
      const existing = uniqueReceiptsMap.get(userIdStr);
      if (!existing || new Date(receipt.readAt) > new Date(existing.readAt)) {
        uniqueReceiptsMap.set(userIdStr, receipt);
      }
    }
  });

  const readByUsers = Array.from(uniqueReceiptsMap.values());

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-chat-glass backdrop-blur-2xl rounded-2xl shadow-2xl border border-chat-border flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-chat-border">
          <h2 className="text-lg font-bold text-chat-text-primary flex items-center gap-2">
            Message Info
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-hover rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 bg-chat-bg-secondary border-b border-chat-border">
          <div className="text-sm text-chat-text-primary line-clamp-2 italic border-l-2 border-chat-accent pl-3">
            {message.text || (message.mediaUrl ? `Attached ${message.mediaType}` : "Message")}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-3">
            <h3 className="text-xs font-bold text-chat-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
              <CheckCheck className="w-4 h-4 text-chat-accent" /> Read by
            </h3>

            {readByUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-chat-text-secondary">
                No one has read this yet.
              </div>
            ) : (
              <div className="space-y-1">
                {readByUsers.map((readRecord: any, index: number) => {
                  const rawUserId = readRecord.userId;

                  const user: Participant = typeof rawUserId === "string"
                    ? (participants.find(p => (p._id || p.id) === rawUserId) ?? { _id: rawUserId })
                    : rawUserId;

                  const readAt = new Date(readRecord.readAt).toLocaleString();
                  const key = `${user._id || user}-${index}`;

                  return (
                    <div key={key} className="flex items-center gap-3 p-2 rounded-xl hover:bg-chat-hover transition-colors">
                      <div className="relative w-10 h-10 rounded-full bg-chat-bg-secondary flex-shrink-0 flex items-center justify-center font-bold text-chat-text-primary overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          user.username?.charAt(0).toUpperCase() || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-chat-text-primary text-sm truncate">
                          {user.username || "Unknown User"}
                        </div>
                        <div className="text-xs text-chat-text-secondary">
                          {readAt}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-chat-border">
             <h3 className="text-xs font-bold text-chat-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
              <Check className="w-4 h-4 text-chat-text-secondary" /> Delivered to
            </h3>
            <div className="px-1 py-2 text-sm text-chat-text-primary">
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
