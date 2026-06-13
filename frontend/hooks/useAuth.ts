'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api, clearTokens, getAccessToken } from '@/lib/api';
import { connectSockets, disconnectSockets } from '@/lib/socket';

export function useAuth(redirectIfMissing = false) {
  const { user, hydrated, setUser, setHydrated, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated) return;
    const token = getAccessToken();
    if (!token) {
      setHydrated(true);
      if (redirectIfMissing) router.replace('/login');
      return;
    }
    api
      .get('/auth/me')
      .then((r) => {
        setUser(r.data.user);
        connectSockets();
      })
      .catch(() => {
        clearTokens();
        if (redirectIfMissing) router.replace('/login');
      })
      .finally(() => setHydrated(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = () => {
    clearTokens();
    disconnectSockets();
    logout();
    router.replace('/login');
  };

  return { user, hydrated, signOut };
}
