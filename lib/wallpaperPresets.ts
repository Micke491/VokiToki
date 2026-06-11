import React from 'react';

export interface WallpaperPreset {
  name: string;
  value: string;
  preview: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    name: 'Midnight',
    value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    preview: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
  {
    name: 'Deep Ocean',
    value: 'linear-gradient(160deg, #0a1628 0%, #0c3547 35%, #1a4a5e 60%, #0d2137 100%)',
    preview: 'linear-gradient(160deg, #0a1628 0%, #0c3547 35%, #1a4a5e 60%, #0d2137 100%)',
  },
  {
    name: 'Aurora',
    value: 'linear-gradient(135deg, #0f2027 0%, #203a43 30%, #2c5364 60%, #0f2027 100%)',
    preview: 'linear-gradient(135deg, #0f2027 0%, #203a43 30%, #2c5364 60%, #0f2027 100%)',
  },
  {
    name: 'Forest',
    value: 'linear-gradient(160deg, #0a1a0f 0%, #0d2818 30%, #1a3a2a 55%, #0f261a 100%)',
    preview: 'linear-gradient(160deg, #0a1a0f 0%, #0d2818 30%, #1a3a2a 55%, #0f261a 100%)',
  },
  {
    name: 'Nebula',
    value: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #44236c 55%, #1a0a2e 100%)',
    preview: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #44236c 55%, #1a0a2e 100%)',
  },
  {
    name: 'Ember',
    value: 'linear-gradient(160deg, #1a0a0a 0%, #2d1215 35%, #3d1a1d 55%, #1a0a0a 100%)',
    preview: 'linear-gradient(160deg, #1a0a0a 0%, #2d1215 35%, #3d1a1d 55%, #1a0a0a 100%)',
  },
  {
    name: 'Graphite',
    value: 'linear-gradient(160deg, #111113 0%, #1c1c22 30%, #2a2a33 55%, #111113 100%)',
    preview: 'linear-gradient(160deg, #111113 0%, #1c1c22 30%, #2a2a33 55%, #111113 100%)',
  },
  {
    name: 'Sunset',
    value: 'linear-gradient(135deg, #1a0e1f 0%, #2d1831 30%, #3d1f38 50%, #2d1215 75%, #1a0a0a 100%)',
    preview: 'linear-gradient(135deg, #1a0e1f 0%, #2d1831 30%, #3d1f38 50%, #2d1215 75%, #1a0a0a 100%)',
  },
];

export function getWallpaperStyle(wallpaperValue: string): React.CSSProperties {
  if (!wallpaperValue) return {};

  const isColor = wallpaperValue.startsWith('#') || wallpaperValue.startsWith('rgb') || wallpaperValue.startsWith('hsl');
  const isGradient = wallpaperValue.startsWith('linear-gradient') || wallpaperValue.startsWith('radial-gradient');

  if (isGradient) {
    return {
      backgroundImage: wallpaperValue,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    };
  }

  if (isColor) {
    return {
      backgroundColor: wallpaperValue,
    };
  }

  return {
    backgroundImage: `url(${wallpaperValue})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
}
