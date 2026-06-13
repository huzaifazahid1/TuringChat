// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import { ArrowLeft, Send, Lock } from 'lucide-react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { useGameStore } from '@/store/gameStore';
// import { useGameSocket } from '@/hooks/useGame';
// import { Button } from '@/components/ui/Button';
// import { Card } from '@/components/ui/Card';
// import { getGameSocket } from '@/lib/socket';
// import { cn } from '@/lib/utils';
// import { GameLobby } from '@/components/games/GameLobby';
// import type {
//   ImposterInit,
//   ImposterClue,
//   ImposterViolation,
//   JudgedResult,
// } from '@/types/game.types';

// interface Clue {
//   author: 'p1' | 'p2';
//   content: string;
//   turnIdx: number;
// }

// export default function ImposterPage() {
//   const router = useRouter();
//   const { findMatch, cancelMatch, sendGameMessage } = useGameSocket();
//   const phase = useGameStore((s) => s.phase);
//   const match = useGameStore((s) => s.match);
//   const reset = useGameStore((s) => s.reset);
//   const setGameType = useGameStore((s) => s.setGameType);
//   const result = useGameStore((s) => s.result);

//   const [secretWord, setSecretWord] = useState('');
//   const [currentTurn, setCurrentTurn] = useState<'p1' | 'p2'>('p1');
//   const [turnIdx, setTurnIdx] = useState(0);
//   const [maxTurns, setMaxTurns] = useState(6);
//   const [clues, setClues] = useState<Clue[]>([]);
//   const [violation, setViolation] = useState<ImposterViolation | null>(null);
//   const [judged, setJudged] = useState<JudgedResult | null>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     setGameType('imposter');
//     return () => reset();
//   }, [setGameType, reset]);

//   useEffect(() => {
//     const socket = getGameSocket();

//     const onMeta = (e: { kind: string } & ImposterInit) => {
//       if (e.kind !== 'imposter-init') return;
//       setSecretWord(e.word);
//       setCurrentTurn(e.currentTurn);
//       setTurnIdx(e.turnIdx);
//       setMaxTurns(e.maxTurns);
//     };
//     const onClue = (e: ImposterClue) => {
//       setClues((c) => [...c, { author: e.author, content: e.content, turnIdx: e.turnIdx }]);
//       setCurrentTurn(e.nextTurn);
//       setTurnIdx(e.turnIdx);
//     };
//     const onViolation = (e: ImposterViolation) => setViolation(e);
//     const onJudged = (e: JudgedResult) => setJudged(e);

//     socket.on('game:metadata', onMeta);
//     socket.on('game:imposter-clue', onClue);
//     socket.on('game:imposter-violation', onViolation);
//     socket.on('game:judged', onJudged);

//     return () => {
//       socket.off('game:metadata', onMeta);
//       socket.off('game:imposter-clue', onClue);
//       socket.off('game:imposter-violation', onViolation);
//       socket.off('game:judged', onJudged);
//     };
//   }, []);

//   const mySlot = match?.youAreSlot ?? 'p1';
//   const isMyTurn = currentTurn === mySlot && phase === 'playing';

//   const submit = () => {
//     if (!match || !inputRef.current?.value.trim() || !isMyTurn) return;
//     const text = inputRef.current.value.trim();
//     sendGameMessage(match.roomKey, text);
//     inputRef.current.value = '';
//   };

//   if (phase === 'idle' || phase === 'searching') {
//     return (
//       <GameLobby
//         title="Imposter Prompt"
//         emoji="🎭"
//         description="You both share the same secret word. Take turns describing it without ever saying it. Say the word — instant loss."
//         phase={phase}
//         onFind={() => findMatch('imposter')}
//         onCancel={() => cancelMatch('imposter')}
//       />
//     );
//   }

//   if (phase === 'finished' && result) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
//         <div className="mx-auto max-w-2xl text-center">
//           <div className="mb-2 text-6xl">{result.correct ? '🏆' : '🎭'}</div>
//           <h1 className="text-3xl font-bold">{result.correct ? 'You won!' : 'Better luck next time.'}</h1>
//           <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
//             The word was: <span className="font-bold text-[var(--color-accent)]">{secretWord}</span>
//           </p>
//           {result.summary && (
//             <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{result.summary}</p>
//           )}
//           <p className="mt-4 text-sm">
//             +<span className="text-[var(--color-accent)] font-bold">{result.points}</span> pts ·
//             new score: {result.newScore}
//           </p>
//           <div className="mt-6 flex justify-center gap-3">
//             <Link
//               href="/games"
//               className="text-sm text-[var(--color-text-muted)] hover:underline self-center"
//             >
//               ← Back to games
//             </Link>
//             <Button
//               onClick={() => {
//                 reset();
//                 router.refresh();
//               }}
//             >
//               Play again
//             </Button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex min-h-screen flex-col bg-game-grid">
//       <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3">
//         <Link href="/games" className="lg:hidden">
//           <ArrowLeft size={20} />
//         </Link>
//         <div className="flex-1 min-w-0">
//           <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
//             Secret word — don&apos;t say it!
//           </p>
//           <p className="font-bold text-[var(--color-accent)] text-lg">{secretWord}</p>
//         </div>
//         <div className="text-right">
//           <p className="text-xs text-[var(--color-text-muted)]">
//             Clue {turnIdx} / {maxTurns}
//           </p>
//         </div>
//       </header>

//       <main className="flex-1 overflow-y-auto px-4 py-6">
//         <div className="mx-auto max-w-2xl space-y-3">
//           {clues.length === 0 && (
//             <p className="text-center text-sm text-[var(--color-text-muted)] mt-8">
//               Be cryptic. Don&apos;t make it obvious.
//             </p>
//           )}
//           {clues.map((c, i) => (
//             <div
//               key={i}
//               className={cn(
//                 'flex',
//                 c.author === mySlot ? 'justify-end' : 'justify-start'
//               )}
//             >
//               <div
//                 className={cn(
//                   'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
//                   c.author === mySlot
//                     ? 'bg-[var(--color-accent)] text-white'
//                     : 'bg-[var(--color-bg-elevated)]'
//                 )}
//               >
//                 <p className="text-[10px] font-semibold opacity-70 mb-0.5">
//                   {c.author === mySlot ? 'You' : 'Opponent'}
//                 </p>
//                 <p>{c.content}</p>
//               </div>
//             </div>
//           ))}
//           {violation && (
//             <Card className="border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-4 text-center">
//               <p className="font-bold text-[var(--color-danger)]">
//                 {violation.who === mySlot ? 'You said the word!' : 'Opponent said the word!'}
//               </p>
//               <p className="text-xs text-[var(--color-text-secondary)] mt-1">
//                 Word: {violation.word}
//               </p>
//             </Card>
//           )}
//           {!isMyTurn && phase === 'playing' && !violation && (
//             <p className="text-center text-xs text-[var(--color-text-muted)] mt-2">
//               {match?.opponent.name} is thinking…
//             </p>
//           )}
//           {judged && (
//             <p className="text-center text-xs text-[var(--color-text-muted)] mt-2">Judging…</p>
//           )}
//         </div>
//       </main>

//       <form
//         onSubmit={(e) => {
//           e.preventDefault();
//           submit();
//         }}
//         className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3"
//       >
//         <div className="mx-auto flex max-w-2xl gap-2">
//           <div className="relative flex-1">
//             {!isMyTurn && (
//               <Lock
//                 size={14}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
//               />
//             )}
//             <input
//               ref={inputRef}
//               type="text"
//               placeholder={isMyTurn ? 'Describe the word without saying it…' : 'Wait for your turn…'}
//               disabled={!isMyTurn}
//               maxLength={240}
//               className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-50"
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={!isMyTurn}
//             className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-30"
//           >
//             <Send size={16} />
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }






















































'use client';

/**
 * IMPOSTER GAME — PROPOSAL A FRONTEND
 * ─────────────────────────────────────────────────────────────────
 * COMPLETE REWRITE for the new game design.
 *
 * NEW UX FLOW:
 *
 *   1. Lobby (idle / searching) — same as before
 *
 *   2. Clueing phase:
 *      - Header shows "Your secret word: ___" (each player sees only their own)
 *      - 6 clue turns alternating
 *      - Clues displayed in chat-bubble style
 *      - Saying your word = instant loss
 *
 *   3. NEW: Voting phase:
 *      - "Who's the imposter?" prompt
 *      - Two buttons: vote P1 or P2
 *      - Wait for opponent's vote (or AI auto-vote)
 *
 *   4. Reveal phase:
 *      - Both words shown (real + imposter)
 *      - Whose word was the imposter shown
 *      - Personalized result: "You were the imposter, you fooled them!" etc.
 *      - Points awarded
 *
 * Note: this file replaces the existing app/(dashboard)/games/imposter/page.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Lock, Vote, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGame';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getGameSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { GameLobby } from '@/components/games/GameLobby';

interface Clue {
  author: 'p1' | 'p2';
  content: string;
  turnIdx: number;
}

interface VotePayload {
  voter: 'p1' | 'p2';
}

interface ImposterInitMsg {
  kind: 'imposter-init';
  yourWord: string; // ← only the player's own word
  currentTurn: 'p1' | 'p2';
  turnIdx: number;
  maxTurns: number;
}

interface JudgedPayload {
  winner: 'player1' | 'player2';
  realWord: string;
  imposterWord: string;
  imposterSlot: 'p1' | 'p2';
  summary: string;
  votes: { p1: 'p1' | 'p2' | null; p2: 'p1' | 'p2' | null };
}

export default function ImposterPage() {
  const router = useRouter();
  const { findMatch, cancelMatch, sendGameMessage } = useGameSocket();
  const phase = useGameStore((s) => s.phase);
  const match = useGameStore((s) => s.match);
  const reset = useGameStore((s) => s.reset);
  const setGameType = useGameStore((s) => s.setGameType);
  const result = useGameStore((s) => s.result);

  // Local game state — driven by socket events
  const [yourWord, setYourWord] = useState('');
  const [currentTurn, setCurrentTurn] = useState<'p1' | 'p2'>('p1');
  const [turnIdx, setTurnIdx] = useState(0);
  const [maxTurns, setMaxTurns] = useState(6);
  const [clues, setClues] = useState<Clue[]>([]);
  const [violation, setViolation] = useState<{ who: 'p1' | 'p2'; word: string } | null>(null);
  const [votingPhase, setVotingPhase] = useState(false);
  const [myVote, setMyVote] = useState<'p1' | 'p2' | null>(null);
  const [opponentVoted, setOpponentVoted] = useState(false);
  const [judged, setJudged] = useState<JudgedPayload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGameType('imposter');
    return () => {
      reset();
      // Local state will be cleared by component unmount
    };
  }, [setGameType, reset]);

  /**
   * Listen to imposter-specific socket events.
   * Note: useGameSocket already handles game:queued, game:match-found, game:result, etc.
   * This effect only attaches the imposter-specific ones.
   */
  useEffect(() => {
    const socket = getGameSocket();

    const onMeta = (e: { kind: string } & ImposterInitMsg) => {
      if (e.kind !== 'imposter-init') return;
      setYourWord(e.yourWord);
      setCurrentTurn(e.currentTurn);
      setTurnIdx(e.turnIdx);
      setMaxTurns(e.maxTurns);
    };

    const onClue = (e: Clue & { nextTurn: 'p1' | 'p2'; maxTurns: number }) => {
      setClues((c) => [...c, { author: e.author, content: e.content, turnIdx: e.turnIdx }]);
      setCurrentTurn(e.nextTurn);
      setTurnIdx(e.turnIdx);
    };

    const onViolation = (e: { who: 'p1' | 'p2'; word: string }) => setViolation(e);

    const onVotePhase = (e: { kind?: string }) => {
      if (e.kind === 'imposter-vote' || !e.kind) {
        setVotingPhase(true);
      }
    };

    const onVoteCast = (e: VotePayload) => {
      const mySlot = match?.youAreSlot ?? 'p1';
      if (e.voter !== mySlot) {
        setOpponentVoted(true);
      }
    };

    const onJudged = (e: JudgedPayload) => {
      setJudged(e);
    };

    socket.on('game:metadata', onMeta);
    socket.on('game:imposter-clue', onClue);
    socket.on('game:imposter-violation', onViolation);
    socket.on('game:vote-phase', onVotePhase);
    socket.on('game:imposter-vote-cast', onVoteCast);
    socket.on('game:judged', onJudged);

    return () => {
      socket.off('game:metadata', onMeta);
      socket.off('game:imposter-clue', onClue);
      socket.off('game:imposter-violation', onViolation);
      socket.off('game:vote-phase', onVotePhase);
      socket.off('game:imposter-vote-cast', onVoteCast);
      socket.off('game:judged', onJudged);
    };
  }, [match]);

  const mySlot = match?.youAreSlot ?? 'p1';
  const isMyTurn = currentTurn === mySlot && phase === 'playing' && !votingPhase;

  const submit = () => {
    if (!match || !inputRef.current?.value.trim() || !isMyTurn) return;
    const text = inputRef.current.value.trim();
    sendGameMessage(match.roomKey, text);
    inputRef.current.value = '';
  };

  /**
   * Submit vote during voting phase.
   * Uses the standard 'game:vote' event with vote = 'p1' | 'p2' (not 'human'/'ai').
   * Backend distinguishes by gameType.
   */
  const submitImposterVote = (target: 'p1' | 'p2') => {
    if (!match || myVote !== null) return;
    setMyVote(target);
    // Reuse submitVote from useGameSocket. The hook expects 'human'|'ai',
    // but we extend its type — see hook update needed in Batch 4.
    // For now, emit directly:
    const socket = getGameSocket();
    socket.emit('game:vote', { roomKey: match.roomKey, vote: target });
  };

  /* ─── Lobby ─── */
  if (phase === 'idle' || phase === 'searching') {
    return (
      <GameLobby
        title="Imposter Prompt"
        emoji="🎭"
        description="One of you has the real word, the other has an imposter word. Give clues, then vote — who's faking it?"
        phase={phase}
        onFind={() => findMatch('imposter')}
        onCancel={() => cancelMatch('imposter')}
      />
    );
  }

  /* ─── Reveal phase (judged received OR result received) ─── */
  if (phase === 'finished' && result) {
    const youWereImposter = (result as { youWereImposter?: boolean }).youWereImposter ?? false;
    const realWord = (result as { realWord?: string }).realWord ?? '';
    const yourWordReveal = (result as { yourWord?: string }).yourWord ?? yourWord;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 text-6xl">{result.correct ? '🏆' : '🎭'}</div>
          <h1 className="text-3xl font-bold">
            {result.correct ? 'You won!' : 'Better luck next time.'}
          </h1>

          {/* Word reveal panel */}
          <Card className="mt-6 p-5 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                  Your word
                </p>
                <p className="text-lg font-bold text-[var(--color-accent)]">{yourWordReveal}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {youWereImposter ? '(imposter)' : '(real)'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                  Real word
                </p>
                <p className="text-lg font-bold">{realWord}</p>
              </div>
            </div>
          </Card>

          {result.summary && (
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
              {result.summary}
            </p>
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
            <Button
              onClick={() => {
                reset();
                // Reset local state too (since unmount won't trigger immediately)
                setYourWord('');
                setClues([]);
                setMyVote(null);
                setOpponentVoted(false);
                setVotingPhase(false);
                setViolation(null);
                setJudged(null);
                setTurnIdx(0);
                router.refresh();
              }}
            >
              Play again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Voting phase ─── */
  if (votingPhase && !result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <Vote size={48} className="mx-auto mb-3 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold">Who&apos;s the imposter?</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
            One of you had the real word, the other had a different one.
            Based on the clues — who do you think had the imposter word?
          </p>

          {/* Clue review */}
          <Card className="mt-6 p-4 text-left max-h-64 overflow-y-auto">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-2">
              All clues
            </p>
            {clues.map((c, i) => (
              <div key={i} className="mb-1 text-sm">
                <span className="font-semibold">
                  {c.author === mySlot ? 'You' : 'Opponent'}:
                </span>{' '}
                {c.content}
              </div>
            ))}
          </Card>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => submitImposterVote('p1')}
              disabled={myVote !== null}
              className={cn(
                'flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-6 hover:border-amber-500/50 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed sm:max-w-[200px]',
                myVote === 'p1' && 'border-amber-500 bg-amber-500/20'
              )}
            >
              <Eye size={32} className="text-amber-400" />
              <span className="font-bold">Player 1{mySlot === 'p1' && ' (you)'}</span>
            </button>
            <button
              onClick={() => submitImposterVote('p2')}
              disabled={myVote !== null}
              className={cn(
                'flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-6 hover:border-rose-500/50 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed sm:max-w-[200px]',
                myVote === 'p2' && 'border-rose-500 bg-rose-500/20'
              )}
            >
              <Eye size={32} className="text-rose-400" />
              <span className="font-bold">Player 2{mySlot === 'p2' && ' (you)'}</span>
            </button>
          </div>

          {myVote && (
            <p className="mt-6 text-sm text-[var(--color-text-secondary)]">
              {opponentVoted
                ? 'Both voted. Calculating results…'
                : 'Waiting for opponent to vote…'}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ─── Active clueing phase ─── */
  return (
    <div className="flex min-h-screen flex-col bg-game-grid">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3">
        <Link href="/games" className="lg:hidden">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Your secret word — don&apos;t say it!
          </p>
          <p className="font-bold text-[var(--color-accent)] text-lg">{yourWord}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-muted)]">
            Clue {turnIdx} / {maxTurns}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {clues.length === 0 && (
            <p className="text-center text-sm text-[var(--color-text-muted)] mt-8">
              You and your opponent have words from the SAME category — but they
              might NOT be the same word. Be specific enough to describe yours,
              but watch what they say to figure out who has what.
            </p>
          )}
          {clues.map((c, i) => (
            <div
              key={i}
              className={cn('flex', c.author === mySlot ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  c.author === mySlot
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-elevated)]'
                )}
              >
                <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                  {c.author === mySlot ? 'You' : 'Opponent'}
                </p>
                <p>{c.content}</p>
              </div>
            </div>
          ))}
          {violation && (
            <Card className="border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-4 text-center">
              <p className="font-bold text-[var(--color-danger)]">
                {violation.who === mySlot
                  ? 'You said your word!'
                  : 'Opponent said their word!'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Word: {violation.word}
              </p>
            </Card>
          )}
          {!isMyTurn && phase === 'playing' && !violation && !votingPhase && (
            <p className="text-center text-xs text-[var(--color-text-muted)] mt-2">
              {match?.opponent.name ?? 'Opponent'} is thinking…
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
          <div className="relative flex-1">
            {!isMyTurn && (
              <Lock
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder={isMyTurn ? 'Describe your word without saying it…' : 'Wait for your turn…'}
              disabled={!isMyTurn}
              maxLength={240}
              className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-50"
            />
          </div>
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