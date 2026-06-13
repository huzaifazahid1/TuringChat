'use client';

import Link from 'next/link';
import { ArrowLeft, MoreVertical, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Room } from '@/types/chat.types';

interface Props {
  room: Room;
  onlineCount: number;
  onToggleInfo?: () => void;
  showBack?: boolean;
}

const moodLabels: Record<string, { label: string; emoji: string }> = {
  chill: { label: 'Chill Vibes', emoji: '😎' },
  serious: { label: 'Serious Talk', emoji: '🧠' },
  funny: { label: 'Funny Mode', emoji: '😂' },
  tech: { label: 'Tech Vibes', emoji: '🚀' },
  creative: { label: 'Creative', emoji: '🎨' },
  debate: { label: 'Debate Hour', emoji: '⚡' },
};

export function RoomHeader({ room, onlineCount, onToggleInfo, showBack }: Props) {
  const mood = moodLabels[room.mood] || moodLabels.chill;
  return (
    <div className={cn(
      'flex flex-col border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]',
    )}>
      <div className="flex items-center gap-3 px-3 py-3 sm:px-6">
        {showBack && (
          <Link
            href="/chat"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] lg:hidden"
          >
            <ArrowLeft size={18} />
          </Link>
        )}

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)] text-lg">
          {room.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold sm:text-lg">{room.name}</h2>
            <Badge tone="accent">Public Room</Badge>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            {onlineCount.toLocaleString()} online
          </p>
        </div>

        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
          <Search size={18} />
        </button>
        <button
          onClick={onToggleInfo}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] xl:hidden"
        >
          <Users size={18} />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Room mood strip */}
      <div className="border-t border-[var(--color-border-subtle)] px-3 py-2 sm:px-6">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-bg-elevated)]/60 px-3 py-2 text-xs">
          <span className="text-[var(--color-text-muted)]">Room mood:</span>
          <span className="text-base">{mood.emoji}</span>
          <span className="font-semibold text-[var(--color-accent)]">{mood.label}</span>
        </div>
      </div>
    </div>
  );
}
