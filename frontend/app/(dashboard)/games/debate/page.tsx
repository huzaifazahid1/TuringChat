'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGame';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getGameSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { GameLobby } from '@/components/games/GameLobby';
import type { DebateInit, DebateArgument, DebateTurnSwitch, JudgedResult } from '@/types/game.types';

interface Argument {
  author: 'p1' | 'p2';
  content: string;
  round: number;
}

export default function DebatePage() {
  const router = useRouter();
  const { findMatch, cancelMatch, sendGameMessage } = useGameSocket();
  const phase = useGameStore((s) => s.phase);
  const match = useGameStore((s) => s.match);
  const reset = useGameStore((s) => s.reset);
  const setGameType = useGameStore((s) => s.setGameType);
  const result = useGameStore((s) => s.result);

  const [topic, setTopic] = useState('');
  const [yourSide, setYourSide] = useState<'pro' | 'con'>('pro');
  const [opponentSide, setOpponentSide] = useState<'pro' | 'con'>('con');
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(4);
  const [currentTurn, setCurrentTurn] = useState<'p1' | 'p2'>('p1');
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<Argument[]>([]);
  const [judged, setJudged] = useState<JudgedResult | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setGameType('debate');
    return () => reset();
  }, [setGameType, reset]);

  // Subscribe to debate-specific events
  useEffect(() => {
    const socket = getGameSocket();

    const onMeta = (e: { kind: string } & DebateInit) => {
      if (e.kind !== 'debate-init') return;
      setTopic(e.topic);
      setYourSide(e.yourSide);
      setOpponentSide(e.opponentSide);
      setRound(e.round);
      setMaxRounds(e.maxRounds);
      setCurrentTurn(e.currentTurn);
    };
    const onArg = (e: DebateArgument) => {
      setTranscript((t) => [...t, e]);
    };
    const onTurn = (e: DebateTurnSwitch) => {
      setRound(e.round);
      setCurrentTurn(e.currentTurn);
    };
    const onTimer = (e: { secondsLeft: number }) => setSecsLeft(e.secondsLeft);
    const onJudged = (e: JudgedResult) => setJudged(e);

    socket.on('game:metadata', onMeta);
    socket.on('game:debate-argument', onArg);
    socket.on('game:debate-turn', onTurn);
    socket.on('game:timer', onTimer);
    socket.on('game:judged', onJudged);

    return () => {
      socket.off('game:metadata', onMeta);
      socket.off('game:debate-argument', onArg);
      socket.off('game:debate-turn', onTurn);
      socket.off('game:timer', onTimer);
      socket.off('game:judged', onJudged);
    };
  }, []);

  const mySlot = match?.youAreSlot ?? 'p1';
  const isMyTurn = currentTurn === mySlot && phase === 'playing';

  const submit = () => {
    if (!match || !inputRef.current?.value.trim() || !isMyTurn) return;
    const text = inputRef.current.value.trim();
    sendGameMessage(match.roomKey, text);
    inputRef.current.value = '';
  };

  if (phase === 'idle' || phase === 'searching') {
    return (
      <GameLobby
        title="Rapid Fire Debate"
        emoji="⚡"
        description="Random topic, random side. 4 rounds, 30 seconds each. An AI judge picks a winner."
        phase={phase}
        onFind={() => findMatch('debate')}
        onCancel={() => cancelMatch('debate')}
      />
    );
  }

  if (phase === 'finished' && result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 text-6xl">{result.correct ? '🏆' : '💬'}</div>
          <h1 className="text-3xl font-bold">{result.correct ? 'You won the debate!' : 'Good fight.'}</h1>
          {result.summary && (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{result.summary}</p>
          )}
          {judged && (judged.p1_score !== undefined || judged.p2_score !== undefined) && (
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div>
                <p className="text-xs uppercase text-[var(--color-text-muted)]">You</p>
                <p className="text-xl font-bold">
                  {mySlot === 'p1' ? judged.p1_score : judged.p2_score}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--color-text-muted)]">Opponent</p>
                <p className="text-xl font-bold">
                  {mySlot === 'p1' ? judged.p2_score : judged.p1_score}
                </p>
              </div>
            </div>
          )}
          <p className="mt-4 text-sm">
            +<span className="text-[var(--color-accent)] font-bold">{result.points}</span> pts ·
            new score: {result.newScore}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/games"
              className="text-sm text-[var(--color-text-muted)] hover:underline self-center"
            >
              ← Back to games
            </Link>
            <Button onClick={() => { reset(); router.refresh(); }}>Play again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-game-grid">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3">
        <Link href="/games" className="lg:hidden">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Topic</p>
          <p className="font-semibold truncate">{topic}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-muted)]">
            Round {round} / {maxRounds}
          </p>
          {secsLeft !== null && (
            <p
              className={cn(
                'text-sm font-bold',
                secsLeft <= 5 ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'
              )}
            >
              {secsLeft}s
            </p>
          )}
        </div>
      </header>

      <div className="px-4 py-3 bg-[var(--color-bg-panel)] border-b border-[var(--color-border-subtle)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold',
              yourSide === 'pro'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            )}
          >
            YOU · {yourSide === 'pro' ? 'IN FAVOR' : 'AGAINST'}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">vs</span>
          <div
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold',
              opponentSide === 'pro'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            )}
          >
            OPPONENT · {opponentSide === 'pro' ? 'IN FAVOR' : 'AGAINST'}
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {transcript.length === 0 && (
            <p className="text-center text-sm text-[var(--color-text-muted)] mt-8">
              Make your opening argument…
            </p>
          )}
          {transcript.map((arg, i) => (
            <Card
              key={i}
              className={cn(
                'p-4',
                arg.author === mySlot
                  ? 'ml-8 border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5'
                  : 'mr-8'
              )}
            >
              <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                {arg.author === mySlot ? 'You' : 'Opponent'} · Round {arg.round}
              </p>
              <p className="text-sm leading-relaxed">{arg.content}</p>
            </Card>
          ))}
          {!isMyTurn && phase === 'playing' && (
            <p className="text-center text-xs text-[var(--color-text-muted)] mt-2">
              {match?.opponent.name} is thinking…
            </p>
          )}
        </div>
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <textarea
            ref={inputRef}
            placeholder={isMyTurn ? 'Make your argument (1-3 sentences)…' : 'Wait for your turn…'}
            disabled={!isMyTurn}
            maxLength={400}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="flex-1 resize-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isMyTurn}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-30 self-end"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}