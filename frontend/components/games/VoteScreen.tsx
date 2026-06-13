// 'use client';

// import { useEffect, useState } from 'react';
// import { Brain, User as UserIcon } from 'lucide-react';
// import { cn } from '@/lib/utils';

// interface Props {
//   onVote: (vote: 'human' | 'ai') => void;
// }

// export function VoteScreen({ onVote }: Props) {
//   const [chosen, setChosen] = useState<'human' | 'ai' | null>(null);
//   const [count, setCount] = useState(8);

//   useEffect(() => {
//     const id = setInterval(() => {
//       setCount((c) => {
//         if (c <= 1) {
//           clearInterval(id);
//           return 0;
//         }
//         return c - 1;
//       });
//     }, 1000);
//     return () => clearInterval(id);
//   }, []);

//   const cast = (v: 'human' | 'ai') => {
//     if (chosen) return;
//     setChosen(v);
//     onVote(v);
//   };

//   return (
//     <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--color-bg-base)]/95 backdrop-blur-md">
//       <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
//         Time&apos;s up — who were you talking to?
//       </h2>
//       <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
//         Auto-locks in <span className="font-bold text-[var(--color-accent)]">{count}</span>s
//       </p>

//       <div className="grid w-full max-w-xl grid-cols-2 gap-4 px-4">
//         <button
//           onClick={() => cast('human')}
//           disabled={!!chosen}
//           className={cn(
//             'group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 px-6 py-10 transition-all',
//             chosen === 'human'
//               ? 'border-[var(--color-success)] bg-[var(--color-success)]/15 scale-105'
//               : 'border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-success)] hover:scale-105',
//             chosen && chosen !== 'human' && 'opacity-50'
//           )}
//         >
//           <UserIcon size={48} className="text-[var(--color-success)]" />
//           <span className="text-xl font-bold">Human</span>
//         </button>
//         <button
//           onClick={() => cast('ai')}
//           disabled={!!chosen}
//           className={cn(
//             'group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 px-6 py-10 transition-all',
//             chosen === 'ai'
//               ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] scale-105'
//               : 'border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-accent)] hover:scale-105',
//             chosen && chosen !== 'ai' && 'opacity-50'
//           )}
//         >
//           <Brain size={48} className="text-[var(--color-accent)]" />
//           <span className="text-xl font-bold">AI</span>
//         </button>
//       </div>
//       {chosen && (
//         <p className="mt-6 text-sm text-[var(--color-text-secondary)]">
//           Locked in. Waiting for the reveal…
//         </p>
//       )}
//     </div>
//   );
// }
'use client';

/**
 * VOTE SCREEN COMPONENT
 * ─────────────────────────────────────────────────────────────────
 * Used by Turing Game to let player vote 'human' or 'ai' after the chat
 * phase ends.
 *
 * 🟡 FIX M1 (Batch 1 completion):
 *   Added optional `secondsLeft` prop. When provided, displays a countdown
 *   so user knows how long they have to vote (backend auto-finalizes after
 *   30s if no vote received).
 *
 *   Backwards compatible: if a caller doesn't pass secondsLeft, the
 *   countdown simply isn't rendered (no breakage).
 */

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fadeInUp } from '@/lib/gsap';

interface Props {
  onVote: (v: 'human' | 'ai') => void;
  /**
   * Optional countdown in seconds. When provided, shown above the buttons
   * so user knows time pressure. Backend auto-finalizes vote phase after
   * 30s — this prop reflects that countdown via the game:timer event with
   * phase: 'vote'.
   */
  secondsLeft?: number;
}

export function VoteScreen({ onVote, secondsLeft }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootRef.current) fadeInUp(rootRef.current);
  }, []);

  // Only render countdown if a numeric value > 0 is passed
  const showCountdown = typeof secondsLeft === 'number' && secondsLeft > 0;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--color-bg-base)]/95 backdrop-blur-sm px-4"
    >
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mb-2 text-5xl">🤔</div>
        <h2 className="text-2xl font-bold">Was that a real human?</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Make your call based on the conversation.
        </p>

        {/* Countdown — only shown when prop is provided */}
        {showCountdown && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Time to vote:{' '}
            <span className="font-bold text-[var(--color-accent)]">
              {secondsLeft}s
            </span>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => onVote('human')}
            className="flex-1 sm:max-w-[160px]"
            variant="primary"
          >
            🧍 Real human
          </Button>
          <Button
            onClick={() => onVote('ai')}
            className="flex-1 sm:max-w-[160px]"
            variant="secondary"
          >
            🤖 AI
          </Button>
        </div>
      </Card>
    </div>
  );
}