/**
 * SHARED GAME UTILITIES
 * ─────────────────────────────────────────────────────────────────
 * Common helpers used across all game types. Extracted from gameHandlers.ts
 * to keep that file focused on per-game logic.
 *
 * What lives here:
 *   - ActiveGame in-memory map type
 *   - Slot/socket helpers (partyOf, socketIdOf, emitToSlot, emitToRoom)
 *   - Timer cleanup
 *   - Garbage collection (delayed game removal)
 *   - Concurrency lock helper (NEW — fixes Debate race condition)
 *   - Forfeit logic (NEW — proper disconnect handling for all games)
 */

import type { Namespace } from 'socket.io';
import type { IGameSession, GameType } from '../models/GameSession.model';
import type { BotPersona } from './groqService';
import { applyGameScore } from './scoring';
import { getRank } from './leaderboard';
import { logger } from '../utils/logger';

/* ─────────────────────────── Types ─────────────────────────── */

export interface ActiveGame {
  session: IGameSession;
  gameType: GameType;
  roomKey: string;
  player1SocketId: string;
  player2SocketId: string | null;
  isPlayer2AI: boolean;
  aiPersona: BotPersona | null;
  startedAt: number;
  finished: boolean;
  timers: NodeJS.Timeout[];
  state: Record<string, unknown>;

  /**
   * NEW: Concurrency lock flag.
   * Prevents two parallel async handlers from corrupting state when both
   * mutate game.state simultaneously (e.g. Debate's "P1 sends + timer fires"
   * race). Set true at the start of any async state-mutating handler, set
   * false at the end. Other handlers should bail if it's already true.
   */
  advancing: boolean;
}

/* ─────────────────────────── Maps (in-memory) ─────────────────────────── */

/**
 * Active games keyed by roomKey.
 *
 * KNOWN LIMITATION: This is per-server in-memory state. Multi-server scaling
 * requires moving this to Redis. See `3-DataFlow-Redis-Games.md` Issue #1.
 * For now: deploy as single instance, or use sticky sessions in load balancer.
 */
export const activeGames = new Map<string, ActiveGame>();

/**
 * Pending AI fallback timers per (userId, gameType).
 * Used to cancel an AI fallback if the user gets matched with a real human first.
 */
export const pendingAIMatches = new Map<string, NodeJS.Timeout>();

export const pendingKey = (userId: string, gameType: string) =>
  `${gameType}:${userId}`;

/* ─────────────────────────── Slot helpers ─────────────────────────── */

/**
 * Identify which slot a user occupies in a game.
 * Returns null if the user isn't a participant.
 */
export function partyOf(game: ActiveGame, userId: string): 'p1' | 'p2' | null {
  if (String(game.session.player1Id) === userId) return 'p1';
  if (
    game.session.player2Id &&
    String(game.session.player2Id) === userId
  )
    return 'p2';
  return null;
}

/**
 * Get the socket ID for a slot. Returns null if AI (no socket).
 */
export function socketIdOf(
  game: ActiveGame,
  slot: 'p1' | 'p2'
): string | null {
  return slot === 'p1' ? game.player1SocketId : game.player2SocketId;
}

/**
 * Emit an event to a single slot's socket only.
 * Use for personalized data (different perspective per player).
 */
export function emitToSlot(
  nsp: Namespace,
  game: ActiveGame,
  slot: 'p1' | 'p2',
  event: string,
  payload: unknown
): void {
  const sid = socketIdOf(game, slot);
  if (sid) nsp.to(sid).emit(event, payload);
}

/**
 * Emit to all sockets in the game room.
 * Use for shared data that both players need identically.
 */
export function emitToRoom(
  nsp: Namespace,
  game: ActiveGame,
  event: string,
  payload: unknown
): void {
  nsp.to(game.roomKey).emit(event, payload);
}

/* ─────────────────────────── Timer cleanup ─────────────────────────── */

/**
 * Clear all pending timers (intervals + timeouts) attached to this game.
 * Critical: every setTimeout/setInterval related to a game MUST be pushed
 * to game.timers, otherwise it can fire after the game ends and corrupt state.
 */
export function clearAllTimers(game: ActiveGame): void {
  for (const t of game.timers) {
    clearTimeout(t);
    clearInterval(t);
  }
  game.timers = [];
}

/* ─────────────────────────── Garbage collection ─────────────────────────── */

/**
 * Schedule removal of a finished game from the activeGames map.
 *
 * Why delayed? Clients may briefly reference roomKey after seeing the result
 * (e.g. last late event). Keeping the game in the map for a few seconds avoids
 * "Game not found" errors during the client's natural transition.
 */
export function gcGame(roomKey: string, delayMs = 30_000): void {
  setTimeout(() => activeGames.delete(roomKey), delayMs);
}

/* ─────────────────────────── Concurrency lock ─────────────────────────── */

/**
 * Wrap an async state-mutating function in a per-game lock.
 *
 * USE CASE: Debate's advanceDebate() can be called by both:
 *   1. Player message handler
 *   2. Timer expiration ("auto-skip")
 *
 * If both fire within milliseconds, two advanceDebate calls run concurrently.
 * The first one's `state.round++` is followed by the second one's `state.round++`,
 * skipping a round and corrupting turn order.
 *
 * Solution: anything that mutates game.state should run under this lock.
 * Late-arriving callers will silently bail (acceptable — their action is stale).
 *
 * @param game - the active game
 * @param fn - the async work to do under the lock
 * @returns true if work ran, false if locked (caller's action was rejected)
 */
export async function withGameLock<T>(
  game: ActiveGame,
  fn: () => Promise<T>
): Promise<{ ran: boolean; result?: T }> {
  if (game.advancing) {
    return { ran: false };
  }
  game.advancing = true;
  try {
    const result = await fn();
    return { ran: true, result };
  } finally {
    game.advancing = false;
  }
}

/* ─────────────────────────── Forfeit logic (NEW) ─────────────────────────── */

/**
 * Forfeit a game when one player disconnects.
 *
 * Previous behavior: server emitted 'game:opponent-left' but didn't actually
 * end the game. Mongo session stayed 'active' forever, surviving player saw
 * empty result screen, activeGames Map leaked entries.
 *
 * New behavior: properly finalize the game with the surviving player as winner.
 *   - Set game.finished = true
 *   - Mark Mongo session as 'finished'
 *   - Award participation points (5) to surviving player
 *   - Emit 'game:result' so they see a proper end screen
 *   - Schedule gcGame
 *
 * @param nsp - socket namespace
 * @param game - the game in progress
 * @param survivorSlot - which slot is still connected
 */
export async function forfeitGame(
  nsp: Namespace,
  game: ActiveGame,
  survivorSlot: 'p1' | 'p2'
): Promise<void> {
  if (game.finished) return; // idempotent

  game.finished = true;
  clearAllTimers(game);

  game.session.status = 'finished';
  game.session.finishedAt = new Date();
  game.session.duration = Math.round((Date.now() - game.startedAt) / 1000);

  // Award participation points to the survivor only
  const survivorUserId =
    survivorSlot === 'p1'
      ? String(game.session.player1Id)
      : game.session.player2Id
      ? String(game.session.player2Id)
      : null;

  let newScore = 0;
  if (survivorUserId) {
    try {
      const result = await applyGameScore(
        survivorUserId,
        game.gameType,
        5 // flat forfeit win
      );
      if (survivorSlot === 'p1') game.session.player1Score = 5;
      else game.session.player2Score = 5;
      newScore = result.newScore;
    } catch (err) {
      logger.error({ err }, 'forfeitGame: applyGameScore failed');
    }
  }

  try {
    await game.session.save();
  } catch (err) {
    logger.error({ err }, 'forfeitGame: session save failed');
  }

  // Notify the survivor that they won by forfeit
  if (survivorUserId) {
    let rank: number | null = null;
    try {
      rank = await getRank(survivorUserId, 'overall');
    } catch (err) {
      logger.error({ err }, 'forfeitGame: getRank failed');
    }

    emitToSlot(nsp, game, survivorSlot, 'game:result', {
      opponentType: game.isPlayer2AI ? 'ai' : 'human',
      yourVote: null,
      correct: true, // they "win" by default
      points: 5,
      newScore,
      streak: 0,
      rank,
      summary: 'Opponent disconnected — you win by forfeit.',
      forfeit: true, // new flag so frontend can show special UI if desired
    });
  }

  gcGame(game.roomKey);
}

/* ─────────────────────────── AI turn detection ─────────────────────────── */

/**
 * Helper used by turn-based games (word-forge, debate, imposter) to check
 * if it's the AI's move.
 *
 * Currently: AI is always p2 by matchmaking convention. If a future feature
 * pairs AI as p1, only the inner check needs to expand.
 */
export function currentTurnIsAI(game: ActiveGame): boolean {
  if (!game.isPlayer2AI) return false;
  const s = game.state as { currentTurn?: 'p1' | 'p2'; turn?: 'p1' | 'p2' };
  const ct = s.currentTurn ?? s.turn;
  return ct === 'p2';
}

/* ─────────────────────────── Cleanup helper ─────────────────────────── */

/**
 * Run forfeit + queue cleanup for a disconnecting socket.
 * Centralized so each game's disconnect handler doesn't repeat this.
 *
 * Called from gameHandlers.ts top-level disconnect listener.
 */
export async function handleSocketDisconnect(
  nsp: Namespace,
  socketId: string
): Promise<void> {
  for (const game of activeGames.values()) {
    if (game.finished) continue;

    if (game.player1SocketId === socketId) {
      // p1 left, p2 is survivor (if human)
      if (game.player2SocketId) {
        await forfeitGame(nsp, game, 'p2');
      } else {
        // p2 was AI — just end the game silently, no one to notify
        game.finished = true;
        clearAllTimers(game);
        game.session.status = 'finished';
        game.session.finishedAt = new Date();
        await game.session.save().catch(() => undefined);
        gcGame(game.roomKey);
      }
    } else if (game.player2SocketId === socketId) {
      // p2 left, p1 is survivor
      await forfeitGame(nsp, game, 'p1');
    }
  }
}