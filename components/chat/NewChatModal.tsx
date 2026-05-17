'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Users, MessageCircle, Check, Camera, Search } from 'lucide-react';
import { apiFetch } from "@/lib/api";
import * as ReactWindow from 'react-window';
const List = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList;

interface User {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ListItem {
  type: 'header' | 'user';
  id: string;
  label?: string;
  user?: User;
}

const ListRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
  const item = data.items[index];
  if (!item) return null;

  if (item.type === 'header') {
    return (
      <div style={style} className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-chat-text-secondary flex items-center gap-2 border-b border-chat-border/20 select-none">
        {item.label}
      </div>
    );
  }

  const user = item.user!;
  const { isGroup, selectedUsers, onToggle, onCreate, creating } = data;
  const isSelected = selectedUsers.some((u: User) => u._id === user._id);

  return (
    <div style={style} className="px-4 py-1">
      <div
        className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl transition-colors group ${
          creating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-chat-hover/50'
        } ${isGroup && isSelected ? 'bg-chat-accent/10' : ''}`}
        onClick={() => !creating && (isGroup ? onToggle(user) : onCreate(user._id))}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center font-semibold text-white text-base shadow-sm overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-chat-text-primary">
            {user.username}
          </p>
          {user.name && (
            <p className="text-xs truncate text-chat-text-secondary font-normal">
              {user.name}
            </p>
          )}
        </div>

        {isGroup && (
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            isSelected 
              ? 'bg-chat-accent border-chat-accent text-white scale-110 shadow-md shadow-chat-accent/20' 
              : 'border-chat-border group-hover:border-chat-accent/60'
          }`}>
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        )}
      </div>
    </div>
  );
};

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  
  const [suggestedContacts, setSuggestedContacts] = useState<User[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [allSearchedUsers, setAllSearchedUsers] = useState<User[]>([]);

  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    } else {
      resetModal();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setAllSearchedUsers([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery, 1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchInitialData = async () => {
    try {
      setLoadingInitial(true);
      
      const [contactsRes, recommendedRes] = await Promise.all([
        apiFetch('/api/users/suggested-contacts'),
        apiFetch('/api/users/recommended'),
      ]);

      let contacts: User[] = [];
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        contacts = contactsData.contacts || [];
        setSuggestedContacts(contacts);
      }

      if (recommendedRes.ok) {
        const recData = await recommendedRes.json();
        const filtered = (recData.users || []).filter(
          (u: User) => !contacts.some(rc => rc._id === u._id)
        );
        setRecommendedUsers(filtered.slice(0, 30));
      }
    } catch (error) {
      console.error('Error fetching initial modal data:', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const searchUsers = async (query: string, pageNum: number) => {
    try {
      setLoading(true);
      const response = await apiFetch(
        `/api/users/search?username=${encodeURIComponent(query)}&page=${pageNum}&pageSize=30`
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      
      if (pageNum === 1) {
        setAllSearchedUsers(data.users || []);
      } else {
        setAllSearchedUsers(prev => [...prev, ...(data.users || [])]);
      }
      
      setPage(pageNum);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (recipientId: string) => {
    try {
      setCreating(true);
      const response = await apiFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      });

      if (!response.ok) throw new Error('Failed to create chat');

      const chat = await response.json();
      onClose();
      router.push(`/chat/${chat._id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setCreating(false);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;

    try {
      setCreating(true);
      const payload: any = {
        name: groupName,
        participants: selectedUsers.map(u => u._id)
      };

      if (groupAvatar) {
        payload.avatar = groupAvatar;
      }

      const response = await apiFetch('/api/chats/GroupChat', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create group chat');

      const chat = await response.json();
      onClose();
      router.push(`/chat/${chat._id}`);
    } catch (error) {
      console.error('Error creating group chat:', error);
      alert('Failed to create group chat');
    } finally {
      setCreating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max 5MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await apiFetch("/api/chat/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      setGroupAvatar(uploadData.url);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      return isSelected 
        ? prev.filter(u => u._id !== user._id)
        : [...prev, user];
    });
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  };

  const resetModal = () => {
    setSearchQuery('');
    setIsGroup(false);
    setGroupName('');
    setGroupAvatar('');
    setSelectedUsers([]);
    setSuggestedContacts([]);
    setRecommendedUsers([]);
    setAllSearchedUsers([]);
    setPage(1);
    setHasMore(false);
  };

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    
    if (searchQuery.trim().length >= 1) {
      allSearchedUsers.forEach(u => {
        items.push({ type: 'user', id: u._id, user: u });
      });
    } else {
      if (suggestedContacts.length > 0) {
        items.push({ type: 'header', id: 'h-suggested', label: 'Suggested Contacts' });
        suggestedContacts.forEach(u => {
          items.push({ type: 'user', id: `s-${u._id}`, user: u });
        });
      }
      
      if (recommendedUsers.length > 0) {
        items.push({ type: 'header', id: 'h-recommended', label: 'Explore / Discover' });
        recommendedUsers.forEach(u => {
          items.push({ type: 'user', id: `r-${u._id}`, user: u });
        });
      }
    }
    
    return items;
  }, [searchQuery, allSearchedUsers, suggestedContacts, recommendedUsers]);

  const virtualScrollData = useMemo(() => ({
    items: listItems,
    isGroup,
    selectedUsers,
    onToggle: toggleUserSelection,
    onCreate: startChat,
    creating
  }), [listItems, isGroup, selectedUsers, creating]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 bg-chat-glass backdrop-blur-2xl border border-chat-border">
        
        <div className="flex items-center justify-between p-5 border-b border-chat-border flex-shrink-0">
          <h2 className="text-xl font-semibold text-chat-text-primary select-none">
            {isGroup ? 'New Group' : 'New Message'}
          </h2>
          <button
            className="p-1.5 rounded-lg transition-colors text-chat-text-secondary hover:bg-chat-hover"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 pt-4 flex-shrink-0">
          <div className="flex p-1 rounded-xl bg-chat-input">
            <button
              onClick={() => setIsGroup(false)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                !isGroup
                  ? 'bg-chat-hover text-chat-text-primary shadow-sm'
                  : 'text-chat-text-secondary'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Direct
            </button>
            <button
              onClick={() => setIsGroup(true)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                isGroup
                  ? 'bg-chat-hover text-chat-text-primary shadow-sm'
                  : 'text-chat-text-secondary'
              }`}
            >
              <Users className="w-4 h-4" />
              Group
            </button>
          </div>
        </div>

        {isGroup && (
          <div className="px-5 pt-4 flex items-center gap-4 flex-shrink-0">
            <div 
              className="relative group flex-shrink-0 cursor-pointer" 
              onClick={() => avatarInputRef.current?.click()}
              title="Upload group picture"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 border-2 border-chat-border flex items-center justify-center text-white shadow-md relative overflow-hidden transition-all group-hover:scale-105 active:scale-95">
                {uploadingAvatar ? (
                  <div className="w-full h-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : groupAvatar ? (
                  <img src={groupAvatar} alt="Group Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-7 h-7 opacity-85" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-chat-text-secondary">Group Name</label>
              <input
                type="text"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all bg-chat-input border border-chat-border text-chat-text-primary placeholder-chat-text-tertiary"
              />
            </div>
          </div>
        )}

        {isGroup && selectedUsers.length > 0 && (
          <div className="px-5 pt-3 flex flex-wrap gap-2 max-h-[85px] overflow-y-auto custom-scrollbar flex-shrink-0">
            {selectedUsers.map(user => (
              <div key={user._id} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-chat-accent/20 text-chat-accent rounded-lg text-xs font-medium border border-chat-accent/30 animate-in zoom-in-95 duration-150">
                {user.username}
                <button onClick={() => removeSelectedUser(user._id)} className="p-0.5 hover:bg-chat-accent/20 rounded-md transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative p-4 border-b border-chat-border flex-shrink-0">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-chat-text-tertiary w-5 h-5" />
          <input
            type="text"
            placeholder={isGroup ? "Search participants to add..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all bg-chat-input border border-chat-border text-chat-text-primary placeholder-chat-text-tertiary"
          />
        </div>

        <div className="flex-1 overflow-hidden min-h-[250px] max-h-[450px]">
          {loading || loadingInitial ? (
            <div className="flex flex-col items-center justify-center py-12 text-chat-text-secondary gap-3 h-full">
              <div className="w-7 h-7 border-2 border-chat-border border-t-chat-accent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading contacts...</p>
            </div>
          ) : listItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-chat-text-tertiary bg-transparent h-full">
              <p className="text-sm italic">No users found</p>
            </div>
          ) : !List ? (
            <div className="border-t border-chat-border divide-y divide-chat-border/30 overflow-y-auto h-full max-h-[380px] custom-scrollbar bg-transparent">
              {listItems.map((item) => {
                if (item.type === 'header') {
                  return (
                    <div key={item.id} className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-chat-text-secondary flex items-center gap-2 border-b border-chat-border/20 select-none bg-chat-input/10">
                      {item.label}
                    </div>
                  );
                }
                const user = item.user!;
                const isSelected = selectedUsers.some((u: User) => u._id === user._id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-6 py-2 cursor-pointer transition-colors group ${
                      creating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-chat-hover/50'
                    } ${isGroup && isSelected ? 'bg-chat-accent/10' : ''}`}
                    onClick={() => !creating && (isGroup ? toggleUserSelection(user) : startChat(user._id))}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center font-semibold text-white text-base shadow-sm overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-chat-text-primary">
                        {user.username}
                      </p>
                      {user.name && (
                        <p className="text-xs truncate text-chat-text-secondary font-normal">
                          {user.name}
                        </p>
                      )}
                    </div>
                    {isGroup && (
                      <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected 
                          ? 'bg-chat-accent border-chat-accent text-white scale-110 shadow-md shadow-chat-accent/20' 
                          : 'border-chat-border group-hover:border-chat-accent/60'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <List
              height={380}
              itemCount={listItems.length}
              itemSize={56}
              width="100%"
              itemData={virtualScrollData}
              className="custom-scrollbar"
            >
              {ListRow}
            </List>
          )}
        </div>

        {hasMore && searchQuery && !loading && (
          <div className="p-3 text-center border-t border-chat-border flex-shrink-0">
            <button
              onClick={() => searchUsers(searchQuery, page + 1)}
              className="text-xs font-semibold text-chat-accent hover:underline"
            >
              Load More Results
            </button>
          </div>
        )}

        {isGroup && (
          <div className="p-4 border-t border-chat-border bg-chat-input flex-shrink-0">
            <button
              onClick={createGroupChat}
              disabled={creating || !groupName.trim() || selectedUsers.length < 2 || uploadingAvatar}
              className="w-full py-3 bg-chat-accent hover:bg-chat-accent-hover text-white rounded-xl font-semibold shadow-lg shadow-chat-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                `Create Group (${selectedUsers.length})`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
