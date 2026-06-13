'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { dramaReveal, countUp, gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';
import type { GameResult } from '@/types/game.types';

interface Props {
  result: GameResult;
  onPlayAgain: () => void;
}

export function RevealScreen({ result, onPlayAgain }: Props) {
  const router = useRouter();
  const iconRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const burstsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dramaReveal(iconRef.current);
    if (headlineRef.current) {
      gsap.fromTo(
        headlineRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.4, ease: 'power3.out' }
      );
    }
    if (scoreRef.current) {
      countUp(scoreRef.current, 0, result.points);
    }
    // confetti bursts
    if (result.correct && burstsRef.current) {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];
      const N = 40;
      for (let i = 0; i < N; i++) {
        const dot = document.createElement('span');
        dot.className = 'absolute h-2 w-2 rounded-full';
        dot.style.background = colors[i % colors.length];
        dot.style.left = '50%';
        dot.style.top = '50%';
        burstsRef.current.appendChild(dot);
        gsap.to(dot, {
          x: (Math.random() - 0.5) * 600,
          y: (Math.random() - 0.5) * 600 - 100,
          opacity: 0,
          rotate: Math.random() * 360,
          duration: 1.5 + Math.random() * 0.6,
          ease: 'power2.out',
          onComplete: () => dot.remove(),
        });
      }
    }
  }, [result]);

  const opp = result.opponentType === 'ai';

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--color-bg-base)] bg-game-grid p-4 overflow-hidden">
      <div ref={burstsRef} className="absolute inset-0 pointer-events-none" />

      <p className="mb-3 text-sm uppercase tracking-widest text-[var(--color-text-muted)]">
        You were talking to
      </p>

      <div ref={iconRef} className="mb-6 flex flex-col items-center">
        <div
          className={cn(
            'flex h-32 w-32 items-center justify-center rounded-3xl',
            opp ? 'bg-gradient-to-br from-indigo-500/30 to-purple-500/30 glow-accent' : 'bg-[var(--color-success)]/20'
          )}
        >
          {opp ? (
            <Brain size={64} className="text-[var(--color-accent)]" />
          ) : (
            <UserIcon size={64} className="text-[var(--color-success)]" />
          )}
        </div>
        <h1
          ref={headlineRef}
          className={cn(
            'mt-4 text-6xl font-black tracking-tight',
            opp ? 'text-[var(--color-accent)]' : 'text-[var(--color-success)]'
          )}
        >
          {opp ? 'AI' : 'HUMAN'}
        </h1>
      </div>

      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Your vote</p>
      <p className={cn('text-2xl font-bold', opp ? 'text-[var(--color-accent)]' : 'text-[var(--color-success)]')}>
        {result.yourVote?.toUpperCase()}
      </p>

      <div className="mt-4 text-center">
        {result.correct ? (
          <p className="text-3xl font-extrabold text-[var(--color-success)]">Correct! 🎉</p>
        ) : (
          <p className="text-3xl font-extrabold text-[var(--color-danger)]">Not quite!</p>
        )}
        <p className="mt-2 text-2xl font-bold">
          +<span ref={scoreRef}>0</span> Points
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
        <Stat label="Score" value={String(result.newScore)} />
        <Stat label="Streak" value={`${result.streak} 🔥`} />
        <Stat label="Rank" value={result.rank ? `#${result.rank}` : '—'} />
      </div>

      <div className="mt-8 flex w-full max-w-md flex-col gap-2">
        <Button onClick={onPlayAgain} fullWidth size="lg">
          Play Again
        </Button>
        <Button variant="ghost" onClick={() => router.push('/games')} fullWidth>
          Back to Games
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 text-center">
      <p className="text-xs uppercase text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
