'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { useDMThreads } from '@/hooks/useDM';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoomPanel } from '@/components/layout/RoomPanel';
import { cn } from '@/lib/utils';
import type { PublicUser } from '@/types/user.types';

export default function DMsListPage() {
  const router = useRouter();
  const { threads, loading } = useDMThreads();
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const filtered = threads.filter((t) =>
    !search.trim()
      ? true
      : t.otherUser.displayName.toLowerCase().includes(search.toLowerCase()) ||
        t.otherUser.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen">
      <div className="hidden lg:block">
        <RoomPanel />
      </div>

      <div className="flex flex-1 min-w-0 flex-col bg-[var(--color-bg-panel)] lg:bg-transparent">
        <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-4 sm:px-6">
          <h1 className="flex-1 text-2xl font-bold">Direct Messages</h1>
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={16} /> New
          </button>
        </header>

        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3 sm:px-6">
          <div className="relative max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="h-9 w-full rounded-lg bg-[var(--color-bg-elevated)] pl-9 pr-3 text-xs placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
            />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-12 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-elevated)]">
                <MessageCircle size={28} className="text-[var(--color-text-muted)]" />
              </div>
              <h2 className="text-lg font-bold">No conversations yet</h2>
              <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">
                Start a DM with anyone — or click someone&apos;s avatar in a room to message
                them privately.
              </p>
              <Button onClick={() => setNewOpen(true)} className="mt-5">
                Start a new DM
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {filtered.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/dms/${t.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-hover)] sm:px-6"
                  >
                    <Avatar seed={t.otherUser.avatarSeed} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-semibold">{t.otherUser.displayName}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                          {formatTime(t.lastMessageAt)}
                        </p>
                      </div>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {t.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>

      <NewDMModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSelected={(userId) => {
          setNewOpen(false);
          api
            .post(`/dms/with/${userId}`)
            .then((r) => router.push(`/dms/${r.data.thread.id}`))
            .catch(() => undefined);
        }}
      />
    </div>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function NewDMModal({
  open,
  onClose,
  onSelected,
}: {
  open: boolean;
  onClose: () => void;
  onSelected: (userId: string) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);

  const search = (val: string) => {
    setQ(val);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    api
      .get('/users/search', { params: { q: val } })
      .then((r) => setResults(r.data.users as PublicUser[]))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  return (
    <Modal open={open} onClose={onClose} title="Start a new DM">
      <div className="space-y-3">
        <Input
          placeholder="Search by username (min 2 chars)"
          value={q}
          onChange={(e) => search(e.target.value)}
          autoFocus
        />
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {loading && <li className="py-2 text-center text-xs text-[var(--color-text-muted)]">Searching…</li>}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <li className="py-2 text-center text-xs text-[var(--color-text-muted)]">No users found</li>
          )}
          {results.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => onSelected(u.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2 hover:bg-[var(--color-bg-hover)]'
                )}
              >
                <Avatar seed={u.avatarSeed} size={36} />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{u.displayName}</p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">@{u.username}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
