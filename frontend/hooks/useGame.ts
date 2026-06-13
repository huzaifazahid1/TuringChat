// 'use client';

// import { useEffect } from 'react';
// import { getGameSocket } from '@/lib/socket';
// import { useGameStore } from '@/store/gameStore';
// import { useAuthStore } from '@/store/authStore';
// import { playNotificationSound } from '@/lib/notification';
// import type { GameMatch, GameMessage, GameResult, GameType } from '@/types/game.types';

// /**
//  * Subscribes to /game namespace events and writes them into useGameStore.
//  * Mount this on every game page; it cleans up on unmount.
//  */
// export function useGameSocket() {
//   const setPhase = useGameStore((s) => s.setPhase);
//   const setMatch = useGameStore((s) => s.setMatch);
//   const pushMessage = useGameStore((s) => s.pushMessage);
//   const setSecondsLeft = useGameStore((s) => s.setSecondsLeft);
//   const setResult = useGameStore((s) => s.setResult);
//   const setMetadata = useGameStore((s) => s.setMetadata);
//   const setQueueInfo = useGameStore((s) => s.setQueueInfo);
//   const me = useAuthStore((s) => s.user);

//   useEffect(() => {
//     if (!me) return;
//     const socket = getGameSocket();
//     if (!socket.connected) socket.connect();

//     const onQueued = (e: { gameType: GameType; fallbackInMs?: number }) => {
//       setPhase('searching');
//       setQueueInfo({
//         gameType: e.gameType,
//         fallbackInMs: e.fallbackInMs ?? 15_000,
//         queuedAt: performance.now(),
//       });
//     };
//     const onMatch = (m: GameMatch) => {
//       setMatch(m);
//       setPhase('playing');
//       setSecondsLeft(m.timeLimit);
//       setQueueInfo(null);
//       playNotificationSound();
//     };
//     const onMsg = (m: GameMessage) => {
//       pushMessage(m);
//     };
//     const onTimer = (e: { secondsLeft: number }) => setSecondsLeft(e.secondsLeft);
//     const onVotePhase = () => setPhase('voting');
//     const onResult = (r: GameResult) => {
//       setResult(r);
//       setPhase('finished');
//       playNotificationSound();
//     };
//     const onMetadata = (e: { kind: string } & Record<string, unknown>) => {
//       setMetadata(e);
//     };
//     const onCancelled = () => {
//       setPhase('idle');
//       setQueueInfo(null);
//     };
//     const onError = (e: { error: string }) => {
//       console.error('[game] error:', e?.error);
//       setPhase('idle');
//       setQueueInfo(null);
//     };
//     const onOpponentLeft = () => {
//       setPhase('finished');
//     };

//     socket.on('game:queued', onQueued);
//     socket.on('game:match-found', onMatch);
//     socket.on('game:message', onMsg);
//     socket.on('game:timer', onTimer);
//     socket.on('game:vote-phase', onVotePhase);
//     socket.on('game:result', onResult);
//     socket.on('game:metadata', onMetadata);
//     socket.on('game:cancelled', onCancelled);
//     socket.on('game:error', onError);
//     socket.on('game:opponent-left', onOpponentLeft);

//     return () => {
//       socket.off('game:queued', onQueued);
//       socket.off('game:match-found', onMatch);
//       socket.off('game:message', onMsg);
//       socket.off('game:timer', onTimer);
//       socket.off('game:vote-phase', onVotePhase);
//       socket.off('game:result', onResult);
//       socket.off('game:metadata', onMetadata);
//       socket.off('game:cancelled', onCancelled);
//       socket.off('game:error', onError);
//       socket.off('game:opponent-left', onOpponentLeft);
//     };
//   }, [me, setPhase, setMatch, pushMessage, setSecondsLeft, setResult, setMetadata, setQueueInfo]);

//   const findMatch = (gameType: GameType) => {
//     const socket = getGameSocket();
//     if (!socket.connected) socket.connect();
//     setPhase('searching');
//     socket.emit('game:find-match', { gameType });
//   };

//   const cancelMatch = (gameType: GameType) => {
//     getGameSocket().emit('game:cancel-match', { gameType });
//     setPhase('idle');
//     setQueueInfo(null);
//   };

//   const sendGameMessage = (roomKey: string, content: string) => {
//     getGameSocket().emit('game:message', { roomKey, content });
//   };

//   const submitVote = (roomKey: string, vote: 'human' | 'ai') => {
//     getGameSocket().emit('game:vote', { roomKey, vote });
//   };

//   const submitWord = (roomKey: string, word: string) => {
//     getGameSocket().emit('game:word-submit', { roomKey, word });
//   };

//   return { findMatch, cancelMatch, sendGameMessage, submitVote, submitWord };
// }















































































'use client';

/**
 * useGame hook — UPDATED for new Imposter game (Proposal A)
 * ─────────────────────────────────────────────────────────────────
 *
 * CHANGES vs previous version:
 *
 *   submitVote() previously accepted only 'human' | 'ai' (used by Turing
 *   and Interrogation). New Imposter game uses 'p1' | 'p2' votes.
 *
 *   We extend the type to 'human' | 'ai' | 'p1' | 'p2'. The backend
 *   dispatcher routes based on gameType:
 *     - turing/interrogation → expects 'human' | 'ai'
 *     - imposter (new)        → expects 'p1' | 'p2'
 *
 *   This keeps a single submitVote API on the frontend.
 */

import { useEffect } from 'react';
import { getGameSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { playNotificationSound } from '@/lib/notification';
import type { GameMatch, GameMessage, GameResult, GameType } from '@/types/game.types';

/** Vote types supported across all games */
export type VoteTarget = 'human' | 'ai' | 'p1' | 'p2';

export function useGameSocket() {
  const setPhase = useGameStore((s) => s.setPhase);
  const setMatch = useGameStore((s) => s.setMatch);
  const pushMessage = useGameStore((s) => s.pushMessage);
  const setSecondsLeft = useGameStore((s) => s.setSecondsLeft);
  const setResult = useGameStore((s) => s.setResult);
  const setMetadata = useGameStore((s) => s.setMetadata);
  const setQueueInfo = useGameStore((s) => s.setQueueInfo);
  const me = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!me) return;
    const socket = getGameSocket();
    if (!socket.connected) socket.connect();

    const onQueued = (e: { gameType: GameType; fallbackInMs?: number }) => {
      setPhase('searching');
      setQueueInfo({
        gameType: e.gameType,
        fallbackInMs: e.fallbackInMs ?? 15_000,
        queuedAt: performance.now(),
      });
    };
    const onMatch = (m: GameMatch) => {
      setMatch(m);
      setPhase('playing');
      setSecondsLeft(m.timeLimit);
      setQueueInfo(null);
      playNotificationSound();
    };
    const onMsg = (m: GameMessage) => {
      pushMessage(m);
    };
    const onTimer = (e: { secondsLeft: number }) => setSecondsLeft(e.secondsLeft);
    const onVotePhase = () => setPhase('voting');
    const onResult = (r: GameResult) => {
      setResult(r);
      setPhase('finished');
      playNotificationSound();
    };
    const onMetadata = (e: { kind: string } & Record<string, unknown>) => {
      setMetadata(e);
    };
    const onCancelled = () => {
      setPhase('idle');
      setQueueInfo(null);
    };
    const onError = (e: { error: string }) => {
      console.error('[game] error:', e?.error);
      setPhase('idle');
      setQueueInfo(null);
    };
    const onOpponentLeft = () => {
      setPhase('finished');
    };

    socket.on('game:queued', onQueued);
    socket.on('game:match-found', onMatch);
    socket.on('game:message', onMsg);
    socket.on('game:timer', onTimer);
    socket.on('game:vote-phase', onVotePhase);
    socket.on('game:result', onResult);
    socket.on('game:metadata', onMetadata);
    socket.on('game:cancelled', onCancelled);
    socket.on('game:error', onError);
    socket.on('game:opponent-left', onOpponentLeft);

    return () => {
      socket.off('game:queued', onQueued);
      socket.off('game:match-found', onMatch);
      socket.off('game:message', onMsg);
      socket.off('game:timer', onTimer);
      socket.off('game:vote-phase', onVotePhase);
      socket.off('game:result', onResult);
      socket.off('game:metadata', onMetadata);
      socket.off('game:cancelled', onCancelled);
      socket.off('game:error', onError);
      socket.off('game:opponent-left', onOpponentLeft);
    };
  }, [me, setPhase, setMatch, pushMessage, setSecondsLeft, setResult, setMetadata, setQueueInfo]);

  const findMatch = (gameType: GameType) => {
    const socket = getGameSocket();
    if (!socket.connected) socket.connect();
    setPhase('searching');
    socket.emit('game:find-match', { gameType });
  };

  const cancelMatch = (gameType: GameType) => {
    getGameSocket().emit('game:cancel-match', { gameType });
    setPhase('idle');
    setQueueInfo(null);
  };

  const sendGameMessage = (roomKey: string, content: string) => {
    getGameSocket().emit('game:message', { roomKey, content });
  };

  /**
   * Submit vote. Accepts 4 possible vote types:
   *   - 'human' | 'ai' for Turing & Interrogation
   *   - 'p1' | 'p2' for Imposter (new)
   */
  const submitVote = (roomKey: string, vote: VoteTarget) => {
    getGameSocket().emit('game:vote', { roomKey, vote });
  };

  const submitWord = (roomKey: string, word: string) => {
    getGameSocket().emit('game:word-submit', { roomKey, word });
  };

  return { findMatch, cancelMatch, sendGameMessage, submitVote, submitWord };
}