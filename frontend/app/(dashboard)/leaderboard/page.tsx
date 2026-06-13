'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const SCOPES = [
  { id: 'overall', label: 'Overall' },
  { id: 'turing', label: 'Turing Game' },
  { id: 'word-forge', label: 'Word Forge' },
  { id: 'debate', label: 'Debate' },
  { id: 'imposter', label: 'Imposter' },
];

interface Entry {
  userId: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  score: number;
  rank: number;
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState('overall');
  const [top, setTop] = useState<Entry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/leaderboard', { params: { scope } })
      .then((r) => {
        setTop(r.data.top);
        setYourRank(r.data.yourRank);
      })
      .finally(() => setLoading(false));
  }, [scope]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-warning)]/15">
            <Trophy size={22} className="text-[var(--color-warning)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Leaderboard</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Top players across TuringChat
            </p>
          </div>
        </header>

        {/* Scope tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                scope === s.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Your rank card */}
        {yourRank && (
          <Card className="mb-4 flex items-center gap-3 border-[var(--color-accent)]/40">
            <Medal size={20} className="text-[var(--color-accent)]" />
            <p className="text-sm">
              Your current rank:{' '}
              <span className="font-bold text-[var(--color-accent)]">#{yourRank}</span>
            </p>
          </Card>
        )}

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && top.length === 0 && (
          <Card>
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              No scores yet. Be the first to play!
            </p>
          </Card>
        )}

        <ul className="space-y-2">
          {top.map((entry) => (
            <li
              key={entry.userId}
              className={cn(
                'flex items-center gap-4 rounded-2xl border p-4',
                entry.rank === 1
                  ? 'border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-transparent'
                  : entry.rank === 2
                    ? 'border-slate-400/40 bg-gradient-to-r from-slate-400/10 to-transparent'
                    : entry.rank === 3
                      ? 'border-orange-500/40 bg-gradient-to-r from-orange-500/10 to-transparent'
                      : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold',
                  entry.rank === 1 && 'bg-yellow-500/20 text-yellow-400',
                  entry.rank === 2 && 'bg-slate-400/20 text-slate-300',
                  entry.rank === 3 && 'bg-orange-500/20 text-orange-400',
                  entry.rank > 3 && 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
                )}
              >
                #{entry.rank}
              </span>
              <Avatar seed={entry.avatarSeed} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{entry.displayName}</p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">@{entry.username}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{entry.score}</p>
                <p className="text-[10px] uppercase text-[var(--color-text-muted)]">points</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
