'use client';

import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glass?: boolean;
  hover?: boolean;
}

export function Card({ children, className, glass, hover, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--color-border-subtle)] p-4',
        glass ? 'glass' : 'bg-[var(--color-bg-panel)]',
        hover && 'transition-colors hover:bg-[var(--color-bg-elevated)] cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
