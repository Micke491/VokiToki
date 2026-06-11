// features/settings/components/AppearanceSettingsTab.tsx
'use client';

import { Palette, Sun, Moon, Image as ImageIcon, Volume2, Film, Check } from 'lucide-react';
import { useAppearanceSettings } from '../hooks/useAppearanceSettings';
import { WALLPAPER_PRESETS } from '@/lib/wallpaperPresets';

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
        <p className="text-sm text-chat-text-secondary mb-5">
          Choose a default background for your chat conversations:
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {/* System Default option */}
          <button
            onClick={() => setWallpaper('')}
            className={`group relative aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
              !wallpaper
                ? 'border-chat-accent shadow-lg shadow-chat-accent/20 scale-[1.02]'
                : 'border-chat-border hover:border-chat-text-tertiary hover:scale-[1.02]'
            }`}
          >
            <div className="absolute inset-0 bg-chat-bg-primary flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-chat-text-tertiary/50 flex items-center justify-center">
                <span className="text-chat-text-tertiary text-lg">✕</span>
              </div>
            </div>
            {!wallpaper && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-chat-accent rounded-full flex items-center justify-center shadow-md">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">Default</span>
            </div>
          </button>

          {/* Wallpaper preset options */}
          {WALLPAPER_PRESETS.map(preset => {
            const isSelected = wallpaper === preset.value;
            return (
              <button
                key={preset.name}
                onClick={() => setWallpaper(preset.value)}
                className={`group relative aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? 'border-chat-accent shadow-lg shadow-chat-accent/20 scale-[1.02]'
                    : 'border-chat-border hover:border-chat-text-tertiary hover:scale-[1.02]'
                }`}
              >
                {/* Gradient preview fill */}
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: preset.preview }}
                />
                {/* Subtle pattern overlay for depth */}
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 0%, transparent 40%)`,
                  }}
                />
                {/* Chat bubble mockup for preview */}
                <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-center items-center gap-1.5 px-2 py-3">
                  <div className="self-start w-[65%] h-2 rounded-full bg-white/10 ml-1" />
                  <div className="self-start w-[45%] h-2 rounded-full bg-white/8 ml-1" />
                  <div className="self-end w-[55%] h-2 rounded-full bg-white/15 mr-1" />
                  <div className="self-end w-[35%] h-2 rounded-full bg-white/10 mr-1" />
                </div>
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-chat-accent rounded-full flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
                {/* Label overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">{preset.name}</span>
                </div>
              </button>
            );
          })}
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
