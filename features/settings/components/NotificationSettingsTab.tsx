'use client';

import { useState, useEffect } from 'react';
import { Loader2, Bell, BellOff, BellRing, MessageCircle, Users, Phone, UserPlus, VolumeX } from 'lucide-react';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface MutedChatItem {
  chatId: string;
  chatName?: string;
  mutedUntil: string;
}

interface NotificationPrefs {
  directMessages?: boolean;
  groupMessages?: boolean;
  calls?: boolean;
  chatRequests?: boolean;
}

interface NotifUser {
  _id: string;
  notificationPrefs?: NotificationPrefs;
  [key: string]: any;
}

interface NotificationSettingsTabProps {
  currentUser: NotifUser | null;
  onUserUpdate: (updatedUser: any) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

type NotifTypeKey = keyof NotificationPrefs;

const NOTIF_TYPES: { key: NotifTypeKey; icon: typeof MessageCircle; title: string; desc: string }[] = [
  { key: 'directMessages', icon: MessageCircle, title: 'Direct messages', desc: 'One-on-one chat messages' },
  { key: 'groupMessages', icon: Users, title: 'Group messages', desc: 'Messages in your group chats' },
  { key: 'calls', icon: Phone, title: 'Calls', desc: 'Incoming voice and video calls' },
  { key: 'chatRequests', icon: UserPlus, title: 'Chat requests', desc: 'When someone requests to chat' },
];

export default function NotificationSettingsTab({
  currentUser,
  onUserUpdate,
  setFeedback,
}: NotificationSettingsTabProps) {
  const {
    notifEnabled,
    notifPermission,
    requestingPermission,
    handleToggleNotifications,
    handleRequestPermission,
  } = useNotificationSettings();

  const [mutedChats, setMutedChats] = useState<MutedChatItem[]>([]);
  const [loadingMuted, setLoadingMuted] = useState(true);
  const [savingType, setSavingType] = useState<NotifTypeKey | null>(null);

  const prefs: NotificationPrefs = currentUser?.notificationPrefs || {};
  const isTypeEnabled = (key: NotifTypeKey) => prefs[key] !== false;

  const handleToggleType = async (key: NotifTypeKey, value: boolean) => {
    if (!currentUser) return;
    const nextPrefs: NotificationPrefs = { ...prefs, [key]: value };
    setSavingType(key);
    onUserUpdate({ ...currentUser, notificationPrefs: nextPrefs });
    try {
      const res = await apiFetch('/api/users/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ notificationPrefs: nextPrefs }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      if (data.user) onUserUpdate(data.user);
    } catch {
      onUserUpdate({ ...currentUser, notificationPrefs: prefs });
      setFeedback({ type: 'error', message: 'Failed to update notification settings' });
    } finally {
      setSavingType(null);
    }
  };

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
                Receive browser notifications for new messages, incoming calls, and connection requests.
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

      {/* Per-type notification preferences */}
      <div className="border-t border-chat-border/40 pt-6">
        <h3 className="text-lg font-bold text-chat-text-primary mb-1">Notification Types</h3>
        <p className="text-sm text-chat-text-tertiary mb-4">
          Choose which alerts reach you. These apply across all your devices.
        </p>
        <div className="space-y-3">
          {NOTIF_TYPES.map(({ key, icon: Icon, title, desc }) => (
            <div
              key={key}
              className="bg-chat-input border border-chat-border rounded-2xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chat-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-chat-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-chat-text-primary text-sm">{title}</h4>
                  <p className="text-xs text-chat-text-secondary mt-0.5">{desc}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleType(key, !isTypeEnabled(key))}
                role="switch"
                aria-checked={isTypeEnabled(key)}
                aria-label={title}
                disabled={savingType === key || !currentUser}
                className={`w-14 h-8 rounded-full transition-colors relative shrink-0 disabled:opacity-60 ${isTypeEnabled(key) ? 'bg-chat-accent' : 'bg-chat-border'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${isTypeEnabled(key) ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
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
