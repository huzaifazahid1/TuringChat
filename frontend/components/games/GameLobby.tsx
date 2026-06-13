'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';

interface Props {
  title: string;
  emoji: string;
  description: string;
  phase: 'idle' | 'searching';
  onFind: () => void;
  onCancel: () => void;
}

export function GameLobby({ title, emoji, description, phase, onFind, onCancel }: Props) {
  const queueInfo = useGameStore((s) => s.queueInfo);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!queueInfo) {
      setSecsLeft(null);
      return;
    }
    const tick = () => {
      const elapsed = performance.now() - queueInfo.queuedAt;
      const remaining = Math.max(0, Math.ceil((queueInfo.fallbackInMs - elapsed) / 1000));
      setSecsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [queueInfo]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4">
      <div className="mb-4 text-6xl">{emoji}</div>
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)] max-w-md">
        {description}
      </p>
      {phase === 'searching' ? (
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">Looking for a real human…</p>
          {secsLeft !== null && secsLeft > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              AI takes over in{' '}
              <span className="font-bold text-[var(--color-accent)]">{secsLeft}s</span> if no
              one shows up
            </p>
          )}
          {secsLeft === 0 && <p className="text-xs text-[var(--color-accent)]">Pairing with AI…</p>}
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-3">
          <Button size="lg" onClick={onFind}>
            Find a match
          </Button>
          <Link href="/games" className="text-xs text-[var(--color-text-muted)] hover:underline">
            ← Back to games
          </Link>
        </div>
      )}
    </div>
  );
}