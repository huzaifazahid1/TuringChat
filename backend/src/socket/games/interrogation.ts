/**
 * INTERROGATION GAME — PROPOSAL A (Participation-Only)
 * ─────────────────────────────────────────────────────────────────
 * P1 (interrogator) asks 5 questions. P2 (or AI) answers. P1 votes
 * 'human' | 'ai'. Correct guess = points + streak.
 *
 * NEW IN PROPOSAL A:
 *
 *   P2's experience is now framed as "participation" instead of false
 *   win/loss. P2 didn't make a guess — showing them "Wrong guess!" was
 *   misleading.
 *
 *   Old behavior:
 *     P2 saw: correct: !p1Correct, summary: (none)
 *     Frontend rendered: "Wrong guess!" with sad emoji
 *
 *   New behavior:
 *     P2 sees: correct: null (sentinel), participated: true,
 *              summary: "You answered all 5 questions. +5 points."
 *     Frontend renders: "✨ You participated" with neutral framing
 *
 *
 * BUG FIXES IN THIS VERSION:
 *
 * 🟡 #1: P2 result framing fixed (Proposal A — your choice)
 *
 * 🟡 #2: AI Groq failure now sends fallback answer instead of hanging
 *
 * 🟢 #3: Per-question timeout (60s) for slow players
 *
 * 🟢 #4: Concurrency lock for vote handling (idempotent re-votes ignored)
 *
 * 🟢 #5: P1 reaching question cap properly transitions to voting phase
 */

import type { Namespace } from 'socket.io';
import { GameSession } from '../../models/GameSession.model';
import {
  aiInterrogationAnswer,
  pickBotPersona,
  type ChatTurn,
} from '../../services/groqService';
import {
  activeGames,
  clearAllTimers,
  emitToRoom,
  emitToSlot,
  gcGame,
  partyOf,
  withGameLock,
  type ActiveGame,
} from '../../services/gameUtils';
import { newRoomKey } from '../../services/matchmaking';
import { applyTuringScore, applyGameScore } from '../../services/scoring';
import { getRank } from '../../services/leaderboard';
import { logger } from '../../utils/logger';

const INTERROGATION_QUESTIONS = 5;
const INTERROGATION_QUESTION_TIMEOUT_MS = 60_000; // 60s per Q (P1) or per A (P2)
const INTERROGATION_VOTE_TIMEOUT_MS = 30_000;     // 30s for P1 to vote after all answered

interface PlayerInfo {
  userId: string;
  socketId: string;
  displayName: string;
  avatarSeed: string;
}

interface InterrogationState {
  questionIdx: number;
  maxQuestions: number;
  exchanges: { question: string; answer: string }[];
  voted: boolean;
  history: ChatTurn[];
  /** P1 = interrogator, P2 = answerer (fixed roles) */

  /** Phase machine: who's expected to act next */
  phase: 'awaiting-question' | 'awaiting-answer' | 'voting' | 'finishing';

  /** Per-action timeout (whoever should act has 60s) */
  actionTimer: NodeJS.Timeout | null;

  /** Vote phase timer */
  voteTimer: NodeJS.Timeout | null;
}

function makeStrangerOpponent(): { name: string; avatarSeed: string } {
  return {
    name: 'Stranger',
    avatarSeed: 'stranger-' + Math.random().toString(36).slice(2, 10),
  };
}

/* ─────────────────────────── Game start ─────────────────────────── */

export async function startInterrogationHumanVsHumanGame(
  nsp: Namespace,
  p1: PlayerInfo,
  p2: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('interrogation', 'h');

  const session = await GameSession.create({
    gameType: 'interrogation',
    roomKey,
    player1Id: p1.userId,
    player2Id: p2.userId,
    isPlayer2AI: false,
    status: 'active',
  });

  const state: InterrogationState = {
    questionIdx: 0,
    maxQuestions: INTERROGATION_QUESTIONS,
    exchanges: [],
    voted: false,
    history: [],
    phase: 'awaiting-question',
    actionTimer: null,
    voteTimer: null,
  };

  const game: ActiveGame = {
    session,
    gameType: 'interrogation',
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
    logger.warn({ roomKey }, 'Interrogation start: socket gone, aborting');
    activeGames.delete(roomKey);
    session.status = 'finished';
    await session.save().catch(() => undefined);
    return;
  }
  p1Socket.join(roomKey);
  p2Socket.join(roomKey);

  emitToSlot(nsp, game, 'p1', 'game:match-found', {
    roomKey,
    gameType: 'interrogation',
    timeLimit: INTERROGATION_QUESTIONS,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });
  emitToSlot(nsp, game, 'p2', 'game:match-found', {
    roomKey,
    gameType: 'interrogation',
    timeLimit: INTERROGATION_QUESTIONS,
    youAreSlot: 'p2',
    opponent: makeStrangerOpponent(),
    youAre: { name: p2.displayName, avatarSeed: p2.avatarSeed },
  });

  // Personalized roles
  emitToSlot(nsp, game, 'p1', 'game:metadata', {
    kind: 'interrogation-init',
    role: 'interrogator',
    maxQuestions: INTERROGATION_QUESTIONS,
    questionIdx: 0,
  });
  emitToSlot(nsp, game, 'p2', 'game:metadata', {
    kind: 'interrogation-init',
    role: 'answerer',
    maxQuestions: INTERROGATION_QUESTIONS,
    questionIdx: 0,
  });

  // 🟢 Fix #3: Start P1's question timer
  startActionTimer(nsp, game);
}

export async function startInterrogationAIGame(
  nsp: Namespace,
  p1: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('interrogation', 'ai');
  const persona = pickBotPersona();

  const session = await GameSession.create({
    gameType: 'interrogation',
    roomKey,
    player1Id: p1.userId,
    player2Id: null,
    isPlayer2AI: true,
    status: 'active',
  });

  const state: InterrogationState = {
    questionIdx: 0,
    maxQuestions: INTERROGATION_QUESTIONS,
    exchanges: [],
    voted: false,
    history: [],
    phase: 'awaiting-question',
    actionTimer: null,
    voteTimer: null,
  };

  const game: ActiveGame = {
    session,
    gameType: 'interrogation',
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
    gameType: 'interrogation',
    timeLimit: INTERROGATION_QUESTIONS,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });

  emitToSlot(nsp, game, 'p1', 'game:metadata', {
    kind: 'interrogation-init',
    role: 'interrogator',
    maxQuestions: INTERROGATION_QUESTIONS,
    questionIdx: 0,
  });

  startActionTimer(nsp, game);
}

/* ─────────────────────────── Action timeout ─────────────────────────── */

/**
 * 🟢 Fix #3: 60s timer for whoever's expected to act next.
 *   - 'awaiting-question': P1 has 60s to ask
 *   - 'awaiting-answer': P2 (or AI) has 60s to answer
 *
 * If timeout fires, we end the game gracefully:
 *   - If P1 was timing out (no question), session ends with no result for P1
 *     (P2 gets participation if human, P1 gets nothing)
 *   - If P2 was timing out, P1 can vote with whatever info they have
 */
function startActionTimer(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as InterrogationState;

  if (state.actionTimer) {
    clearTimeout(state.actionTimer);
    state.actionTimer = null;
  }

  state.actionTimer = setTimeout(async () => {
    if (game.finished) return;
    logger.info(
      { roomKey: game.roomKey, phase: state.phase },
      'Interrogation action timeout'
    );

    if (state.phase === 'awaiting-question') {
      // P1 didn't ask — end with no result (both get participation)
      await finishInterrogation(nsp, game, { timedOut: true });
    } else if (state.phase === 'awaiting-answer') {
      // P2 didn't answer — fill blank, allow P1 to vote with what they have
      const last = state.exchanges[state.exchanges.length - 1];
      if (last && !last.answer) {
        last.answer = '(no response)';
        emitToRoom(nsp, game, 'game:interrogation-answer', {
          answer: last.answer,
          questionIdx: state.exchanges.length,
          maxQuestions: state.maxQuestions,
          allAnswered: state.exchanges.length >= state.maxQuestions,
          timedOut: true,
        });

        // Move to next phase based on whether we hit max questions
        if (state.exchanges.length >= state.maxQuestions) {
          await transitionToVoting(nsp, game);
        } else {
          state.phase = 'awaiting-question';
          startActionTimer(nsp, game);
        }
      }
    }
  }, INTERROGATION_QUESTION_TIMEOUT_MS);

  game.timers.push(state.actionTimer);
}

function clearActionTimer(state: InterrogationState): void {
  if (state.actionTimer) {
    clearTimeout(state.actionTimer);
    state.actionTimer = null;
  }
}

/* ─────────────────────────── Message handler ─────────────────────────── */

export async function handleInterrogationMessage(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  content: string
): Promise<void> {
  if (game.finished) return;
  const slot = partyOf(game, fromUserId);
  if (!slot) return;

  const state = game.state as unknown as InterrogationState;
  const text = content.trim().slice(0, 280);
  if (!text) return;

  if (slot === 'p1') {
    await handleP1Question(nsp, game, text);
  } else if (slot === 'p2') {
    await handleP2Answer(nsp, game, text);
  }
}

async function handleP1Question(
  nsp: Namespace,
  game: ActiveGame,
  text: string
): Promise<void> {
  const state = game.state as unknown as InterrogationState;

  const lockResult = await withGameLock(
    game,
    async (): Promise<{ aiShouldAnswer: boolean } | undefined> => {
      if (game.finished) return undefined;
      if (state.phase !== 'awaiting-question') return undefined;
      if (state.exchanges.length >= state.maxQuestions) return undefined;

      // Cancel question timer (P1 acted in time)
      clearActionTimer(state);

      const exchange = { question: text, answer: '' };
      state.exchanges.push(exchange);
      state.history.push({ role: 'user', content: text });
      state.phase = 'awaiting-answer';

      emitToRoom(nsp, game, 'game:interrogation-question', {
        question: text,
        questionIdx: state.exchanges.length,
        maxQuestions: state.maxQuestions,
      });

      return { aiShouldAnswer: game.isPlayer2AI };
    }
  );

  if (!lockResult.ran || !lockResult.result) return;

  if (lockResult.result.aiShouldAnswer) {
    scheduleAIInterrogationAnswer(nsp, game);
  } else {
    // Human P2 needs to answer — start their timer
    startActionTimer(nsp, game);
  }
}

async function handleP2Answer(
  nsp: Namespace,
  game: ActiveGame,
  text: string
): Promise<void> {
  const state = game.state as unknown as InterrogationState;

  const lockResult = await withGameLock(
    game,
    async (): Promise<{ allAnswered: boolean } | undefined> => {
      if (game.finished) return undefined;
      if (state.phase !== 'awaiting-answer') return undefined;

      const last = state.exchanges[state.exchanges.length - 1];
      if (!last || last.answer) return undefined; // no question pending or already answered

      clearActionTimer(state);

      last.answer = text;
      state.history.push({ role: 'user', content: text });

      emitToRoom(nsp, game, 'game:interrogation-answer', {
        answer: text,
        questionIdx: state.exchanges.length,
        maxQuestions: state.maxQuestions,
        allAnswered: state.exchanges.length >= state.maxQuestions,
      });

      const allAnswered = state.exchanges.length >= state.maxQuestions;
      state.phase = allAnswered ? 'voting' : 'awaiting-question';

      return { allAnswered };
    }
  );

  if (!lockResult.ran || !lockResult.result) return;

  if (lockResult.result.allAnswered) {
    await transitionToVoting(nsp, game);
  } else {
    // Next question — start P1's timer
    startActionTimer(nsp, game);
  }
}

/* ─────────────────────────── AI answer ─────────────────────────── */

function scheduleAIInterrogationAnswer(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as InterrogationState;
  const last = state.exchanges[state.exchanges.length - 1];
  if (!last) return;

  const question = last.question;
  const delay = 1800 + Math.random() * 3200;

  const t = setTimeout(async () => {
    if (game.finished || state.phase !== 'awaiting-answer') return;

    let answer: string;
    try {
      answer = await aiInterrogationAnswer(question, game.aiPersona!, state.history);
    } catch (err) {
      logger.error({ err }, 'AI interrogation answer failed, using fallback');
      // 🟡 Fix #2: Fallback answer (was: silent failure → game hung)
      answer = "huh, lemme think... idk lol";
    }

    const lockResult = await withGameLock(
      game,
      async (): Promise<{ allAnswered: boolean } | undefined> => {
        if (game.finished || state.phase !== 'awaiting-answer') return undefined;
        const stillPending = state.exchanges[state.exchanges.length - 1];
        if (!stillPending || stillPending.answer) return undefined;

        stillPending.answer = answer;
        state.history.push({ role: 'assistant', content: answer });

        emitToRoom(nsp, game, 'game:interrogation-answer', {
          answer,
          questionIdx: state.exchanges.length,
          maxQuestions: state.maxQuestions,
          allAnswered: state.exchanges.length >= state.maxQuestions,
        });

        const allAnswered = state.exchanges.length >= state.maxQuestions;
        state.phase = allAnswered ? 'voting' : 'awaiting-question';

        return { allAnswered };
      }
    );

    if (!lockResult.ran || !lockResult.result) return;

    if (lockResult.result.allAnswered) {
      await transitionToVoting(nsp, game);
    } else {
      startActionTimer(nsp, game);
    }
  }, delay);

  game.timers.push(t);
}

/* ─────────────────────────── Voting transition ─────────────────────────── */

async function transitionToVoting(
  nsp: Namespace,
  game: ActiveGame
): Promise<void> {
  if (game.finished) return;
  const state = game.state as unknown as InterrogationState;
  state.phase = 'voting';

  // Emit to P1 only — P2 doesn't vote
  emitToSlot(nsp, game, 'p1', 'game:vote-phase', {});

  // 30s vote timer
  state.voteTimer = setTimeout(async () => {
    if (game.finished) return;
    logger.info({ roomKey: game.roomKey }, 'Interrogation vote timeout');
    // P1 didn't vote → end game with no vote
    await finishInterrogation(nsp, game, { voteTimedOut: true });
  }, INTERROGATION_VOTE_TIMEOUT_MS);
  game.timers.push(state.voteTimer);
}

/* ─────────────────────────── Vote handler ─────────────────────────── */

export async function handleInterrogationVote(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  vote: 'human' | 'ai'
): Promise<void> {
  if (game.finished) return;
  const slot = partyOf(game, fromUserId);
  if (slot !== 'p1') return; // 🟢 Fix #4: Only interrogator votes

  const state = game.state as unknown as InterrogationState;
  if (state.phase !== 'voting') return;
  if (state.voted) return; // idempotent

  state.voted = true;
  game.session.player1Vote = vote;

  await finishInterrogation(nsp, game, { vote });
}

/* ─────────────────────────── Finish ─────────────────────────── */

interface FinishOptions {
  vote?: 'human' | 'ai';
  voteTimedOut?: boolean;
  timedOut?: boolean; // game ended early due to inactivity
}

async function finishInterrogation(
  nsp: Namespace,
  game: ActiveGame,
  opts: FinishOptions
): Promise<void> {
  if (game.finished) return;
  game.finished = true;
  clearAllTimers(game);

  const state = game.state as unknown as InterrogationState;
  state.phase = 'finishing';
  game.session.status = 'finished';
  game.session.finishedAt = new Date();

  /**
   * P1 SCORING:
   * - If they voted: standard correct/incorrect logic
   * - If timed out / didn't vote: 0 points, no streak change
   */
  let p1Result = { delta: 0, newScore: 0, streak: 0 };
  let p1Correct = false;

  if (opts.vote) {
    p1Correct = opts.vote === (game.isPlayer2AI ? 'ai' : 'human');
    p1Result = await applyTuringScore({
      userId: String(game.session.player1Id),
      guessedCorrectly: p1Correct,
      fooledOpponent: false,
    });
    game.session.player1Score = p1Result.delta;
  } else {
    // No vote — fetch current score for display
    p1Result.newScore = await getCurrentScore(String(game.session.player1Id));
  }

  /**
   * 🟡 Fix #1 (Proposal A): P2 PARTICIPATION SCORING
   *
   * P2 always gets +5 for participating (if human). No win/loss framing.
   */
  let p2NewScore = 0;
  let p2Participated = false;
  if (game.session.player2Id) {
    const p2Res = await applyGameScore(
      String(game.session.player2Id),
      'interrogation',
      5
    );
    game.session.player2Score = 5;
    p2NewScore = p2Res.newScore;
    p2Participated = true;
  }
  await game.session.save();

  // Personalized results
  const p1Rank = await getRank(String(game.session.player1Id), 'overall');
  emitToSlot(nsp, game, 'p1', 'game:result', {
    opponentType: game.isPlayer2AI ? 'ai' : 'human',
    yourVote: opts.vote ?? null,
    correct: opts.vote ? p1Correct : null,
    points: p1Result.delta,
    newScore: p1Result.newScore,
    streak: p1Result.streak,
    rank: p1Rank,
    summary: opts.timedOut
      ? "You ran out of time before asking enough questions."
      : opts.voteTimedOut
      ? "You didn't vote in time — no points awarded."
      : opts.vote && p1Correct
      ? `Correct! Your opponent was ${game.isPlayer2AI ? 'an AI' : 'a real human'}.`
      : opts.vote
      ? `Wrong. Your opponent was actually ${game.isPlayer2AI ? 'an AI' : 'a real human'}.`
      : 'Game ended.',
  });

  /**
   * 🟡 Fix #1 (Proposal A): P2 result is participation-only.
   *
   * IMPORTANT FIELDS:
   *   correct: null — special sentinel telling frontend to render
   *                   "✨ You participated" instead of win/loss
   *   participated: true — explicit flag
   *   yourVote: null — P2 didn't vote
   */
  if (game.session.player2Id) {
    const p2Rank = await getRank(String(game.session.player2Id), 'overall');
    emitToSlot(nsp, game, 'p2', 'game:result', {
      opponentType: 'human',
      yourVote: null,
      correct: null, // ← sentinel for participation-only
      participated: p2Participated, // ← new field
      points: 5,
      newScore: p2NewScore,
      streak: 0,
      rank: p2Rank,
      summary: 'You answered all the questions. +5 points for participating.',
    });
  }

  gcGame(game.roomKey);
}

/**
 * Helper to get current score without scoring side-effects.
 * Used when P1 didn't vote (no score change but we want to show their current total).
 */
async function getCurrentScore(userId: string): Promise<number> {
  try {
    const { User } = await import('../../models/User.model');
    const user = await User.findById(userId).select('stats.currentScore').lean();
    return user?.stats?.currentScore ?? 0;
  } catch {
    return 0;
  }
}