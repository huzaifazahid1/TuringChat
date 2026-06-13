'use client';

import Link from 'next/link';
import { type LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: 'indigo' | 'amber' | 'emerald' | 'sky';
  hero?: boolean;
}

const accents = {
  indigo: 'from-indigo-500/30 to-purple-500/30 text-indigo-300 border-indigo-500/40',
  amber: 'from-amber-500/30 to-orange-500/30 text-amber-300 border-amber-500/40',
  emerald: 'from-emerald-500/30 to-teal-500/30 text-emerald-300 border-emerald-500/40',
  sky: 'from-sky-500/30 to-blue-500/30 text-sky-300 border-sky-500/40',
};

export function GameCard({
  href,
  title,
  description,
  icon: Icon,
  accent = 'indigo',
  hero = false,
}: Props) {
  if (hero) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-panel)] p-6 transition-transform hover:scale-[1.01]"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 glow-accent">
            <Icon size={32} className="text-[var(--color-accent)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]">
              Play Now
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-4 transition-all hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-bg-elevated)]"
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br border',
          accents[accent]
        )}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <ChevronRight
        size={18}
        className="text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}