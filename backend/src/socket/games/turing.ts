/**
 * TURING GAME HANDLERS
 * ─────────────────────────────────────────────────────────────────
 * Extracted from gameHandlers.ts for maintainability (Phase 3 split).
 *
 * BUG FIXES IN THIS VERSION:
 *
 * 🔴 Fix #1: Opponent name leak in AI games
 *   BEFORE: AI game emitted opponent: { name: persona.handle, avatarSeed: persona.handle }
 *           Human game emitted opponent: { name: 'Stranger', avatarSeed: 'stranger-xxx' }
 *           => Player could trivially detect AI by checking if opponent has a username.
 *   AFTER:  Both modes emit opponent as 'Stranger' with random avatar seed.
 *           Persona is kept internally for AI behavior, never leaked to client.
 *
 * 🟡 Fix #2: Vote phase has no visible countdown
 *   BEFORE: Server had 30s auto-finalize timer but no game:timer events during voting.
 *           User didn't know how long they had.
 *   AFTER:  Vote phase has its own 30s countdown emitted via game:timer.
 *
 * 🟢 Fix #3: AI reply silent failure
 *   BEFORE: If Groq fails, player waits forever for AI response.
 *   AFTER:  Fallback message sent ("one sec my wifi is being weird") so game progresses.
 */

import type { Namespace, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { GameSession, type IGameSession, type GameType } from '../../models/GameSession.model';
import {
  deceptiveHumanReply,
  pickBotPersona,
  type ChatTurn,
  type BotPersona,
} from '../../services/groqService';
import {
  activeGames,
  clearAllTimers,
  emitToRoom,
  emitToSlot,
  gcGame,
  partyOf,
  type ActiveGame,
} from '../../services/gameUtils';
import { newRoomKey } from '../../services/matchmaking';
import { applyTuringScore } from '../../services/scoring';
import { getRank } from '../../services/leaderboard';
import { logger } from '../../utils/logger';

const TURING_DURATION = 60;          // chat phase seconds
const TURING_VOTE_DURATION = 30;     // vote phase seconds (NEW: emitted to client)

interface PlayerInfo {
  userId: string;
  socketId: string;
  displayName: string;
  avatarSeed: string;
}

/* ─────────────────────────── Anonymous opponent generator ─────────────────────────── */

/**
 * Generate the anonymous "opponent" object shown to a player.
 *
 * BOTH modes (AI and human-vs-human) use 'Stranger' as the displayed name
 * with a random avatar seed. This is critical: a player must NOT be able
 * to tell from metadata alone whether their opponent is human or AI.
 *
 * @returns { name, avatarSeed } - safe to send to client
 */
function makeStrangerOpponent(): { name: string; avatarSeed: string } {
  return {
    name: 'Stranger',
    avatarSeed: 'stranger-' + Math.random().toString(36).slice(2, 10),
  };
}

/* ─────────────────────────── Game start ─────────────────────────── */

/**
 * Start a human-vs-human Turing game.
 * Both players see each other as 'Stranger' (no name leak).
 */
export async function startTuringHumanVsHumanGame(
  nsp: Namespace,
  p1: PlayerInfo,
  p2: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('turing', 'h');

  const session = await GameSession.create({
    gameType: 'turing',
    roomKey,
    player1Id: p1.userId,
    player2Id: p2.userId,
    isPlayer2AI: false,
    status: 'active',
  });

  const game: ActiveGame = {
    session,
    gameType: 'turing',
    roomKey,
    player1SocketId: p1.socketId,
    player2SocketId: p2.socketId,
    isPlayer2AI: false,
    aiPersona: null,
    startedAt: Date.now(),
    finished: false,
    timers: [],
    state: { votes: { p1: null, p2: null }, aiHistory: [] },
    advancing: false,
  };
  activeGames.set(roomKey, game);

  // Both sockets join the room (defensive — verify socket still exists)
  const p1Socket = nsp.sockets.get(p1.socketId);
  const p2Socket = nsp.sockets.get(p2.socketId);
  if (!p1Socket || !p2Socket) {
    // Rare but possible: one disconnected between match-found and join
    logger.warn({ roomKey }, 'Turing game start: socket gone, aborting');
    activeGames.delete(roomKey);
    session.status = 'finished';
    await session.save().catch(() => undefined);
    return;
  }
  p1Socket.join(roomKey);
  p2Socket.join(roomKey);

  // Each side gets their own opponent placeholder (independent random seed)
  emitToSlot(nsp, game, 'p1', 'game:match-found', {
    roomKey,
    gameType: 'turing',
    timeLimit: TURING_DURATION,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });
  emitToSlot(nsp, game, 'p2', 'game:match-found', {
    roomKey,
    gameType: 'turing',
    timeLimit: TURING_DURATION,
    youAreSlot: 'p2',
    opponent: makeStrangerOpponent(),
    youAre: { name: p2.displayName, avatarSeed: p2.avatarSeed },
  });

  startTuringChatTimer(nsp, game);
}

/**
 * Start a Turing game vs AI.
 * 🔴 FIX #1: Opponent shown as 'Stranger' to player, NOT as persona.handle.
 *   Persona is kept internally on `game.aiPersona` for the AI's behavior,
 *   but the player sees a generic 'Stranger' (same as human-vs-human).
 */
export async function startTuringAIGame(
  nsp: Namespace,
  p1: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('turing', 'ai');
  const persona = pickBotPersona();

  const session = await GameSession.create({
    gameType: 'turing',
    roomKey,
    player1Id: p1.userId,
    player2Id: null,
    isPlayer2AI: true,
    status: 'active',
  });

  const game: ActiveGame = {
    session,
    gameType: 'turing',
    roomKey,
    player1SocketId: p1.socketId,
    player2SocketId: null,
    isPlayer2AI: true,
    aiPersona: persona,
    startedAt: Date.now(),
    finished: false,
    timers: [],
    state: { votes: { p1: null, p2: null }, aiHistory: [] },
    advancing: false,
  };
  activeGames.set(roomKey, game);

  const p1Socket = nsp.sockets.get(p1.socketId);
  if (!p1Socket) {
    activeGames.delete(roomKey);
    session.status = 'finished';
    await session.save().catch(() => undefined);
    return;
  }
  p1Socket.join(roomKey);

  emitToSlot(nsp, game, 'p1', 'game:match-found', {
    roomKey,
    gameType: 'turing',
    timeLimit: TURING_DURATION,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),  // 🔴 Was: persona.handle. Now: 'Stranger'.
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });

  startTuringChatTimer(nsp, game);
}

/* ─────────────────────────── Chat phase timer ─────────────────────────── */

/**
 * 60-second chat phase timer. Emits game:timer every second.
 * On expiry, transitions to vote phase.
 */
function startTuringChatTimer(nsp: Namespace, game: ActiveGame): void {
  let secondsLeft = TURING_DURATION;

  const interval = setInterval(() => {
    if (game.finished) {
      clearInterval(interval);
      return;
    }
    secondsLeft -= 1;
    emitToRoom(nsp, game, 'game:timer', { secondsLeft, phase: 'chat' });

    if (secondsLeft <= 0) {
      clearInterval(interval);
      game.session.status = 'voting';
      void game.session.save();
      emitToRoom(nsp, game, 'game:vote-phase', {});
      // 🟡 FIX #2: Start visible vote phase countdown
      startTuringVoteTimer(nsp, game);
    }
  }, 1000);
  game.timers.push(interval);
}

/**
 * 🟡 FIX #2: Vote phase countdown.
 * Previous code only had setTimeout(30s, finishTuringGame) — no visible
 * countdown. Now emits game:timer so frontend can show "Vote in: 23s".
 */
function startTuringVoteTimer(nsp: Namespace, game: ActiveGame): void {
  let secondsLeft = TURING_VOTE_DURATION;

  const interval = setInterval(() => {
    if (game.finished) {
      clearInterval(interval);
      return;
    }
    secondsLeft -= 1;
    emitToRoom(nsp, game, 'game:timer', { secondsLeft, phase: 'vote' });

    if (secondsLeft <= 0) {
      clearInterval(interval);
      void finishTuringGame(nsp, game);
    }
  }, 1000);
  game.timers.push(interval);
}

/* ─────────────────────────── Message handler ─────────────────────────── */

export async function handleTuringMessage(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  text: string
): Promise<void> {
  // Only accept messages during active chat phase
  if (game.session.status !== 'active') return;

  const slot = partyOf(game, fromUserId);
  if (!slot) return;

  // Save to Mongo with anonymized senderName (slot, not real name)
  game.session.messages.push({
    senderId: fromUserId,
    senderName: slot,
    content: text,
    timestamp: new Date(),
  });
  await game.session.save();

  // Broadcast to room (both players see same payload)
  emitToRoom(nsp, game, 'game:message', {
    senderId: fromUserId,
    content: text,
    senderName: slot,
    senderType: 'human',
    timestamp: new Date().toISOString(),
  });

  // If opponent is AI and the human sender was p1, schedule AI reply
  if (game.isPlayer2AI && slot === 'p1' && game.aiPersona) {
    scheduleTuringAIReply(nsp, game, text);
  }
}

/**
 * Schedule the AI's reply to a player's message.
 * Random delay (1.1-3.5s) simulates human typing speed.
 *
 * 🟢 FIX #3: On Groq failure, send a believable fallback message.
 *   Previously: error logged, player waits forever.
 *   Now: fallback "one sec my wifi is being weird" sent so game continues.
 */
function scheduleTuringAIReply(
  nsp: Namespace,
  game: ActiveGame,
  userText: string
): void {
  const state = game.state as { aiHistory: ChatTurn[] };
  state.aiHistory.push({ role: 'user', content: userText });

  const delayMs = 1100 + Math.random() * 2400;
  const t = setTimeout(async () => {
    if (game.finished || game.session.status !== 'active') return;

    let reply: string;
    try {
      reply = await deceptiveHumanReply(state.aiHistory, game.aiPersona!);
    } catch (err) {
      logger.error({ err }, 'Turing AI reply failed, using fallback');
      // 🟢 FIX #3: Plausible human-sounding fallback
      reply = 'sorry was afk for a sec';
    }

    state.aiHistory.push({ role: 'assistant', content: reply });

    game.session.messages.push({
      senderId: 'ai-opponent',
      senderName: 'opponent',
      content: reply,
      timestamp: new Date(),
    });
    await game.session.save().catch((err) => {
      logger.error({ err }, 'Turing AI reply: session save failed');
    });

    emitToRoom(nsp, game, 'game:message', {
      senderId: 'ai-opponent',
      content: reply,
      senderName: 'opponent',
      senderType: 'opponent',
      timestamp: new Date().toISOString(),
    });
  }, delayMs);

  game.timers.push(t);
}

/* ─────────────────────────── Vote handler ─────────────────────────── */

export async function handleTuringVote(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  vote: 'human' | 'ai'
): Promise<void> {
  const slot = partyOf(game, fromUserId);
  if (!slot) return;

  const state = game.state as {
    votes: { p1: 'human' | 'ai' | null; p2: 'human' | 'ai' | null };
  };

  // Idempotent — ignore re-votes
  if (state.votes[slot] !== null) return;
  state.votes[slot] = vote;

  if (game.isPlayer2AI) {
    // No second voter; finish as soon as p1 votes.
    state.votes.p2 = 'human'; // dummy fill for record
    await finishTuringGame(nsp, game);
  } else if (state.votes.p1 && state.votes.p2) {
    // Both human players voted
    await finishTuringGame(nsp, game);
  }
  // else: one voted, wait for other (or vote phase timer)
}

/* ─────────────────────────── Game finish ─────────────────────────── */

async function finishTuringGame(nsp: Namespace, game: ActiveGame): Promise<void> {
  if (game.finished) return; // idempotent
  game.finished = true;
  clearAllTimers(game);

  const session = game.session;
  const state = game.state as {
    votes: { p1: 'human' | 'ai' | null; p2: 'human' | 'ai' | null };
  };

  session.player1Vote = state.votes.p1;
  session.player2Vote = state.votes.p2;
  session.status = 'finished';
  session.finishedAt = new Date();
  session.duration = Math.round((Date.now() - game.startedAt) / 1000);

  // P1 scoring
  const p1Correct =
    state.votes.p1 === (session.isPlayer2AI ? 'ai' : 'human');
  const p1FooledOpp = !session.isPlayer2AI && state.votes.p2 === 'ai';
  const p1Result = await applyTuringScore({
    userId: String(session.player1Id),
    guessedCorrectly: p1Correct,
    fooledOpponent: p1FooledOpp,
  });
  session.player1Score = p1Result.delta;

  // P2 scoring (only if real human)
  let p2Result = { delta: 0, newScore: 0, streak: 0 };
  if (!session.isPlayer2AI && session.player2Id) {
    const p2Correct = state.votes.p2 === 'human';
    const p2FooledOpp = state.votes.p1 === 'ai';
    p2Result = await applyTuringScore({
      userId: String(session.player2Id),
      guessedCorrectly: p2Correct,
      fooledOpponent: p2FooledOpp,
    });
    session.player2Score = p2Result.delta;
  }
  await session.save();

  // Personalized result emit
  const p1Rank = await getRank(String(session.player1Id), 'overall');
  emitToSlot(nsp, game, 'p1', 'game:result', {
    opponentType: session.isPlayer2AI ? 'ai' : 'human',
    yourVote: state.votes.p1,
    correct: p1Correct,
    points: p1Result.delta,
    newScore: p1Result.newScore,
    streak: p1Result.streak,
    rank: p1Rank,
  });

  if (!session.isPlayer2AI && session.player2Id) {
    const p2Rank = await getRank(String(session.player2Id), 'overall');
    const p2Correct = state.votes.p2 === 'human';
    emitToSlot(nsp, game, 'p2', 'game:result', {
      opponentType: 'human',
      yourVote: state.votes.p2,
      correct: p2Correct,
      points: p2Result.delta,
      newScore: p2Result.newScore,
      streak: p2Result.streak,
      rank: p2Rank,
    });
  }

  gcGame(game.roomKey);
}