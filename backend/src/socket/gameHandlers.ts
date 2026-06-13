/**
 * GAME HANDLERS DISPATCHER (FINAL — Batch 4 rewire)
 * ─────────────────────────────────────────────────────────────────
 * This is the central socket event dispatcher. After Batch 4, it:
 *
 *   1. Imports per-game handlers from socket/games/*.ts
 *   2. Uses the atomic matchOrEnqueue from matchmaking.ts
 *   3. Uses shared activeGames/pendingAIMatches from gameUtils.ts
 *   4. Routes events to the correct game-specific handler by gameType
 *   5. Wires handleSocketDisconnect for proper forfeit on disconnect
 *
 * BEFORE this batch: gameHandlers.ts had 800+ lines with all per-game logic
 *                    inline (turing, word-forge, debate, imposter, interrogation).
 *                    Maintainability was poor.
 *
 * AFTER: ~200 lines of pure dispatch. Each game's logic lives in its own module.
 *
 * IMPORTANT: This file REPLACES the previous gameHandlers.ts entirely.
 *            All old per-game functions (handleTuringMessage inline,
 *            startTuringHumanVsHumanGame inline, etc.) are GONE — they
 *            now live in their respective socket/games/*.ts modules.
 */

import type { Namespace, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { User } from '../models/User.model';
import { redis } from '../config/redis';
import {
  matchOrEnqueue,
  dequeue,
  type HumanMatch,
} from '../services/matchmaking';
import {
  activeGames,
  pendingAIMatches,
  pendingKey,
  handleSocketDisconnect,
  type ActiveGame,
} from '../services/gameUtils';

/* ─────────────────────────── Game-specific imports ─────────────────────────── */

import {
  startTuringHumanVsHumanGame,
  startTuringAIGame,
  handleTuringMessage,
  handleTuringVote,
} from './games/turing';

import {
  startWordForgeHumanVsHumanGame,
  startWordForgeAIGame,
  handleWordForgeMove,
} from './games/wordforge';

import {
  startDebateHumanVsHumanGame,
  startDebateAIGame,
  handleDebateMessage,
} from './games/debate';

import {
  startImposterHumanVsHumanGame,
  startImposterAIGame,
  handleImposterMessage,
  handleImposterVote,
} from './games/imposter';

import {
  startInterrogationHumanVsHumanGame,
  startInterrogationAIGame,
  handleInterrogationMessage,
  handleInterrogationVote,
} from './games/interrogation';

/* ─────────────────────────── Constants ─────────────────────────── */

const VALID_GAME_TYPES = [
  'turing',
  'word-forge',
  'imposter',
  'debate',
  'interrogation',
] as const;

type GameType = typeof VALID_GAME_TYPES[number];

const AI_FALLBACK_DELAY_MS = 15_000;

interface PlayerInfo {
  userId: string;
  socketId: string;
  displayName: string;
  avatarSeed: string;
}

/* ─────────────────────────── Player info builder ─────────────────────────── */

/**
 * Resolve a socket's player info from auth + DB.
 * Used when starting a game (need displayName, avatarSeed for "youAre" payload).
 */
async function buildPlayerInfo(socket: Socket): Promise<PlayerInfo | null> {
  const userId = socket.data?.userId as string | undefined;
  if (!userId) return null;

  // Try to use cached socket.data first
  const cachedDisplayName = socket.data?.displayName as string | undefined;
  const cachedAvatarSeed = socket.data?.avatarSeed as string | undefined;

  if (cachedDisplayName && cachedAvatarSeed) {
    return {
      userId,
      socketId: socket.id,
      displayName: cachedDisplayName,
      avatarSeed: cachedAvatarSeed,
    };
  }

  // Fall back to DB lookup
  try {
    const user = await User.findById(userId)
      .select('displayName avatarSeed')
      .lean();
    if (!user) return null;
    return {
      userId,
      socketId: socket.id,
      displayName: user.displayName,
      avatarSeed: user.avatarSeed,
    };
  } catch (err) {
    logger.error({ err, userId }, 'buildPlayerInfo: DB lookup failed');
    return null;
  }
}

async function buildPlayerInfoFromIds(
  userId: string,
  socketId: string
): Promise<PlayerInfo | null> {
  try {
    const user = await User.findById(userId)
      .select('displayName avatarSeed')
      .lean();
    if (!user) return null;
    return {
      userId,
      socketId,
      displayName: user.displayName,
      avatarSeed: user.avatarSeed,
    };
  } catch (err) {
    logger.error({ err, userId }, 'buildPlayerInfoFromIds failed');
    return null;
  }
}

/* ─────────────────────────── Game start dispatch ─────────────────────────── */

/**
 * Route to the correct game-specific human-vs-human starter.
 */
async function dispatchHumanVsHumanStart(
  nsp: Namespace,
  gameType: GameType,
  p1: PlayerInfo,
  p2: PlayerInfo
): Promise<void> {
  switch (gameType) {
    case 'turing':
      await startTuringHumanVsHumanGame(nsp, p1, p2);
      break;
    case 'word-forge':
      await startWordForgeHumanVsHumanGame(nsp, p1, p2);
      break;
    case 'debate':
      await startDebateHumanVsHumanGame(nsp, p1, p2);
      break;
    case 'imposter':
      await startImposterHumanVsHumanGame(nsp, p1, p2);
      break;
    case 'interrogation':
      await startInterrogationHumanVsHumanGame(nsp, p1, p2);
      break;
  }
}

async function dispatchAIStart(
  nsp: Namespace,
  gameType: GameType,
  p1: PlayerInfo
): Promise<void> {
  switch (gameType) {
    case 'turing':
      await startTuringAIGame(nsp, p1);
      break;
    case 'word-forge':
      await startWordForgeAIGame(nsp, p1);
      break;
    case 'debate':
      await startDebateAIGame(nsp, p1);
      break;
    case 'imposter':
      await startImposterAIGame(nsp, p1);
      break;
    case 'interrogation':
      await startInterrogationAIGame(nsp, p1);
      break;
  }
}

/* ─────────────────────────── Message dispatch ─────────────────────────── */

/**
 * Route an incoming game:message to the correct game-specific handler.
 * Each game uses messages differently (chat for turing, words for word-forge,
 * args for debate, clues for imposter, Q/A for interrogation).
 */
async function dispatchMessage(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  content: string
): Promise<void> {
  switch (game.gameType) {
    case 'turing':
      await handleTuringMessage(nsp, game, fromUserId, content);
      break;
    case 'word-forge':
      // word-forge uses game:word-submit, not game:message — handled separately
      break;
    case 'debate':
      await handleDebateMessage(nsp, game, fromUserId, content);
      break;
    case 'imposter':
      await handleImposterMessage(nsp, game, fromUserId, content);
      break;
    case 'interrogation':
      await handleInterrogationMessage(nsp, game, fromUserId, content);
      break;
  }
}

/**
 * Route a vote to the correct game-specific handler.
 *
 * Vote payload type varies by game:
 *   - turing, interrogation: 'human' | 'ai'
 *   - imposter (new):        'p1' | 'p2'
 *
 * Frontend sends untyped string; we validate and dispatch.
 */
async function dispatchVote(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  vote: unknown
): Promise<void> {
  if (typeof vote !== 'string') return;

  switch (game.gameType) {
    case 'turing': {
      if (vote !== 'human' && vote !== 'ai') return;
      await handleTuringVote(nsp, game, fromUserId, vote);
      break;
    }
    case 'interrogation': {
      if (vote !== 'human' && vote !== 'ai') return;
      await handleInterrogationVote(nsp, game, fromUserId, vote);
      break;
    }
    case 'imposter': {
      if (vote !== 'p1' && vote !== 'p2') return;
      await handleImposterVote(nsp, game, fromUserId, vote);
      break;
    }
    // word-forge and debate don't have votes — silently ignore
  }
}

/* ─────────────────────────── Main socket handler ─────────────────────────── */

/**
 * Attach all game-related socket event listeners to a connected socket.
 * Called once per socket connection from the main socket setup.
 */
export function registerGameHandlers(nsp: Namespace, socket: Socket): void {
  /* ─────────────── game:find-match ─────────────── */
  socket.on('game:find-match', async ({ gameType }: { gameType?: string }) => {
    if (!gameType || !VALID_GAME_TYPES.includes(gameType as GameType)) {
      socket.emit('game:error', { error: 'Unknown game type' });
      return;
    }

    const me = await buildPlayerInfo(socket);
    if (!me) {
      socket.emit('game:error', { error: 'Not authenticated' });
      return;
    }

    /**
     * 🔴 Use atomic matchOrEnqueue (Batch 1 fix).
     * Returns either a HumanMatch (paired) or null (enqueued + AI fallback).
     */
    let match: HumanMatch | null;
    try {
      match = await matchOrEnqueue(me.userId, me.socketId, gameType);
    } catch (err) {
      logger.error({ err, gameType, userId: me.userId }, 'matchOrEnqueue failed');
      socket.emit('game:error', { error: 'Matchmaking unavailable' });
      return;
    }

    if (match) {
      // Found a live opponent — cancel their pending AI fallback (they're matched now)
      const oppPendingTimer = pendingAIMatches.get(
        pendingKey(match.opponentUserId, gameType)
      );
      if (oppPendingTimer) {
        clearTimeout(oppPendingTimer);
        pendingAIMatches.delete(pendingKey(match.opponentUserId, gameType));
      }

      const opp = await buildPlayerInfoFromIds(
        match.opponentUserId,
        match.opponentSocketId
      );
      if (!opp) {
        socket.emit('game:error', { error: 'Opponent disappeared' });
        return;
      }

      await dispatchHumanVsHumanStart(
        nsp,
        gameType as GameType,
        opp, // opponent was first in queue → they're p1
        me   // we're p2
      );
      return;
    }

    // No human available — enqueued. Tell client + start AI fallback timer.
    socket.emit('game:queued', {
      gameType,
      fallbackInMs: AI_FALLBACK_DELAY_MS,
    });

    const t = setTimeout(async () => {
      pendingAIMatches.delete(pendingKey(me.userId, gameType));

      // Re-verify we're still queued (might have been matched in interim)
      const stillQueued = await dequeue(me.userId, gameType);
      if (!stillQueued) return;

      // Re-verify socket still alive
      const liveSocket = nsp.sockets.get(socket.id);
      if (!liveSocket) return;

      // Start AI game
      const refreshedMe = await buildPlayerInfo(liveSocket);
      if (!refreshedMe) return;
      await dispatchAIStart(nsp, gameType as GameType, refreshedMe);
    }, AI_FALLBACK_DELAY_MS);

    pendingAIMatches.set(pendingKey(me.userId, gameType), t);
  });

  /* ─────────────── game:cancel-match ─────────────── */
  socket.on(
    'game:cancel-match',
    async ({ gameType }: { gameType?: string }) => {
      if (!gameType || !VALID_GAME_TYPES.includes(gameType as GameType)) return;
      const userId = socket.data?.userId as string | undefined;
      if (!userId) return;

      // Cancel pending AI timer if any
      const pending = pendingAIMatches.get(pendingKey(userId, gameType));
      if (pending) {
        clearTimeout(pending);
        pendingAIMatches.delete(pendingKey(userId, gameType));
      }

      // Remove from queue
      await dequeue(userId, gameType).catch(() => undefined);

      socket.emit('game:cancelled', { gameType });
    }
  );

  /* ─────────────── game:message ─────────────── */
  socket.on(
    'game:message',
    async ({ roomKey, content }: { roomKey?: string; content?: string }) => {
      if (!roomKey || typeof content !== 'string') return;
      const userId = socket.data?.userId as string | undefined;
      if (!userId) return;

      const game = activeGames.get(roomKey);
      if (!game) return;

      // Cap content length defensively (each game has its own slice too)
      const text = content.slice(0, 600);
      await dispatchMessage(nsp, game, userId, text);
    }
  );

  /* ─────────────── game:word-submit (word-forge only) ─────────────── */
  socket.on(
    'game:word-submit',
    async ({ roomKey, word }: { roomKey?: string; word?: string }) => {
      if (!roomKey || typeof word !== 'string') return;
      const userId = socket.data?.userId as string | undefined;
      if (!userId) return;

      const game = activeGames.get(roomKey);
      if (!game || game.gameType !== 'word-forge') return;

      await handleWordForgeMove(nsp, game, userId, word);
    }
  );

  /* ─────────────── game:vote ─────────────── */
  socket.on(
    'game:vote',
    async ({ roomKey, vote }: { roomKey?: string; vote?: unknown }) => {
      if (!roomKey) return;
      const userId = socket.data?.userId as string | undefined;
      if (!userId) return;

      const game = activeGames.get(roomKey);
      if (!game) return;

      await dispatchVote(nsp, game, userId, vote);
    }
  );

  /* ─────────────── disconnect ─────────────── */
  socket.on('disconnect', async () => {
    const userId = socket.data?.userId as string | undefined;
    logger.info({ socketId: socket.id, userId }, 'game socket disconnected');

    /**
     * 🔴 Cleanup on disconnect:
     *   1. Remove from all matchmaking queues
     *   2. Cancel pending AI fallback timers
     *   3. Forfeit any active games (NEW — uses gameUtils.handleSocketDisconnect)
     */
    if (userId) {
      // 1. Queue cleanup
      for (const gt of VALID_GAME_TYPES) {
        await dequeue(userId, gt).catch(() => undefined);
        const pending = pendingAIMatches.get(pendingKey(userId, gt));
        if (pending) {
          clearTimeout(pending);
          pendingAIMatches.delete(pendingKey(userId, gt));
        }
      }

      // 2. Clean up socket-id key in Redis
      await redis.del(`mm:socket:${userId}`).catch(() => undefined);
    }

    // 3. Forfeit active games (centralized in gameUtils)
    await handleSocketDisconnect(nsp, socket.id).catch((err) => {
      logger.error({ err }, 'handleSocketDisconnect failed');
    });
  });
}