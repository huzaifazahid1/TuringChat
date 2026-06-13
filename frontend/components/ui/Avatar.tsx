'use client';

import Image from 'next/image';
import { getAvatarUrl, getBotAvatarUrl, type DiceBearStyle } from '@/lib/dicebear';
import { cn } from '@/lib/utils';

interface AvatarProps {
  seed: string;
  size?: number;
  style?: DiceBearStyle;
  isBot?: boolean;
  status?: 'online' | 'offline' | 'away';
  showStatus?: boolean;
  className?: string;
  ring?: boolean;
}

export function Avatar({
  seed,
  size = 40,
  style,
  isBot = false,
  status,
  showStatus = false,
  className,
  ring = false,
}: AvatarProps) {
  const url = isBot ? getBotAvatarUrl(seed) : getAvatarUrl(seed, { style });
  const dotSize = Math.max(8, Math.round(size / 4));
  return (
    <div
      className={cn('relative inline-block flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={url}
        alt={seed}
        width={size}
        height={size}
        unoptimized
        className={cn(
          'rounded-full bg-[var(--color-bg-elevated)]',
          ring && 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg-base)]',
          isBot && 'glow-accent'
        )}
      />
      {showStatus && status && (
        <span
          aria-label={status}
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--color-bg-base)]',
            status === 'online' && 'bg-[var(--color-success)]',
            status === 'away' && 'bg-[var(--color-warning)]',
            status === 'offline' && 'bg-[var(--color-text-muted)]'
          )}
          style={{ width: dotSize, height: dotSize }}
        />
      )}
    </div>
  );
}
