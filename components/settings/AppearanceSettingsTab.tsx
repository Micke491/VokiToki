'use client';

import { useState, useEffect } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
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

interface AppearanceSettingsTabProps {
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function AppearanceSettingsTab({
  currentUser,
  onUserUpdate,
  setFeedback,
}: AppearanceSettingsTabProps) {
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

  return (
    <div>
      <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
        <Palette className="w-6 h-6 text-chat-accent" />
        Appearance Preference
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleThemeChange('light')}
          className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'light' ? 'border-chat-accent bg-chat-accent/10 shadow-lg shadow-chat-accent/10' : 'border-chat-border bg-chat-input hover:bg-chat-hover'}`}
        >
          <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
          <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>Light Mode</span>
        </button>

        <button
          onClick={() => handleThemeChange('dark')}
          className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'dark' ? 'border-chat-accent bg-chat-accent/10 shadow-lg shadow-chat-accent/10' : 'border-chat-border bg-chat-input hover:bg-chat-hover'}`}
        >
          <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
          <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>Dark Mode</span>
        </button>
      </div>
    </div>
  );
}
