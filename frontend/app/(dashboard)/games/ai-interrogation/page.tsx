'use client';

/**
 * AI INTERROGATION PAGE — PROPOSAL A FRONTEND
 * ─────────────────────────────────────────────────────────────────
 *
 * BUG FIXES IN THIS VERSION:
 *
 * 🟡 Fix #1 (frontend half): P2 now sees participation UI instead of
 *   false "Wrong guess!" framing.
 *
 *   Backend now sends `correct: null` (sentinel) and `participated: true`
 *   for P2's result. The reveal screen below detects this and renders
 *   the participation-only UI.
 *
 *   For P1, behavior unchanged — they see the standard correct/wrong reveal.
 *
 * Other minor fixes:
 * - Local state explicitly cleared in "Play again" handler (prevents stale)
 * - Time-out badges shown when an answer was forced by timeout
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Mic, Vote, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGame';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getGameSocket } from '@/lib/socket';
import { GameLobby } from '@/components/games/GameLobby';
import { cn } from '@/lib/utils';

interface Exchange {
  question: string;
  answer: string | null;
  timedOut?: boolean;
}

export default function InterrogationPage() {
  const router = useRouter();
  const { findMatch, cancelMatch, sendGameMessage, submitVote } = useGameSocket();
  const phase = useGameStore((s) => s.phase);
  const match = useGameStore((s) => s.match);
  const result = useGameStore((s) => s.result);
  const reset = useGameStore((s) => s.reset);
  const setGameType = useGameStore((s) => s.setGameType);
  const me = useAuthStore((s) => s.user);

  const [role, setRole] = useState<'interrogator' | 'answerer'>('interrogator');
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [allAnswered, setAllAnswered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Local state cleanup helper. Used both by unmount cleanup AND by
   * "Play again" button — covers a previous bug where local state
   * persisted across game replays causing stale UI.
   */
  const clearLocalState = () => {
    setRole('interrogator');
    setMaxQuestions(5);
    setExchanges([]);
    setWaitingForAnswer(false);
    setAllAnswered(false);
  };

  useEffect(() => {
    setGameType('interrogation');
    return () => {
      reset();
      clearLocalState();
    };
  }, [setGameType, reset]);

  /* ─────────────────────────── Socket listeners ─────────────────────────── */

  useEffect(() => {
    const socket = getGameSocket();

    interface InitMsg {
      kind: string;
      role: 'interrogator' | 'answerer';
      maxQuestions: number;
    }
    interface QuestionMsg {
      question: string;
      questionIdx: number;
      maxQuestions: number;
    }
    interface AnswerMsg {
      answer: string;
      questionIdx: number;
      maxQuestions: number;
      allAnswered: boolean;
      timedOut?: boolean;
    }

    const onMeta = (e: InitMsg) => {
      if (e.kind !== 'interrogation-init') return;
      setRole(e.role);
      setMaxQuestions(e.maxQuestions);
    };
    const onQ = (e: QuestionMsg) => {
      setExchanges((arr) => [
        ...arr,
        { question: e.question, answer: null },
      ]);
      setWaitingForAnswer(true);
    };
    const onA = (e: AnswerMsg) => {
      setExchanges((arr) => {
        const next = arr.map((ex, i) =>
          i === arr.length - 1
            ? { ...ex, answer: e.answer, timedOut: e.timedOut }
            : ex
        );
        return next;
      });
      setWaitingForAnswer(false);
      if (e.allAnswered) setAllAnswered(true);
    };

    socket.on('game:metadata', onMeta);
    socket.on('game:interrogation-question', onQ);
    socket.on('game:interrogation-answer', onA);

    return () => {
      socket.off('game:metadata', onMeta);
      socket.off('game:interrogation-question', onQ);
      socket.off('game:interrogation-answer', onA);
    };
  }, []);

  const isInterrogator = role === 'interrogator';
  const questionsAsked = exchanges.length;

  /* ─────────────────────────── Handlers ─────────────────────────── */

  const sendQuestion = () => {
    if (!match || !inputRef.current?.value.trim()) return;
    if (waitingForAnswer || allAnswered) return;
    sendGameMessage(match.roomKey, inputRef.current.value.trim());
    if (inputRef.current) inputRef.current.value = '';
  };

  const sendAnswer = () => {
    if (!match || !inputRef.current?.value.trim()) return;
    sendGameMessage(match.roomKey, inputRef.current.value.trim());
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePlayAgain = () => {
    reset();
    clearLocalState();
    router.refresh();
  };

  /* ─────────────────────────── Render: Lobby ─────────────────────────── */

  if (phase === 'idle' || phase === 'searching') {
    return (
      <GameLobby
        title="AI Interrogation"
        emoji="🕵️"
        description="Ask 5 questions, then guess: are you talking to a real human, or an AI in disguise?"
        phase={phase}
        onFind={() => findMatch('interrogation')}
        onCancel={() => cancelMatch('interrogation')}
      />
    );
  }

  /* ─────────────────────────── Render: Reveal screen ─────────────────────────── */

  if (phase === 'finished' && result) {
    /**
     * 🟡 Fix #1: Detect P2's participation result via `correct: null` sentinel.
     * Falls through to standard win/loss UI for P1 (correct: true|false).
     */
    const isParticipationResult =
      (result as { correct?: unknown }).correct === null;

    if (isParticipationResult) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
          <div className="mx-auto max-w-md text-center">
            <Sparkles size={56} className="mx-auto mb-3 text-amber-400" />
            <h1 className="text-3xl font-bold">You participated!</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {(result as { summary?: string }).summary ??
                'You answered all the questions. +5 points for participating.'}
            </p>

            <Card className="mt-6 p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-[var(--color-text-muted)]">
                    Earned
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-accent)]">
                    +{result.points}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--color-text-muted)]">
                    Total score
                  </p>
                  <p className="text-2xl font-bold">{result.newScore}</p>
                </div>
              </div>
            </Card>

            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/games"
                className="self-center text-sm text-[var(--color-text-muted)] hover:underline"
              >
                ← Back to games
              </Link>
              <Button onClick={handlePlayAgain}>Play again</Button>
            </div>
          </div>
        </div>
      );
    }

    // Standard P1 reveal (interrogator's result)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-2 text-6xl">{result.correct ? '🎯' : '🤔'}</div>
          <h1 className="text-3xl font-bold">
            {result.correct ? 'You got it!' : 'Wrong call!'}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {(result as { summary?: string }).summary ?? ''}
          </p>

          <Card className="mt-6 p-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs uppercase text-[var(--color-text-muted)]">
                  Points
                </p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    result.points > 0
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text-muted)]'
                  )}
                >
                  {result.points > 0 ? `+${result.points}` : result.points}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--color-text-muted)]">
                  Streak
                </p>
                <p className="text-2xl font-bold">{result.streak ?? 0}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--color-text-muted)]">
                  Rank
                </p>
                <p className="text-2xl font-bold">
                  {result.rank ? `#${result.rank}` : '—'}
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/games"
              className="self-center text-sm text-[var(--color-text-muted)] hover:underline"
            >
              ← Back to games
            </Link>
            <Button onClick={handlePlayAgain}>Play again</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────── Render: Voting screen (interrogator) ─────────────────────────── */

  if (phase === 'voting' && isInterrogator && match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <Vote size={48} className="mx-auto mb-3 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold">Make your call</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Based on the answers — was your opponent a real human or an AI?
          </p>

          <Card className="mt-6 max-h-64 overflow-y-auto p-4 text-left">
            {exchanges.map((ex, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                  Q{i + 1}: {ex.question}
                </p>
                <p className="text-sm">
                  {ex.answer ?? '(no answer)'}
                  {ex.timedOut && (
                    <span className="ml-2 text-[10px] text-[var(--color-warning)]">
                      [timeout]
                    </span>
                  )}
                </p>
              </div>
            ))}
          </Card>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => submitVote(match.roomKey, 'human')}
              className="flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-6 hover:border-emerald-500/50 hover:bg-emerald-500/10 sm:max-w-[200px]"
            >
              <div className="text-3xl">🧍</div>
              <span className="font-bold">Real human</span>
            </button>
            <button
              onClick={() => submitVote(match.roomKey, 'ai')}
              className="flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-6 hover:border-violet-500/50 hover:bg-violet-500/10 sm:max-w-[200px]"
            >
              <div className="text-3xl">🤖</div>
              <span className="font-bold">AI</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────── Render: Active interrogation ─────────────────────────── */

  return (
    <div className="flex min-h-screen flex-col bg-game-grid">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3">
        <Link href="/games" className="lg:hidden">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {isInterrogator ? 'You ask' : 'You answer'}
          </p>
          <p className="text-sm font-bold">
            {isInterrogator ? '🕵️ Interrogator' : '🎭 Answerer'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-muted)]">
            {questionsAsked} / {maxQuestions} questions
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {exchanges.length === 0 && (
            <p className="text-center text-sm text-[var(--color-text-muted)] mt-8">
              {isInterrogator
                ? 'Ask anything to figure out if your opponent is human or AI.'
                : 'Wait for questions and answer naturally.'}
            </p>
          )}
          {exchanges.map((ex, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-end">
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                    isInterrogator
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-elevated)]'
                  )}
                >
                  <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                    {isInterrogator ? 'You' : 'Interrogator'} · Q{i + 1}
                  </p>
                  <p>{ex.question}</p>
                </div>
              </div>
              {ex.answer !== null && (
                <div className="flex justify-start">
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                      !isInterrogator
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-elevated)]'
                    )}
                  >
                    <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                      {isInterrogator ? 'Answerer' : 'You'}
                    </p>
                    <p>{ex.answer}</p>
                    {ex.timedOut && (
                      <p className="text-[10px] opacity-50 mt-1">[timeout]</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isInterrogator) sendQuestion();
          else sendAnswer();
        }}
        className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={
              isInterrogator
                ? waitingForAnswer
                  ? 'Wait for the answer…'
                  : allAnswered
                  ? 'All questions asked — make your call'
                  : `Question ${questionsAsked + 1} of ${maxQuestions}…`
                : exchanges[exchanges.length - 1]?.answer === null
                ? 'Type your answer…'
                : 'Wait for the next question…'
            }
            disabled={
              isInterrogator
                ? waitingForAnswer || allAnswered
                : !exchanges[exchanges.length - 1] ||
                  exchanges[exchanges.length - 1].answer !== null
            }
            maxLength={280}
            className="flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-50"
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-30"
          >
            {isInterrogator ? <Mic size={16} /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}