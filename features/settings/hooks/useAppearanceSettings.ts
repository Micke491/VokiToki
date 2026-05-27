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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
    const userTheme = currentUser.theme === 'system' ? savedTheme : (currentUser.theme || savedTheme);
    setTheme(userTheme as 'light' | 'dark');
  }, [currentUser]);

  const handleUpdatePreferences = async (updates: Partial<User>) => {
    try {
      const response = await apiFetch(`/api/users/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
    } catch (error: any) {
      console.error('Update pref error:', error);
      setFeedback({ type: 'error', message: 'Failed to save preference.' });
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    onUserUpdate({ ...currentUser, theme: newTheme });
    handleUpdatePreferences({ theme: newTheme });
  };

  return {
    theme,
    handleThemeChange,
  };
}
