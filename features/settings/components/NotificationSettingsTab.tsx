'use client';

import { useState, useEffect } from 'react';
import { Loader2, Bell, BellOff, BellRing, Info, Shield, VolumeX, Volume2 } from 'lucide-react';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface MutedChatItem {
  chatId: string;
  chatName?: string;
  mutedUntil: string;
}

export default function NotificationSettingsTab() {
  const {
    notifEnabled,
    notifPermission,
    requestingPermission,
    handleToggleNotifications,
    handleRequestPermission,
  } = useNotificationSettings();

  const [mutedChats, setMutedChats] = useState<MutedChatItem[]>([]);
  const [loadingMuted, setLoadingMuted] = useState(true);

  const fetchMutedChats = async () => {
    try {
      const res = await apiFetch('/api/chats/muted');
      if (res.ok) {
        const data = await res.json();
        setMutedChats(data.mutedChats || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMuted(false);
    }
  };

  useEffect(() => {
    fetchMutedChats();
  }, []);

  const handleUnmute = async (chatId: string) => {
    try {
      const res = await apiFetch(`/api/chats/unmute?chatId=${chatId}`, { method: 'POST' });
      if (res.ok) {
        setMutedChats(prev => prev.filter(item => item.chatId !== chatId));
        toast.success('Chat unmuted');
      }
    } catch (err) {
      toast.error('Failed to unmute chat');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
          <Bell className="w-6 h-6 text-chat-accent" />
          Notification Preferences
        </h2>

        <div className="space-y-4">
          <div className="bg-chat-input border border-chat-border rounded-2xl p-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                {notifEnabled ? <BellRing className="w-4 h-4 text-chat-accent" /> : <BellOff className="w-4 h-4 text-chat-text-tertiary" />}
                Push Notifications
              </h3>
              <p className="text-sm text-chat-text-secondary mt-1 max-w-sm">
                Receive browser notifications for new messages and incoming calls.
              </p>
            </div>
            <button
              onClick={handleToggleNotifications}
              role="switch"
              aria-checked={notifEnabled}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${notifEnabled ? 'bg-chat-accent' : 'bg-chat-border'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${notifEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Muted Chats Manager list */}
      <div className="border-t border-chat-border/40 pt-6">
        <h3 className="text-lg font-bold text-chat-text-primary mb-4 flex items-center gap-2">
          <VolumeX className="w-5 h-5 text-amber-500" />
          Muted Chats Manager
        </h3>
        
        {loadingMuted ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-chat-accent" />
          </div>
        ) : mutedChats.length === 0 ? (
          <p className="text-sm text-chat-text-tertiary italic">No currently muted conversations.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {mutedChats.map((chat) => (
              <div key={chat.chatId} className="flex items-center justify-between bg-chat-input/50 p-4 border border-chat-border rounded-xl">
                <div>
                  <p className="text-sm font-bold text-chat-text-primary">Muted Chat</p>
                  <p className="text-xs text-chat-text-tertiary mt-0.5">
                    Muted until: {new Date(chat.mutedUntil).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleUnmute(chat.chatId)}
                  className="px-4 py-1.5 text-xs font-bold text-chat-text-primary bg-chat-bg-secondary border border-chat-border rounded-lg hover:bg-chat-hover transition-colors"
                >
                  Unmute
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
