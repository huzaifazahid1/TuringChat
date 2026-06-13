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
import type { WordAdded, JudgedResult } from '@/types/game.types';

export default function WordForgePage() {
  const router = useRouter();
  const { findMatch, cancelMatch, submitWord } = useGameSocket();
  const phase = useGameStore((s) => s.phase);
  const match = useGameStore((s) => s.match);
  const reset = useGameStore((s) => s.reset);
  const setGameType = useGameStore((s) => s.setGameType);
  const metadata = useGameStore((s) => s.metadata);
  const result = useGameStore((s) => s.result);

  const [story, setStory] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [maxWords, setMaxWords] = useState(30);
  const [currentTurn, setCurrentTurn] = useState<'p1' | 'p2'>('p1');
  const [judging, setJudging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGameType('word-forge');
    return () => reset();
  }, [setGameType, reset]);

  // Initial state on match
  useEffect(() => {
    if (metadata && metadata.kind === 'word-forge-init') {
      setStory(String(metadata.story ?? ''));
      setWordCount(Number(metadata.wordCount ?? 0));
      setMaxWords(Number(metadata.maxWords ?? 30));
      setCurrentTurn((metadata.currentTurn as 'p1' | 'p2') ?? 'p1');
    }
  }, [metadata]);

  // Subscribe to word events
  useEffect(() => {
    const socket = getGameSocket();
    const onWord = (e: WordAdded) => {
      setStory(e.story);
      setWordCount(e.wordCount);
      setMaxWords(e.maxWords);
      setCurrentTurn(e.currentTurn);
    };
    const onJudged = (_: JudgedResult) => setJudging(true);
    socket.on('game:word-added', onWord);
    socket.on('game:judged', onJudged);
    return () => {
      socket.off('game:word-added', onWord);
      socket.off('game:judged', onJudged);
    };
  }, []);

  const mySlot = match?.youAreSlot ?? 'p1';
  const isMyTurn = currentTurn === mySlot && phase === 'playing';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !inputRef.current?.value.trim() || !isMyTurn) return;
    const word = inputRef.current.value.trim().split(/\s+/)[0];
    if (!word) return;
    submitWord(match.roomKey, word);
    inputRef.current.value = '';
  };

  if (phase === 'idle' || phase === 'searching') {
    return (
      <GameLobby
        title="Word Forge"
        emoji="✍️"
        description="Build a story together — one word at a time. After 30 words, an AI judge picks a winner."
        phase={phase}
        onFind={() => findMatch('word-forge')}
        onCancel={() => cancelMatch('word-forge')}
      />
    );
  }

  if (phase === 'finished' && result) {
    return (
      <FinishScreen
        title={result.correct ? 'You won!' : 'Good story.'}
        emoji={result.correct ? '🏆' : '🪶'}
        story={story}
        result={result}
        onReplay={() => {
          reset();
          router.refresh();
        }}
      />
    );
  }

  const theme = String((metadata as { theme?: string })?.theme ?? 'Build a story');
  const progress = (wordCount / maxWords) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-game-grid">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3">
        <Link href="/games" className="lg:hidden">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Theme</p>
          <p className="font-semibold truncate">{theme}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-muted)]">
            {wordCount} / {maxWords} words
          </p>
        </div>
      </header>

      <div className="h-1 w-full bg-[var(--color-bg-elevated)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-2">
              The story so far
            </p>
            <p className="leading-relaxed text-lg">
              {story || (
                <span className="text-[var(--color-text-muted)]">
                  Be the first to add a word…
                </span>
              )}
              <span className="ml-1 inline-block h-5 w-1 animate-pulse bg-[var(--color-accent)]" />
            </p>
          </Card>

          <div className="mt-4 text-center">
            <p
              className={cn(
                'inline-block rounded-full px-4 py-1.5 text-xs font-semibold',
                isMyTurn
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'
              )}
            >
              {isMyTurn ? '✏️ Your turn — add one word' : "⏳ Opponent's turn…"}
            </p>
          </div>

          {judging && (
            <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
              Judging the story…
            </p>
          )}
        </div>
      </main>

      <form
        onSubmit={onSubmit}
        className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={isMyTurn ? 'Type one word…' : 'Wait for your turn…'}
            disabled={!isMyTurn}
            maxLength={20}
            className="flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isMyTurn}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-30"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function FinishScreen({
  title,
  emoji,
  story,
  result,
  onReplay,
}: {
  title: string;
  emoji: string;
  story: string;
  result: { points: number; newScore: number; summary?: string };
  onReplay: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
      <div className="mx-auto max-w-xl text-center">
        <div className="mb-2 text-6xl">{emoji}</div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {result.summary && (
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{result.summary}</p>
        )}
        <Card className="mt-6 p-5 text-left">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-2">
            Final story
          </p>
          <p className="leading-relaxed">{story}</p>
        </Card>
        <p className="mt-4 text-sm">
          +<span className="text-[var(--color-accent)] font-bold">{result.points}</span> pts
          {' · '}new score: {result.newScore}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/games"
            className="text-sm text-[var(--color-text-muted)] hover:underline self-center"
          >
            ← Back to games
          </Link>
          <Button onClick={onReplay}>Play again</Button>
        </div>
      </div>
    </div>
  );
}