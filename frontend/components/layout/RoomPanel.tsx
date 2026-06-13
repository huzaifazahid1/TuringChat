'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { useDMThreads } from '@/hooks/useDM';
import { Avatar } from '@/components/ui/Avatar';
import { CreateRoomModal } from './CreateRoomModal';
import { cn } from '@/lib/utils';
import type { Room } from '@/types/chat.types';

const CATEGORIES = ['All', 'Tech', 'Gaming', 'Random', 'Science', 'Music', 'Sports', 'General'] as const;

type Tab = 'rooms' | 'dms';

export function RoomPanel() {
  const params = useParams<{ roomId?: string; threadId?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const activeRoomId = params?.roomId;
  const activeThreadId = params?.threadId;

  const rooms = useChatStore((s) => s.rooms);
  const setRooms = useChatStore((s) => s.setRooms);
  const unread = useChatStore((s) => s.unreadByRoom);
  const { threads: dmThreads } = useDMThreads();

  // Default to the tab matching the current path
  const initialTab: Tab = pathname?.startsWith('/dms') || pathname?.startsWith('/dm/') ? 'dms' : 'rooms';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const refetchRooms = () => {
    api
      .get('/rooms')
      .then((r) => setRooms(r.data.rooms))
      .catch(() => undefined);
  };

  useEffect(() => {
    refetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRooms = rooms.filter((r) => {
    if (category !== 'All' && r.category.toLowerCase() !== category.toLowerCase()) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredDMs = dmThreads.filter((t) => {
    if (!search.trim()) return true;
    return (
      t.otherUser.displayName.toLowerCase().includes(search.toLowerCase()) ||
      t.otherUser.username.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <>
      <div className="flex h-full w-full flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] lg:w-[340px]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-5">
          <h2 className="flex-1 text-2xl font-bold">Chats</h2>
          <button
            onClick={() => (tab === 'rooms' ? setCreateOpen(true) : router.push('/dms'))}
            title={tab === 'rooms' ? 'Create a new room' : 'Start a new DM'}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4">
          <div className="flex gap-1 rounded-xl bg-[var(--color-bg-elevated)] p-1">
            <button
              onClick={() => setTab('rooms')}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === 'rooms'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              )}
            >
              Rooms{rooms.length > 0 && ` (${rooms.length})`}
            </button>
            <button
              onClick={() => setTab('dms')}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === 'dms'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              )}
            >
              DMs{dmThreads.length > 0 && ` (${dmThreads.length})`}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Search */}
          <div className="px-4 pt-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'rooms' ? 'Search rooms' : 'Search conversations'}
                className="h-9 w-full rounded-lg bg-[var(--color-bg-elevated)] pl-9 pr-3 text-xs placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
              />
            </div>
          </div>

          {/* Tab: ROOMS */}
          {tab === 'rooms' && (
            <>
              <div className="mt-4 px-4">
                <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                  Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                        category === c
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 px-4 pb-4">
                <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                  Public Rooms
                </p>
                <ul className="space-y-1">
                  {filteredRooms.map((r: Room) => (
                    <li key={r.id}>
                      <Link
                        href={`/chat/${r.id}`}
                        className={cn(
                          'flex items-center gap-3 rounded-xl p-3 transition-colors',
                          activeRoomId === r.id
                            ? 'bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/40'
                            : 'hover:bg-[var(--color-bg-hover)]'
                        )}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)] text-base">
                          {r.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{r.name}</p>
                          <p className="truncate text-xs text-[var(--color-text-muted)]">
                            {r.memberCount} member{r.memberCount === 1 ? '' : 's'}
                            {r.activeUsers > 0 && ` · ${r.activeUsers} online`}
                          </p>
                        </div>
                        {unread[r.id] > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-white">
                            {unread[r.id]}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                  {filteredRooms.length === 0 && rooms.length > 0 && (
                    <li className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                      No rooms match your filter.
                    </li>
                  )}
                  {rooms.length === 0 && (
                    <li className="py-12 text-center">
                      <div className="mb-2 text-3xl">🏚️</div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        No rooms yet. Create the first one!
                      </p>
                      <button
                        onClick={() => setCreateOpen(true)}
                        className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)]"
                      >
                        <Plus size={14} /> Create room
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}

          {/* Tab: DMs */}
          {tab === 'dms' && (
            <div className="mt-4 px-4 pb-4">
              <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                Direct Messages
              </p>
              <ul className="space-y-1">
                {filteredDMs.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dms/${t.id}`}
                      className={cn(
                        'flex items-center gap-3 rounded-xl p-3 transition-colors',
                        activeThreadId === t.id
                          ? 'bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/40'
                          : 'hover:bg-[var(--color-bg-hover)]'
                      )}
                    >
                      <Avatar seed={t.otherUser.avatarSeed} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {t.otherUser.displayName}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">
                          {t.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
                {filteredDMs.length === 0 && (
                  <li className="py-12 text-center">
                    <div className="mb-2 text-3xl">💌</div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {dmThreads.length === 0
                        ? 'No DMs yet. Click someone in a room to start one.'
                        : 'No conversations match.'}
                    </p>
                    <Link
                      href="/dms"
                      className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)]"
                    >
                      <Plus size={14} /> Start a DM
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetchRooms}
      />
    </>
  );
}
