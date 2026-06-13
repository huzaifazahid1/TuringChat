'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { connectSockets, disconnectSockets } from '@/lib/socket';

export function SocketProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) connectSockets();
    return () => {
      // We do NOT disconnect on every render — only on full unmount of provider.
    };
  }, [user]);

  useEffect(() => {
    return () => disconnectSockets();
  }, []);

  return <>{children}</>;
}
