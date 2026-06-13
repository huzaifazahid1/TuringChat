'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  accent = 'indigo',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  accent?: 'indigo' | 'success' | 'warning' | 'danger';
}) {
  const accents = {
    indigo: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
    success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
  };
  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-4">
      <div className="flex items-center justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accents[accent])}>
          <Icon size={18} />
        </div>
        {trend && <span className="text-xs font-semibold text-[var(--color-success)]">{trend}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}
