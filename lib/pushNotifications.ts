export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.error('[Push] SW registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}
export function isNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('notificationsEnabled') !== 'false';
}
export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
}

interface NotificationData {
  title: string;
  body: string;
  chatId?: string;
  type?: 'message' | 'call';
  senderName?: string;
  messageCount?: number;
  icon?: string;
  badge?: string;
}

export async function showNotification(data: NotificationData): Promise<void> {
  if (!isNotificationsEnabled()) return;
  if (getNotificationPermission() !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.active) {
        registration.active.postMessage({
          action: 'showNotification',
          ...data,
        });
        return;
      }
    }

    const options: NotificationOptions = {
      body: data.body,
      tag: data.chatId || 'default',
    };

    if (data.icon) options.icon = data.icon;
    if (data.badge) options.badge = data.badge;

    new Notification(data.title, options);
  } catch (err) {
    console.error('[Push] Failed to show notification:', err);
  }
}