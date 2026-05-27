'use client';

import { useState, useEffect } from 'react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  registerServiceWorker
} from '@/lib/pushNotifications';

export function useNotificationSettings() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    setNotifEnabled(isNotificationsEnabled());
    setNotifPermission(getNotificationPermission());
    registerServiceWorker();
  }, []);

  const handleToggleNotifications = () => {
    const newState = !notifEnabled;
    setNotifEnabled(newState);
    setNotificationsEnabled(newState);
  };

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      const result = await requestNotificationPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        setNotifEnabled(true);
        setNotificationsEnabled(true);
      }
    } finally {
      setRequestingPermission(false);
    }
  };

  return {
    notifEnabled,
    notifPermission,
    requestingPermission,
    handleToggleNotifications,
    handleRequestPermission,
  };
}
