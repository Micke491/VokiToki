import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface ForwardChat {
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

export function useForwardMessage(currentUserId: string, currentChatId: string) {
  const [chats, setChats] = useState<ForwardChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await apiFetch("/api/chats");
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
    setSelectedChatIds((prev: string[]) =>
      prev.includes(chatId) ? prev.filter((id: string) => id !== chatId) : [...prev, chatId]
    );
  };

  const filteredChats = chats.filter((chat: ForwardChat) => {
    if (chat._id === currentChatId) return false;

    let chatName = "";
    if (chat.isGroupChat) {
      chatName = chat.name || "Group Chat";
    } else {
      const other = chat.participants?.find((p: any) => String(p._id) !== String(currentUserId));
      chatName = other?.username || "Unknown User";
    }

    if (!searchQuery) return true;
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatDisplayInfo = (chat: ForwardChat) => {
    const chatName = chat.isGroupChat
      ? chat.name || "Group Chat"
      : chat.participants?.find((p: any) => String(p._id) !== String(currentUserId))?.username || "Unknown User";
    const avatar = chat.isGroupChat
      ? chat.avatar
      : chat.participants.find((p: any) => p._id !== currentUserId)?.avatar;
    return { chatName, avatar };
  };

  return {
    loading,
    searchQuery,
    setSearchQuery,
    selectedChatIds,
    toggleSelect,
    filteredChats,
    getChatDisplayInfo,
  };
}
