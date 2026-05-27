'use client';

import { Loader2, Bell, BellOff, BellRing, Info, Shield } from 'lucide-react';
import { useNotificationSettings } from '../hooks/useNotificationSettings';

export default function NotificationSettingsTab() {
  const {
    notifEnabled,
    notifPermission,
    requestingPermission,
    handleToggleNotifications,
    handleRequestPermission,
  } = useNotificationSettings();

  const permissionBadge = () => {
    switch (notifPermission) {
      case 'granted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Granted
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Denied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Not Set
          </span>
        );
    }
  };

  return (
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
            aria-label="Toggle push notifications"
            className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${notifEnabled ? 'bg-chat-accent' : 'bg-chat-border'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${notifEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="bg-chat-input border border-chat-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-chat-text-primary text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-chat-accent" />
                Browser Permission
              </h3>
              <p className="text-sm text-chat-text-secondary mt-1">
                Your browser&apos;s notification permission status.
              </p>
            </div>
            {permissionBadge()}
          </div>

          {notifPermission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              disabled={requestingPermission || notifPermission === 'denied'}
              className="w-full px-5 py-3 bg-chat-accent text-white font-bold rounded-xl transition-all hover:bg-chat-accent-hover shadow-lg shadow-chat-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {requestingPermission ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {notifPermission === 'denied'
                ? 'Permission Denied — Update in Browser Settings'
                : 'Request Permission'
              }
            </button>
          )}

          {notifPermission === 'denied' && (
            <p className="text-xs text-red-400 font-medium">
              You have blocked notifications. To re-enable, click the lock icon in your browser&apos;s address bar and allow notifications.
            </p>
          )}
        </div>

        <div className="bg-chat-accent/5 border border-chat-accent/15 rounded-2xl p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-chat-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-chat-text-secondary font-medium leading-relaxed">
              <strong className="text-chat-text-primary">How it works:</strong> Message notifications only appear when the app tab is in the background or minimized. Call notifications always appear, even when the tab is active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
