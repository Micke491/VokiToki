'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface User {
  _id: string;
  username: string;
  email: string;
  name?: string;
  bio?: string;
  avatar?: string;
  gender?: string;
  location?: string;
  links?: { label: string; url: string }[];
  readReceipts: boolean;
  twoFactorEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  defaultWallpaper?: string;
  autoPlayGifs?: boolean;
  autoPlayVoice?: boolean;
}

interface UseAppearanceSettingsProps {
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export function useAppearanceSettings({
  currentUser,
  onUserUpdate,
  setFeedback,
}: UseAppearanceSettingsProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [wallpaper, setWallpaper] = useState<string>('');
  const [autoPlayGifs, setAutoPlayGifs] = useState<boolean>(true);
  const [autoPlayVoice, setAutoPlayVoice] = useState<boolean>(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
    const userTheme = currentUser.theme === 'system' ? savedTheme : (currentUser.theme || savedTheme);
    setTheme(userTheme as 'light' | 'dark');
    
    if (currentUser) {
      setWallpaper(currentUser.defaultWallpaper || '');
      setAutoPlayGifs(currentUser.autoPlayGifs ?? true);
      setAutoPlayVoice(currentUser.autoPlayVoice ?? true);
    }
  }, [currentUser]);

  const updatePreferenceField = async (field: string, value: any) => {
    if (!navigator.onLine) {
      setFeedback({ type: 'error', message: 'Offline: Preference saved locally, but could not sync to database.' });
      return;
    }
    try {
      const response = await apiFetch(`/api/users/preferences`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      });
      if (response.ok) {
        const data = await response.json();
        onUserUpdate(data.user);
        setFeedback({ type: 'success', message: 'Preference saved successfully' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to sync preferences' });
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    onUserUpdate({ ...currentUser, theme: newTheme });
    updatePreferenceField('theme', newTheme);
  };

  return {
    theme,
    handleThemeChange,
    wallpaper,
    setWallpaper: (val: string) => { setWallpaper(val); updatePreferenceField('defaultWallpaper', val); },
    autoPlayGifs,
    setAutoPlayGifs: (val: boolean) => { setAutoPlayGifs(val); updatePreferenceField('autoPlayGifs', val); },
    autoPlayVoice,
    setAutoPlayVoice: (val: boolean) => { setAutoPlayVoice(val); updatePreferenceField('autoPlayVoice', val); },
  };
}
