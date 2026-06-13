'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Gamepad2,
  Trophy,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { clearTokens } from '@/lib/api';
import { disconnectSockets } from '@/lib/socket';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/home', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chats', icon: MessageSquare },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  const onSignOut = () => {
    clearTokens();
    disconnectSockets();
    logout();
    router.replace('/login');
  };

  return (
    <aside
      className="hidden lg:flex h-screen w-64 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]"
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent)]/15">
          <MessageSquare size={20} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="text-lg font-bold">
          Turing<span className="text-[var(--color-accent)]">Chat</span>
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-[var(--color-border-subtle)] p-3">
        {user && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-[var(--color-bg-elevated)] p-3">
            <Avatar seed={user.avatarSeed} size={40} status="online" showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">@{user.username}</p>
              <p className="text-xs text-[var(--color-success)]">Online</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span
            className={cn(
              'inline-flex h-5 w-9 items-center rounded-full transition-colors',
              theme === 'dark' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </span>
        </button>

        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
