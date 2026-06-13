// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import { ArrowLeft, MoreVertical, HelpCircle, Send } from 'lucide-react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { useGameStore } from '@/store/gameStore';
// import { useGameSocket } from '@/hooks/useGame';
// import { useAuthStore } from '@/store/authStore';
// import { Avatar } from '@/components/ui/Avatar';
// import { Button } from '@/components/ui/Button';
// import { GameTimer } from '@/components/games/GameTimer';
// import { VoteScreen } from '@/components/games/VoteScreen';
// import { RevealScreen } from '@/components/games/RevealScreen';
// import { fadeInUp } from '@/lib/gsap';
// import { cn, timeShort } from '@/lib/utils';
// import type { GameMessage } from '@/types/game.types';

// export default function TuringGamePage() {
//   const router = useRouter();
//   const { findMatch, cancelMatch, sendGameMessage, submitVote } = useGameSocket();
//   const phase = useGameStore((s) => s.phase);
//   const match = useGameStore((s) => s.match);
//   const messages = useGameStore((s) => s.messages);
//   const secondsLeft = useGameStore((s) => s.secondsLeft);
//   const result = useGameStore((s) => s.result);
//   const reset = useGameStore((s) => s.reset);
//   const setGameType = useGameStore((s) => s.setGameType);
//   const me = useAuthStore((s) => s.user);

//   const inputRef = useRef<HTMLInputElement>(null);
//   const listRef = useRef<HTMLDivElement>(null);

//   // Reset when leaving page
//   useEffect(() => {
//     setGameType('turing');
//     return () => reset();
//   }, [setGameType, reset]);

//   // Auto-scroll on new messages
//   useEffect(() => {
//     if (listRef.current) {
//       listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
//       const last = listRef.current.lastElementChild;
//       fadeInUp(last as Element);
//     }
//   }, [messages.length]);

//   const onSend = () => {
//     const text = inputRef.current?.value.trim();
//     if (!text || !match) return;
//     sendGameMessage(match.roomKey, text);
//     if (inputRef.current) inputRef.current.value = '';
//   };

//   /* ───── Idle / Search phase ───── */
//   if (phase === 'idle' || phase === 'searching') {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4">
//         <div className="mb-8 flex items-center gap-3">
//           <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 glow-accent">
//             🤖
//           </div>
//         </div>
//         <h1 className="text-center text-3xl font-bold sm:text-4xl">Turing Game</h1>
//         <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)] max-w-md">
//           You&apos;ll be paired with either a real human or an AI.
//           Chat for 60 seconds and try to guess which.
//         </p>

//         {phase === 'searching' ? (
//           <SearchingBlock onCancel={() => cancelMatch('turing')} />
//         ) : (
//           <div className="mt-10 flex flex-col items-center gap-3">
//             <Button size="lg" onClick={() => findMatch('turing')}>
//               Find a match
//             </Button>
//             <Link href="/games" className="text-xs text-[var(--color-text-muted)] hover:underline">
//               ← Back to games
//             </Link>
//           </div>
//         )}
//       </div>
//     );
//   }

//   /* ───── Finished phase ───── */
//   if (phase === 'finished' && result) {
//     return (
//       <RevealScreen
//         result={result}
//         onPlayAgain={() => {
//           reset();
//           findMatch('turing');
//         }}
//       />
//     );
//   }

//   /* ───── Playing / voting phase ───── */
//   return (
//     <div className="relative flex h-screen flex-col bg-[var(--color-bg-base)]">
//       {/* Header */}
//       <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3">
//         <button
//           onClick={() => router.push('/games')}
//           className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
//         >
//           <ArrowLeft size={18} />
//         </button>
//         <div className="flex-1 text-center">
//           <h2 className="text-base font-bold">Turing Game</h2>
//         </div>
//         <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
//           <MoreVertical size={18} />
//         </button>
//       </header>

//       {/* Player strip */}
//       <div className="grid grid-cols-3 items-center gap-2 border-b border-[var(--color-border-subtle)] px-6 py-4 bg-[var(--color-bg-panel)]">
//         <div className="flex flex-col items-center gap-1">
//           <div className="relative">
//             <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
//               <HelpCircle size={28} />
//             </div>
//           </div>
//           <p className="text-xs text-[var(--color-text-muted)]">Opponent</p>
//           <p className="text-xs font-semibold">???</p>
//         </div>

//         <div className="flex flex-col items-center">
//           <GameTimer
//             secondsLeft={secondsLeft}
//             total={match?.timeLimit || 60}
//             size={88}
//           />
//         </div>

//         <div className="flex flex-col items-center gap-1">
//           {me && <Avatar seed={me.avatarSeed} size={56} ring />}
//           <p className="text-xs text-[var(--color-text-muted)]">You</p>
//           <p className="text-xs font-semibold">{me?.displayName}</p>
//         </div>
//       </div>

//       {/* Chat */}
//       <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
//         {messages.length === 0 && (
//           <div className="mt-12 text-center text-xs text-[var(--color-text-muted)]">
//             Say hi! You have 60 seconds.
//           </div>
//         )}
//         {messages.map((m: GameMessage, i) => {
//           const mine = m.senderId === me?.id;
//           return (
//             <div
//               key={i}
//               className={cn('mb-2 flex w-full', mine ? 'justify-end' : 'justify-start')}
//             >
//               <div
//                 className={cn(
//                   'max-w-[78%] px-4 py-2 text-sm leading-relaxed',
//                   mine ? 'bubble-me' : 'bubble-them'
//                 )}
//               >
//                 <p className="whitespace-pre-wrap">{m.content}</p>
//                 <span className="ml-2 inline-block text-[10px] opacity-70">
//                   {timeShort(m.timestamp)}
//                 </span>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Input */}
//       <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3">
//         <div className="flex items-center gap-2">
//           <input
//             ref={inputRef}
//             placeholder="Type a message…"
//             disabled={phase !== 'playing'}
//             onKeyDown={(e) => {
//               if (e.key === 'Enter') onSend();
//             }}
//             className="h-11 flex-1 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-50"
//           />
//           <button
//             onClick={onSend}
//             disabled={phase !== 'playing'}
//             className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
//           >
//             <Send size={18} />
//           </button>
//         </div>
//       </div>

//       {phase === 'voting' && match && (
//         <VoteScreen onVote={(v) => submitVote(match.roomKey, v)} />
//       )}
//     </div>
//   );
// }

// /* ───── Searching state with AI-fallback countdown ───── */
// function SearchingBlock({ onCancel }: { onCancel: () => void }) {
//   const queueInfo = useGameStore((s) => s.queueInfo);
//   const [secsLeft, setSecsLeft] = useState<number | null>(null);

//   useEffect(() => {
//     if (!queueInfo) {
//       setSecsLeft(null);
//       return;
//     }
//     const tick = () => {
//       const elapsed = performance.now() - queueInfo.queuedAt;
//       const remaining = Math.max(0, Math.ceil((queueInfo.fallbackInMs - elapsed) / 1000));
//       setSecsLeft(remaining);
//     };
//     tick();
//     const id = setInterval(tick, 250);
//     return () => clearInterval(id);
//   }, [queueInfo]);

//   return (
//     <div className="mt-10 flex flex-col items-center gap-4">
//       <div className="flex items-center gap-1.5">
//         <span className="typing-dot" />
//         <span className="typing-dot" />
//         <span className="typing-dot" />
//       </div>
//       <p className="text-sm text-[var(--color-text-secondary)]">Looking for a real human…</p>
//       {secsLeft !== null && secsLeft > 0 && (
//         <p className="text-xs text-[var(--color-text-muted)]">
//           AI takes over in <span className="font-bold text-[var(--color-accent)]">{secsLeft}s</span>
//           {' '}if no one shows up
//         </p>
//       )}
//       {secsLeft === 0 && (
//         <p className="text-xs text-[var(--color-accent)]">Pairing with AI…</p>
//       )}
//       <Button variant="secondary" onClick={onCancel}>
//         Cancel
//       </Button>
//     </div>
//   );
// }





















































'use client';

/**
 * TURING GAME PAGE
 * ─────────────────────────────────────────────────────────────────
 * BUG FIXES IN THIS VERSION:
 *
 * 🟡 Fix #2 (frontend half): Vote phase countdown
 *   Previous: phase === 'voting' rendered VoteScreen but no timer shown.
 *   New:      Vote phase reuses secondsLeft from game:timer events. The
 *             backend now sends game:timer with phase: 'vote' during voting,
 *             so the same `secondsLeft` field works for both phases.
 *
 *   Note: useGameSocket already calls setSecondsLeft on every game:timer.
 *   The ONLY change here is reading the new optional `phase` field on the
 *   timer event so we can label/style appropriately.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MoreVertical, HelpCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGame';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { GameTimer } from '@/components/games/GameTimer';
import { VoteScreen } from '@/components/games/VoteScreen';
import { RevealScreen } from '@/components/games/RevealScreen';
import { fadeInUp } from '@/lib/gsap';
import { cn, timeShort } from '@/lib/utils';
import type { GameMessage } from '@/types/game.types';

export default function TuringGamePage() {
  const router = useRouter();
  const { findMatch, cancelMatch, sendGameMessage, submitVote } = useGameSocket();
  const phase = useGameStore((s) => s.phase);
  const match = useGameStore((s) => s.match);
  const messages = useGameStore((s) => s.messages);
  const secondsLeft = useGameStore((s) => s.secondsLeft);
  const result = useGameStore((s) => s.result);
  const reset = useGameStore((s) => s.reset);
  const setGameType = useGameStore((s) => s.setGameType);
  const me = useAuthStore((s) => s.user);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGameType('turing');
    return () => reset();
  }, [setGameType, reset]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
      const last = listRef.current.lastElementChild;
      fadeInUp(last as Element);
    }
  }, [messages.length]);

  const onSend = () => {
    const text = inputRef.current?.value.trim();
    if (!text || !match) return;
    sendGameMessage(match.roomKey, text);
    if (inputRef.current) inputRef.current.value = '';
  };

  /* ───── Idle / Search phase ───── */
  if (phase === 'idle' || phase === 'searching') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-grid px-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 glow-accent">
            🤖
          </div>
        </div>
        <h1 className="text-center text-3xl font-bold sm:text-4xl">Turing Game</h1>
        <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)] max-w-md">
          You&apos;ll be paired with either a real human or an AI. Chat for 60
          seconds and try to guess which.
        </p>

        {phase === 'searching' ? (
          <SearchingBlock onCancel={() => cancelMatch('turing')} />
        ) : (
          <div className="mt-10 flex flex-col items-center gap-3">
            <Button size="lg" onClick={() => findMatch('turing')}>
              Find a match
            </Button>
            <Link
              href="/games"
              className="text-xs text-[var(--color-text-muted)] hover:underline"
            >
              ← Back to games
            </Link>
          </div>
        )}
      </div>
    );
  }

  /* ───── Finished phase ───── */
  if (phase === 'finished' && result) {
    return (
      <RevealScreen
        result={result}
        onPlayAgain={() => {
          reset();
          findMatch('turing');
        }}
      />
    );
  }

  /* ───── Playing / voting phase ───── */
  return (
    <div className="relative flex h-screen flex-col bg-[var(--color-bg-base)]">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3">
        <button
          onClick={() => router.push('/games')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-base font-bold">Turing Game</h2>
          {/* 🟡 FIX #2: Show phase label so user knows where they are */}
          <p className="text-xs text-[var(--color-text-muted)]">
            {phase === 'voting' ? 'Voting time' : 'Chat phase'}
          </p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
          <MoreVertical size={18} />
        </button>
      </header>

      <div className="grid grid-cols-3 items-center gap-2 border-b border-[var(--color-border-subtle)] px-6 py-4 bg-[var(--color-bg-panel)]">
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
              <HelpCircle size={28} />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Opponent</p>
          <p className="text-xs font-semibold">???</p>
        </div>

        <div className="flex flex-col items-center">
          {/* 🟡 FIX #2: Same timer component, but `total` adapts to phase */}
          <GameTimer
            secondsLeft={secondsLeft}
            total={phase === 'voting' ? 30 : match?.timeLimit || 60}
            size={88}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          {me && <Avatar seed={me.avatarSeed} size={56} ring />}
          <p className="text-xs text-[var(--color-text-muted)]">You</p>
          <p className="text-xs font-semibold">{me?.displayName}</p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {messages.length === 0 && (
          <div className="mt-12 text-center text-xs text-[var(--color-text-muted)]">
            Say hi! You have 60 seconds.
          </div>
        )}
        {messages.map((m: GameMessage, i) => {
          const mine = m.senderId === me?.id;
          return (
            <div
              key={i}
              className={cn('mb-2 flex w-full', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[78%] px-4 py-2 text-sm leading-relaxed',
                  mine ? 'bubble-me' : 'bubble-them'
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <span className="ml-2 inline-block text-[10px] opacity-70">
                  {timeShort(m.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            placeholder={
              phase === 'voting' ? 'Voting in progress…' : 'Type a message…'
            }
            disabled={phase !== 'playing'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSend();
            }}
            className="h-11 flex-1 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={phase !== 'playing'}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {phase === 'voting' && match && (
        <VoteScreen
          onVote={(v) => submitVote(match.roomKey, v)}
          /* 🟡 FIX #2: Pass timer info into VoteScreen so it can display countdown */
          secondsLeft={secondsLeft}
        />
      )}
    </div>
  );
}

/* ───── Searching state with AI-fallback countdown ───── */
function SearchingBlock({ onCancel }: { onCancel: () => void }) {
  const queueInfo = useGameStore((s) => s.queueInfo);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!queueInfo) {
      setSecsLeft(null);
      return;
    }
    const tick = () => {
      const elapsed = performance.now() - queueInfo.queuedAt;
      const remaining = Math.max(
        0,
        Math.ceil((queueInfo.fallbackInMs - elapsed) / 1000)
      );
      setSecsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [queueInfo]);

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Looking for a real human…
      </p>
      {secsLeft !== null && secsLeft > 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          AI takes over in{' '}
          <span className="font-bold text-[var(--color-accent)]">{secsLeft}s</span>{' '}
          if no one shows up
        </p>
      )}
      {secsLeft === 0 && (
        <p className="text-xs text-[var(--color-accent)]">Pairing with AI…</p>
      )}
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}