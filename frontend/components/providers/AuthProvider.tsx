'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api, clearTokens, getAccessToken } from '@/lib/api';
import { connectSockets } from '@/lib/socket';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) return;
    const token = getAccessToken();
    if (!token) {
      setHydrated(true);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => {
        setUser(r.data.user);
        connectSockets();
      })
      .catch(() => clearTokens())
      .finally(() => setHydrated(true));
  }, [hydrated, setUser, setHydrated]);

  return <>{children}</>;
}
