'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-base)]">
      <DesktopSidebar />
      <main className="flex-1 min-w-0 pb-[68px] lg:pb-0">{children}</main>
      <MobileNavBar />
    </div>
  );
}
