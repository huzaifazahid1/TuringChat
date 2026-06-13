'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tooltip({
  children,
  label,
  side = 'right',
  className,
}: {
  children: ReactNode;
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  const pos: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md',
          'bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]',
          'px-2 py-1 text-xs text-[var(--color-text-primary)]',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          pos[side]
        )}
      >
        {label}
      </span>
    </span>
  );
}
