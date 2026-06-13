'use client';

import { cn } from '@/lib/utils';

interface Props {
  secondsLeft: number;
  total: number;
  size?: number;
}

export function GameTimer({ secondsLeft, total, size = 80 }: Props) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total === 0 ? 0 : Math.max(0, Math.min(1, secondsLeft / total));
  const offset = circumference * (1 - progress);
  const danger = secondsLeft <= 10;

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={danger ? 'var(--color-danger)' : 'var(--color-accent)'}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-base font-bold tabular-nums', danger && 'text-[var(--color-danger)]')}>
          {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
          {String(secondsLeft % 60).padStart(2, '0')}
        </span>
        <span className="text-[9px] uppercase text-[var(--color-text-muted)]">Left</span>
      </div>
    </div>
  );
}
