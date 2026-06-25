'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthToken } from '@/lib/storage';
import { registerServiceWorker } from '@/lib/pushNotifications';

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  theme?: 'light' | 'dark' | 'system';
  defaultWallpaper?: string;
  autoPlayGifs?: boolean;
  autoPlayVoice?: boolean;
}

export function useChatSession() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/auth-pages/login");
        return;
      }
      const response = await apiFetch(`/api/users/current_user`);

      if (!response.ok) throw new Error("Not authenticated");

      const data = await response.json();
      setCurrentUser(data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      router.push("/auth-pages/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    registerServiceWorker();
  }, []);

  return {
    currentUser,
    loading,
    refetchUser: fetchCurrentUser,
  };
}