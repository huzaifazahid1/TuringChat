'use client';

import {
  MessageSquare,
  Trophy,
  Target,
  Flame,
  Brain,
  Gamepad2,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';

export default function DashboardHomePage() {
  const user = useAuthStore((s) => s.user);
  const rooms = useChatStore((s) => s.rooms);
  const setRooms = useChatStore((s) => s.setRooms);

  useEffect(() => {
    if (rooms.length === 0) {
      api.get('/rooms').then((r) => setRooms(r.data.rooms)).catch(() => undefined);
    }
  }, [rooms.length, setRooms]);

  if (!user) return null;
  const stats = user.stats;
  const accuracy =
    stats.gamesPlayed > 0 ? Math.round((stats.correctGuesses / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center gap-4">
          <Avatar seed={user.avatarSeed} size={56} ring />
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Welcome back</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{user.displayName}</h1>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard icon={MessageSquare} label="Messages" value={stats.totalMessages} />
          <StatsCard icon={Gamepad2} label="Games played" value={stats.gamesPlayed} accent="success" />
          <StatsCard icon={Target} label="Accuracy" value={`${accuracy}%`} accent="warning" />
          <StatsCard icon={Flame} label="Best streak" value={stats.highestStreak} accent="danger" />
        </section>

        <section className="mb-8 rounded-2xl border border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-panel)] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 glow-accent">
              <Brain size={28} className="text-[var(--color-accent)]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Spot the AI</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Jump into the Turing Game. 60 seconds. Real human or AI? You decide.
              </p>
              <Link
                href="/games/turing"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
              >
                Find a match <ChevronRight size={16} />
              </Link>
            </div>
            <div className="hidden sm:flex flex-col items-center gap-1 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 py-3">
              <Trophy size={18} className="text-[var(--color-warning)]" />
              <p className="text-xl font-bold">{stats.currentScore}</p>
              <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Score</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Trending rooms</h2>
            <Link href="/chat" className="text-sm font-semibold text-[var(--color-accent)] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.slice(0, 6).map((r) => (
              <Link
                key={r.id}
                href={`/chat/${r.id}`}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-4 transition-colors hover:bg-[var(--color-bg-elevated)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)] text-xl">
                  {r.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {r.activeUsers || r.memberCount} online
                  </p>
                </div>
                <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
