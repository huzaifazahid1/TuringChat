'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Gamepad2, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/chat', label: 'Chats', icon: MessageSquare, match: ['/chat', '/dm', '/'] },
  { href: '/games', label: 'Games', icon: Gamepad2, match: ['/games'] },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, match: ['/leaderboard'] },
  { href: '/profile', label: 'Profile', icon: User, match: ['/profile'] },
];

export function MobileNavBar() {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-30',
        'border-t border-[var(--color-border-subtle)]',
        'bg-[var(--color-bg-panel)]/95 backdrop-blur',
        'safe-bottom'
      )}
    >
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some(
            (m) => pathname === m || (m !== '/' && pathname.startsWith(m))
          );
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2.5',
                active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                  active && 'bg-[var(--color-accent)]/15'
                )}
              >
                <Icon size={20} />
              </span>
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
