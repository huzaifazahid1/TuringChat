'use client';

import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MessageCircle, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Room } from '@/types/chat.types';
import type { PublicUser } from '@/types/user.types';

interface Props {
  room: Room;
  onlineUsers: PublicUser[];
  totalOnline: number;
  onClose?: () => void;
}

export function OnlineUsers({ room, onlineUsers, totalOnline, onClose }: Props) {
  const router = useRouter();

  const startDM = async (otherId: string) => {
    try {
      const r = await api.post(`/dms/with/${otherId}`);
      const threadId = r.data.thread.id;
      router.push(`/dms/${threadId}`);
    } catch (e) {
      console.error('Failed to open DM', e);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col bg-[var(--color-bg-panel)] xl:w-[340px] xl:border-l xl:border-[var(--color-border-subtle)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-4">
        <h3 className="text-base font-semibold">Room Info</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="overflow-y-auto p-5">
        {/* Room summary */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-bg-elevated)] text-3xl">
            {room.icon}
          </div>
          <h4 className="text-lg font-bold">{room.name}</h4>
          <div className="mt-1 flex justify-center">
            <Badge tone="accent">Public Room</Badge>
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            {room.description || 'A place to chat about whatever.'}
          </p>
        </div>

        {/* Stats */}
        <Card className="mb-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold">{formatCount(totalOnline)}</p>
              <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Online</p>
            </div>
            <div>
              <p className="text-lg font-bold">{formatCount(room.memberCount)}</p>
              <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Members</p>
            </div>
            <div>
              <p className="text-lg font-bold">{formatCount(room.messageCount ?? 0)}</p>
              <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Messages</p>
            </div>
          </div>
        </Card>

        {/* Online users list */}
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-sm font-semibold">
            Online{' '}
            <span className="text-[var(--color-text-muted)]">({totalOnline.toLocaleString()})</span>
          </h5>
        </div>

        <ul className="mb-6 space-y-1">
          {onlineUsers.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => startDM(u.id)}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[var(--color-bg-hover)]"
                title={`Send a DM to ${u.displayName}`}
              >
                <Avatar seed={u.avatarSeed} size={36} status="online" showStatus />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{u.displayName}</p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">@{u.username}</p>
                </div>
                <MessageCircle
                  size={16}
                  className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100"
                />
              </button>
            </li>
          ))}
          {onlineUsers.length === 0 && (
            <li className="py-4 text-center text-xs text-[var(--color-text-muted)]">
              No one else is here right now.
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}