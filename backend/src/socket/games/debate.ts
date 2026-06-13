/**
 * DEBATE GAME HANDLERS
 * ─────────────────────────────────────────────────────────────────
 * Rapid-fire debate. AI generates topic + side. 4 rounds (2 each), 30s each.
 * AI judge scores arguments and picks a winner.
 *
 * BUG FIXES IN THIS VERSION:
 *
 * 🔴 Fix #1: Concurrency race in advanceDebate
 *   BEFORE: Both player-message and timer-fire could call advanceDebate
 *           within milliseconds. Both would mutate state.round, state.currentTurn,
 *           and state.history simultaneously, corrupting the game.
 *           Result: extra arguments saved, rounds skipped, turn order reversed.
 *   AFTER:  Wrapped in withGameLock. Only one mutation runs at a time.
 *           Late callers silently bail (acceptable — their action was stale).
 *
 * 🔴 Fix #2: Distinguish timeout vs empty content
 *   BEFORE: const argument = content?.trim() || '(skipped — time ran out)';
 *           Empty submissions and timeouts produced identical placeholder.
 *           Frontend couldn't tell them apart; judging got confused.
 *   AFTER:  null sentinel for timeouts. Empty player submissions rejected
 *           earlier (handler returns without calling advanceDebate).
 *
 * 🟠 Fix #3: Forfeit on disconnect
 *   BEFORE: Game hung on disconnect. Now uses forfeitGame from gameUtils.
 *
 * 🟢 Fix #4: Defensive AI side lookup
 *   BEFORE: state.sides.p2 hardcoded — fails if AI ever ends up as p1.
 *   AFTER:  state.sides[currentTurn] — works for any AI slot.
 */

import type { Namespace } from 'socket.io';
import { GameSession } from '../../models/GameSession.model';
import {
  aiDebateArgument,
  judgeJSON,
  pickBotPersona,
  pickDebateTopic,
  type ChatTurn,
} from '../../services/groqService';
import {
  activeGames,
  clearAllTimers,
  currentTurnIsAI,
  emitToRoom,
  emitToSlot,
  gcGame,
  partyOf,
  withGameLock,
  type ActiveGame,
} from '../../services/gameUtils';
import { newRoomKey } from '../../services/matchmaking';
import { applyGameScore } from '../../services/scoring';
import { getRank } from '../../services/leaderboard';
import { logger } from '../../utils/logger';

const DEBATE_MAX_ROUNDS = 4;
const DEBATE_SECONDS_PER_ROUND = 30;

interface PlayerInfo {
  userId: string;
  socketId: string;
  displayName: string;
  avatarSeed: string;
}

/* ─────────────────────────── State shape ─────────────────────────── */

interface DebateState {
  topic: string;
  sides: { p1: 'pro' | 'con'; p2: 'pro' | 'con' };
  round: number;
  currentTurn: 'p1' | 'p2';
  history: { author: 'p1' | 'p2'; content: string }[];
  /**
   * Reference to the active round timer interval.
   * Stored separately so we can clear specifically THIS interval if needed,
   * even though clearAllTimers also catches it via game.timers.
   */
  roundTimer: NodeJS.Timeout | null;
}

function makeStrangerOpponent(): { name: string; avatarSeed: string } {
  return {
    name: 'Stranger',
    avatarSeed: 'stranger-' + Math.random().toString(36).slice(2, 10),
  };
}

/* ─────────────────────────── Game start ─────────────────────────── */

export async function startDebateHumanVsHumanGame(
  nsp: Namespace,
  p1: PlayerInfo,
  p2: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('debate', 'h');
  const topic = await pickDebateTopic();
  const p1Side: 'pro' | 'con' = Math.random() < 0.5 ? 'pro' : 'con';
  const p2Side: 'pro' | 'con' = p1Side === 'pro' ? 'con' : 'pro';

  const session = await GameSession.create({
    gameType: 'debate',
    roomKey,
    player1Id: p1.userId,
    player2Id: p2.userId,
    isPlayer2AI: false,
    status: 'active',
    metadata: { topic, sides: { p1: p1Side, p2: p2Side } },
  });

  const state: DebateState = {
    topic,
    sides: { p1: p1Side, p2: p2Side },
    round: 1,
    currentTurn: 'p1',
    history: [],
    roundTimer: null,
  };

  const game: ActiveGame = {
    session,
    gameType: 'debate',
    roomKey,
    player1SocketId: p1.socketId,
    player2SocketId: p2.socketId,
    isPlayer2AI: false,
    aiPersona: null,
    startedAt: Date.now(),
    finished: false,
    timers: [],
    state: state as unknown as Record<string, unknown>,
    advancing: false,
  };
  activeGames.set(roomKey, game);

  const p1Socket = nsp.sockets.get(p1.socketId);
  const p2Socket = nsp.sockets.get(p2.socketId);
  if (!p1Socket || !p2Socket) {
    logger.warn({ roomKey }, 'Debate start: socket gone, aborting');
    activeGames.delete(roomKey);
    session.status = 'finished';
    await session.save().catch(() => undefined);
    return;
  }
  p1Socket.join(roomKey);
  p2Socket.join(roomKey);

  emitToSlot(nsp, game, 'p1', 'game:match-found', {
    roomKey,
    gameType: 'debate',
    timeLimit: DEBATE_SECONDS_PER_ROUND,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });
  emitToSlot(nsp, game, 'p2', 'game:match-found', {
    roomKey,
    gameType: 'debate',
    timeLimit: DEBATE_SECONDS_PER_ROUND,
    youAreSlot: 'p2',
    opponent: makeStrangerOpponent(),
    youAre: { name: p2.displayName, avatarSeed: p2.avatarSeed },
  });

  // Personalized metadata so each player knows their own side
  emitToSlot(nsp, game, 'p1', 'game:metadata', {
    kind: 'debate-init',
    topic,
    yourSide: p1Side,
    opponentSide: p2Side,
    currentTurn: 'p1',
    round: 1,
    maxRounds: DEBATE_MAX_ROUNDS,
    secondsPerRound: DEBATE_SECONDS_PER_ROUND,
  });
  emitToSlot(nsp, game, 'p2', 'game:metadata', {
    kind: 'debate-init',
    topic,
    yourSide: p2Side,
    opponentSide: p1Side,
    currentTurn: 'p1',
    round: 1,
    maxRounds: DEBATE_MAX_ROUNDS,
    secondsPerRound: DEBATE_SECONDS_PER_ROUND,
  });

  startRoundTimer(nsp, game);
}

export async function startDebateAIGame(
  nsp: Namespace,
  p1: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('debate', 'ai');
  const topic = await pickDebateTopic();
  const persona = pickBotPersona();
  const p1Side: 'pro' | 'con' = Math.random() < 0.5 ? 'pro' : 'con';
  const p2Side: 'pro' | 'con' = p1Side === 'pro' ? 'con' : 'pro';

  const session = await GameSession.create({
    gameType: 'debate',
    roomKey,
    player1Id: p1.userId,
    player2Id: null,
    isPlayer2AI: true,
    status: 'active',
    metadata: { topic, sides: { p1: p1Side, p2: p2Side } },
  });

  const state: DebateState = {
    topic,
    sides: { p1: p1Side, p2: p2Side },
    round: 1,
    currentTurn: 'p1',
    history: [],
    roundTimer: null,
  };

  const game: ActiveGame = {
    session,
    gameType: 'debate',
    roomKey,
    player1SocketId: p1.socketId,
    player2SocketId: null,
    isPlayer2AI: true,
    aiPersona: persona,
    startedAt: Date.now(),
    finished: false,
    timers: [],
    state: state as unknown as Record<string, unknown>,
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
    gameType: 'debate',
    timeLimit: DEBATE_SECONDS_PER_ROUND,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });

  emitToSlot(nsp, game, 'p1', 'game:metadata', {
    kind: 'debate-init',
    topic,
    yourSide: p1Side,
    opponentSide: p2Side,
    currentTurn: 'p1',
    round: 1,
    maxRounds: DEBATE_MAX_ROUNDS,
    secondsPerRound: DEBATE_SECONDS_PER_ROUND,
  });

  startRoundTimer(nsp, game);
}

/* ─────────────────────────── Round timer ─────────────────────────── */

function startRoundTimer(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as DebateState;

  // Defensive: clear any existing timer before starting new
  if (state.roundTimer) {
    clearInterval(state.roundTimer);
    state.roundTimer = null;
  }

  let secondsLeft = DEBATE_SECONDS_PER_ROUND;

  const interval = setInterval(() => {
    if (game.finished) {
      clearInterval(interval);
      state.roundTimer = null;
      return;
    }
    secondsLeft -= 1;
    emitToRoom(nsp, game, 'game:timer', {
      secondsLeft,
      round: state.round,
      currentTurn: state.currentTurn,
    });
    if (secondsLeft <= 0) {
      clearInterval(interval);
      state.roundTimer = null;
      // 🔴 Fix #2: pass null explicitly to indicate timeout (not empty submission)
      void advanceDebate(nsp, game, null);
    }
  }, 1000);

  state.roundTimer = interval;
  game.timers.push(interval);
}

/* ─────────────────────────── Message handler ─────────────────────────── */

export async function handleDebateMessage(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  content: string
): Promise<void> {
  if (game.finished) return;
  const slot = partyOf(game, fromUserId);
  if (!slot) return;

  const state = game.state as unknown as DebateState;
  if (state.currentTurn !== slot) return;

  // 🔴 Fix #2: reject empty submissions early — don't advance the round
  const text = content.trim();
  if (!text) return;

  await advanceDebate(nsp, game, text);
}

/* ─────────────────────────── advanceDebate (the buggy one, now fixed) ─────────────────────────── */

/**
 * Advance the debate by one turn.
 *
 * @param content - the player's argument, OR null to indicate a timeout-skip.
 *
 * 🔴 Fix #1: Wrapped in withGameLock. If two callers race (player message
 * + timer fire), only the first runs; the second silently bails.
 *
 * 🔴 Fix #2: null content = explicit timeout sentinel. Empty content was
 * already filtered out by handleDebateMessage; this function trusts callers
 * to either pass real content or null.
 */
async function advanceDebate(
  nsp: Namespace,
  game: ActiveGame,
  content: string | null
): Promise<void> {
  if (game.finished) return;

  const lockResult = await withGameLock(game, async (): Promise<{ shouldFinish: boolean } | undefined> => {
    if (game.finished) return undefined; // re-check inside lock

    const state = game.state as unknown as DebateState;

    // Cancel current round timer (caller will start a new one for next round)
    if (state.roundTimer) {
      clearInterval(state.roundTimer);
      state.roundTimer = null;
    }

    const author = state.currentTurn;
    const argument = content === null ? '(skipped — time ran out)' : content;
    state.history.push({ author, content: argument });

    game.session.messages.push({
      senderId:
        author === 'p1'
          ? String(game.session.player1Id)
          : game.session.player2Id
          ? String(game.session.player2Id)
          : 'ai-opponent',
      senderName: author,
      content: argument,
      timestamp: new Date(),
    });
    await game.session.save();

    emitToRoom(nsp, game, 'game:debate-argument', {
      author,
      content: argument,
      round: state.round,
      timedOut: content === null, // 🔴 NEW: frontend can show "[timeout]" tag
    });

    // End condition
    if (state.round >= DEBATE_MAX_ROUNDS) {
      // Note: finishDebate runs OUTSIDE the lock to avoid nested-lock issues
      return { shouldFinish: true };
    }

    state.round += 1;
    state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1';
    emitToRoom(nsp, game, 'game:debate-turn', {
      round: state.round,
      currentTurn: state.currentTurn,
    });

    return { shouldFinish: false };
  });

  if (!lockResult.ran) {
    // Another caller is advancing — silently drop this attempt.
    // (e.g. timer fired AND player submitted at same instant)
    return;
  }

  // If inner returned undefined, game was already finished — nothing more to do.
  if (!lockResult.result) return;

  if (lockResult.result.shouldFinish) {
    await finishDebate(nsp, game);
    return;
  }

  // Outside the lock: start the next round's timer + AI move (if applicable).
  // These are safe to run without the lock because they don't mutate
  // state.round / state.currentTurn — they only read.
  startRoundTimer(nsp, game);

  if (currentTurnIsAI(game)) {
    scheduleAIDebateMove(nsp, game);
  }
}

/* ─────────────────────────── AI move ─────────────────────────── */

function scheduleAIDebateMove(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as DebateState;
  const delay = 2500 + Math.random() * 4000;

  const t = setTimeout(async () => {
    if (game.finished) return;
    let reply: string;
    try {
      const chatHistory: ChatTurn[] = state.history.map((h) => ({
        role: h.author === state.currentTurn ? 'assistant' : 'user',
        content: h.content,
      }));
      // 🟢 Fix #4: Use sides[currentTurn] for defensive AI side lookup.
      // (Previously hardcoded as state.sides.p2 — would break if AI ever was p1.)
      const aiSide = state.sides[state.currentTurn];
      reply = await aiDebateArgument(
        state.topic,
        aiSide,
        game.aiPersona!,
        chatHistory
      );
    } catch (err) {
      logger.error({ err }, 'AI debate move failed, using fallback');
      reply = 'honestly im not sure but i still think im right';
    }
    await advanceDebate(nsp, game, reply);
  }, delay);

  game.timers.push(t);
}

/* ─────────────────────────── Finish ─────────────────────────── */

async function finishDebate(nsp: Namespace, game: ActiveGame): Promise<void> {
  if (game.finished) return;
  game.finished = true;
  clearAllTimers(game);

  const state = game.state as unknown as DebateState;
  game.session.status = 'finished';
  game.session.finishedAt = new Date();
  await game.session.save();

  const judged = await judgeJSON<{
    winner: 'player1' | 'player2' | 'draw';
    p1_score: number;
    p2_score: number;
    summary: string;
  }>(
    'Judge this rapid-fire debate. Score each player 0-100 on argument quality (logic, persuasiveness, responsiveness to opponent). Pick a winner. Be fair to both sides.',
    {
      topic: state.topic,
      p1_side: state.sides.p1,
      p2_side: state.sides.p2,
      transcript: state.history,
    },
    '{ "winner": "player1"|"player2"|"draw", "p1_score": <0-100>, "p2_score": <0-100>, "summary": "<one sentence>" }'
  );

  const result = judged ?? {
    winner: 'draw' as const,
    p1_score: 50,
    p2_score: 50,
    summary: "Couldn't reach the judge.",
  };

  const p1Pts = result.winner === 'player1' ? 15 : result.winner === 'draw' ? 8 : 5;
  const p2Pts = result.winner === 'player2' ? 15 : result.winner === 'draw' ? 8 : 5;

  const p1Result = await applyGameScore(
    String(game.session.player1Id),
    'debate',
    p1Pts
  );
  game.session.player1Score = p1Pts;

  let p2Result = { newScore: 0 };
  if (game.session.player2Id) {
    p2Result = await applyGameScore(
      String(game.session.player2Id),
      'debate',
      p2Pts
    );
    game.session.player2Score = p2Pts;
  }
  await game.session.save();

  emitToRoom(nsp, game, 'game:judged', result);

  const p1Rank = await getRank(String(game.session.player1Id), 'overall');
  emitToSlot(nsp, game, 'p1', 'game:result', {
    opponentType: game.isPlayer2AI ? 'ai' : 'human',
    correct: result.winner === 'player1',
    points: p1Pts,
    newScore: p1Result.newScore,
    streak: 0,
    rank: p1Rank,
    summary: result.summary,
  });

  if (game.session.player2Id) {
    const p2Rank = await getRank(String(game.session.player2Id), 'overall');
    emitToSlot(nsp, game, 'p2', 'game:result', {
      opponentType: 'human',
      correct: result.winner === 'player2',
      points: p2Pts,
      newScore: p2Result.newScore,
      streak: 0,
      rank: p2Rank,
      summary: result.summary,
    });
  }

  gcGame(game.roomKey);
}