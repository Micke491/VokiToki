'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/storage';
import { apiFetch } from '@/lib/api';

export function useSessionCheck() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        const response = await apiFetch(`/api/users/current_user`);

        if (response.ok) {
          router.push('/chat');
        } else if (response.status === 401 || response.status === 404) {
          removeAuthToken();
          setChecking(false);
        } else {
          setChecking(false);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        setChecking(false);
      }
    };

    checkSession();
  }, [router]);

  return { checking };
}
