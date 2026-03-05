import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

interface Chat {
  _id: string;
  name?: string;
  isGroupChat?: boolean;
  avatar?: string;
  participants: Array<{
    _id: string;
    username: string;
    avatar?: string;
  }>;
}

interface ForwardMessageModalProps {
  currentUserId: string;
  currentChatId: string;
  onForward: (chatIds: string[]) => void;
  onClose: () => void;
}

const ForwardMessageModal = ({ currentUserId, currentChatId, onForward, onClose }: ForwardMessageModalProps) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch("/api/chats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setChats(data);
        }
      } catch (error) {
        console.error("Failed to fetch chats for forwarding", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const toggleSelect = (chatId: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleForward = () => {
    if (selectedChatIds.length > 0) {
      onForward(selectedChatIds);
      onClose();
    }
  };

  const filteredChats = chats.filter((chat) => {
    if (chat._id === currentChatId) return false;
    
    const chatName = chat.isGroupChat
      ? chat.name
      : chat.participants.find((p) => p._id !== currentUserId)?.username;
    return chatName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Forward Message</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">Loading chats...</div>
          ) : filteredChats.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No chats found.</div>
          ) : (
            filteredChats.map((chat) => {
              const chatName = chat.isGroupChat
                ? chat.name
                : chat.participants.find((p) => p._id !== currentUserId)?.username || "Unknown";
              const avatar = chat.isGroupChat
                ? chat.avatar
                : chat.participants.find((p) => p._id !== currentUserId)?.avatar;
              const isSelected = selectedChatIds.includes(chat._id);

              return (
                <div
                  key={chat._id}
                  onClick={() => toggleSelect(chat._id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden flex-shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      chatName?.charAt(0).toUpperCase()
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="flex-1 font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                    {chatName}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={selectedChatIds.length === 0}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
              selectedChatIds.length === 0
                ? "bg-blue-400 cursor-not-allowed opacity-70"
                : "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
            }`}
          >
            Forward {selectedChatIds.length > 0 ? `(${selectedChatIds.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
