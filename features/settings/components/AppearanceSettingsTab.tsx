// features/settings/components/AppearanceSettingsTab.tsx
'use client';

import { Palette, Sun, Moon, Image as ImageIcon, Volume2, Film } from 'lucide-react';
import { useAppearanceSettings } from '../hooks/useAppearanceSettings';

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
  const { 
    theme, 
    handleThemeChange,
    wallpaper,
    setWallpaper,
    autoPlayGifs,
    setAutoPlayGifs,
    autoPlayVoice,
    setAutoPlayVoice
  } = useAppearanceSettings({
    currentUser,
    onUserUpdate,
    setFeedback,
  });

  const WALLPAPER_PRESETS = [
    { name: 'Dark Solid', value: '#09090b' },
    { name: 'Deep Space', value: '#111115' },
    { name: 'Classic Slate', value: '#1e293b' },
    { name: 'Forest', value: '#064e3b' },
    { name: 'Oceanic', value: '#0c4a6e' },
  ];

  return (
    <div className="space-y-8">
      {/* Theme selection */}
      <div>
        <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
          <Palette className="w-6 h-6 text-chat-accent" />
          Appearance Preference
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${
              theme === 'light'
                ? 'border-chat-accent bg-chat-accent/10 shadow-lg shadow-chat-accent/10'
                : 'border-chat-border bg-chat-input hover:bg-chat-hover'
            }`}
          >
            <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
            <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'light' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>
              Light Mode
            </span>
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${
              theme === 'dark'
                ? 'border-chat-accent bg-chat-accent/10 shadow-lg shadow-chat-accent/10'
                : 'border-chat-border bg-chat-input hover:bg-chat-hover'
            }`}
          >
            <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`} />
            <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-chat-accent' : 'text-chat-text-tertiary'}`}>
              Dark Mode
            </span>
          </button>
        </div>
      </div>

      {/* Global Default Wallpaper Selection */}
      <div className="border-t border-chat-border/40 pt-6">
        <h3 className="text-lg font-bold text-chat-text-primary mb-3 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-chat-accent" />
          Default Chat Wallpaper
        </h3>
        <p className="text-sm text-chat-text-secondary mb-4">
          Choose a default theme color for chat interfaces where a custom wallpaper hasn't been set:
        </p>
        <div className="flex flex-wrap gap-3">
          {WALLPAPER_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => setWallpaper(preset.value)}
              className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all ${
                wallpaper === preset.value
                  ? 'bg-chat-accent border-chat-accent text-white shadow-lg'
                  : 'bg-chat-input border-chat-border text-chat-text-secondary hover:bg-chat-hover'
              }`}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={() => setWallpaper('')}
            className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all ${
              !wallpaper
                ? 'bg-chat-accent border-chat-accent text-white shadow-lg'
                : 'bg-chat-input border-chat-border text-chat-text-secondary hover:bg-chat-hover'
            }`}
          >
            System Default
          </button>
        </div>
      </div>

      {/* Media Playback Preferences */}
      <div className="border-t border-chat-border/40 pt-6">
        <h3 className="text-lg font-bold text-chat-text-primary mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-chat-accent" />
          Media Autoplay Settings
        </h3>

        <div className="space-y-4">
          {/* Autoplay GIFs */}
          <div className="flex items-center justify-between gap-4 p-4 bg-chat-input/30 border border-chat-border rounded-xl">
            <div>
              <p className="text-sm font-bold text-chat-text-primary">Autoplay GIFs</p>
              <p className="text-xs text-chat-text-secondary mt-0.5">Allow shared files and searches in Giphy to start moving immediately.</p>
            </div>
            <button
              onClick={() => setAutoPlayGifs(!autoPlayGifs)}
              role="switch"
              aria-checked={autoPlayGifs}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${autoPlayGifs ? 'bg-chat-accent' : 'bg-chat-border'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${autoPlayGifs ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Autoplay Voice Notes */}
          <div className="flex items-center justify-between gap-4 p-4 bg-chat-input/30 border border-chat-border rounded-xl">
            <div>
              <p className="text-sm font-bold text-chat-text-primary">Autoplay Consecutive Voice Notes</p>
              <p className="text-xs text-chat-text-secondary mt-0.5">Consecutive audio playbacks will trigger automatically when the previous note finishes.</p>
            </div>
            <button
              onClick={() => setAutoPlayVoice(!autoPlayVoice)}
              role="switch"
              aria-checked={autoPlayVoice}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${autoPlayVoice ? 'bg-chat-accent' : 'bg-chat-border'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${autoPlayVoice ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
