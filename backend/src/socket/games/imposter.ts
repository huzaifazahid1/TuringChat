/**
 * IMPOSTER GAME — PROPOSAL A (Classic Imposter)
 * ─────────────────────────────────────────────────────────────────
 * COMPLETE REWRITE. This replaces the previous Imposter implementation.
 *
 * NEW GAME DESIGN:
 *
 *   Setup:
 *     - Backend picks a word PAIR: { real, imposter } (e.g. "guitar"/"violin")
 *     - Random slot assignment:
 *         • One slot gets the real word
 *         • Other slot gets the imposter word
 *         • Neither knows which they have — both think they have the secret
 *     - Player who has imposter is "the imposter" (they don't know it)
 *
 *   Gameplay:
 *     - 6 turns total, alternating (3 clues each)
 *     - Each player describes THEIR own word without saying it
 *     - Saying YOUR own word = instant loss (cleanly enforced as before)
 *
 *   Voting:
 *     - After all clues, both players vote: "I think P1 is imposter" or
 *       "I think P2 is imposter"
 *     - Both must vote (timeout = 30s)
 *
 *   Scoring:
 *     - Imposter wins if NEITHER opponent voted them out (they fooled both)
 *       (note: in 1v1, "neither" just means the one opponent voted wrong)
 *     - Real-word player wins if they correctly voted out the imposter
 *     - Draw possible if vote disagrees
 *
 *     Points:
 *       Imposter wins (fooled): 18 (extra reward for harder side)
 *       Real wins (caught):     12
 *       Loser:                   4
 *
 * BUG FIXES vs OLD VERSION:
 *
 * 🔴 #1: Game now has actual strategic depth (info asymmetry)
 * 🔴 #2: Removed AI auto-censor (kept here for safety but applies to BOTH sides)
 * 🟡 #3: Personalized result summaries (no more "You said the word" sent to winner)
 * 🟢 #4: Removed `void fakeUserId` code smell
 */

import type { Namespace } from 'socket.io';
import { GameSession } from '../../models/GameSession.model';
import {
  aiImposterDescription,
  pickBotPersona,
  pickImposterWordPair, // NEW (added to groqService)
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

const IMPOSTER_MAX_TURNS = 6;
const IMPOSTER_VOTE_DURATION_MS = 30_000;

interface PlayerInfo {
  userId: string;
  socketId: string;
  displayName: string;
  avatarSeed: string;
}

/* ─────────────────────────── State shape ─────────────────────────── */

interface ImposterState {
  /** Which word each slot SEES (their personal secret) */
  words: { p1: string; p2: string };
  /** The actual real word (for reveal at end) */
  realWord: string;
  /** Which slot is the imposter */
  imposterSlot: 'p1' | 'p2';

  turnIdx: number;
  maxTurns: number;
  currentTurn: 'p1' | 'p2';
  history: { author: 'p1' | 'p2'; content: string }[];

  /** Slot that said their own word out loud (instant loss) */
  loserSlot: 'p1' | 'p2' | null;

  /** Voting phase state */
  votes: { p1: 'p1' | 'p2' | null; p2: 'p1' | 'p2' | null };
  voteTimer: NodeJS.Timeout | null;

  /** Phase machine */
  phase: 'clueing' | 'voting' | 'finishing';
}

function makeStrangerOpponent(): { name: string; avatarSeed: string } {
  return {
    name: 'Stranger',
    avatarSeed: 'stranger-' + Math.random().toString(36).slice(2, 10),
  };
}

/* ─────────────────────────── Game start ─────────────────────────── */

export async function startImposterHumanVsHumanGame(
  nsp: Namespace,
  p1: PlayerInfo,
  p2: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('imposter', 'h');
  const pair = await pickImposterWordPair(); // { real, imposter }

  // Randomly assign which slot gets which word
  const realSlot: 'p1' | 'p2' = Math.random() < 0.5 ? 'p1' : 'p2';
  const imposterSlot: 'p1' | 'p2' = realSlot === 'p1' ? 'p2' : 'p1';

  const words = {
    [realSlot]: pair.real,
    [imposterSlot]: pair.imposter,
  } as { p1: string; p2: string };

  const session = await GameSession.create({
    gameType: 'imposter',
    roomKey,
    player1Id: p1.userId,
    player2Id: p2.userId,
    isPlayer2AI: false,
    status: 'active',
    metadata: {
      realWord: pair.real,
      imposterWord: pair.imposter,
      imposterSlot,
    },
  });

  const state: ImposterState = {
    words,
    realWord: pair.real,
    imposterSlot,
    turnIdx: 0,
    maxTurns: IMPOSTER_MAX_TURNS,
    currentTurn: 'p1',
    history: [],
    loserSlot: null,
    votes: { p1: null, p2: null },
    voteTimer: null,
    phase: 'clueing',
  };

  const game: ActiveGame = {
    session,
    gameType: 'imposter',
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
    logger.warn({ roomKey }, 'Imposter start: socket gone, aborting');
    activeGames.delete(roomKey);
    session.status = 'finished';
    await session.save().catch(() => undefined);
    return;
  }
  p1Socket.join(roomKey);
  p2Socket.join(roomKey);

  // match-found broadcasts (anonymous opponent)
  emitToSlot(nsp, game, 'p1', 'game:match-found', {
    roomKey,
    gameType: 'imposter',
    timeLimit: IMPOSTER_MAX_TURNS,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });
  emitToSlot(nsp, game, 'p2', 'game:match-found', {
    roomKey,
    gameType: 'imposter',
    timeLimit: IMPOSTER_MAX_TURNS,
    youAreSlot: 'p2',
    opponent: makeStrangerOpponent(),
    youAre: { name: p2.displayName, avatarSeed: p2.avatarSeed },
  });

  /**
   * 🔴 CRITICAL: Each player gets ONLY their own word in metadata.
   * Neither sees the other's word, neither knows who's the imposter.
   * This is the entire point of Proposal A.
   */
  emitToSlot(nsp, game, 'p1', 'game:metadata', {
    kind: 'imposter-init',
    yourWord: words.p1, // ← only their own
    currentTurn: 'p1',
    turnIdx: 0,
    maxTurns: IMPOSTER_MAX_TURNS,
  });
  emitToSlot(nsp, game, 'p2', 'game:metadata', {
    kind: 'imposter-init',
    yourWord: words.p2, // ← only their own
    currentTurn: 'p1',
    turnIdx: 0,
    maxTurns: IMPOSTER_MAX_TURNS,
  });
}

export async function startImposterAIGame(
  nsp: Namespace,
  p1: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('imposter', 'ai');
  const pair = await pickImposterWordPair();
  const persona = pickBotPersona();

  // For AI games, we still randomize who gets which word
  const realSlot: 'p1' | 'p2' = Math.random() < 0.5 ? 'p1' : 'p2';
  const imposterSlot: 'p1' | 'p2' = realSlot === 'p1' ? 'p2' : 'p1';

  const words = {
    [realSlot]: pair.real,
    [imposterSlot]: pair.imposter,
  } as { p1: string; p2: string };

  const session = await GameSession.create({
    gameType: 'imposter',
    roomKey,
    player1Id: p1.userId,
    player2Id: null,
    isPlayer2AI: true,
    status: 'active',
    metadata: {
      realWord: pair.real,
      imposterWord: pair.imposter,
      imposterSlot,
    },
  });

  const state: ImposterState = {
    words,
    realWord: pair.real,
    imposterSlot,
    turnIdx: 0,
    maxTurns: IMPOSTER_MAX_TURNS,
    currentTurn: 'p1',
    history: [],
    loserSlot: null,
    votes: { p1: null, p2: null },
    voteTimer: null,
    phase: 'clueing',
  };

  const game: ActiveGame = {
    session,
    gameType: 'imposter',
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
    gameType: 'imposter',
    timeLimit: IMPOSTER_MAX_TURNS,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });

  emitToSlot(nsp, game, 'p1', 'game:metadata', {
    kind: 'imposter-init',
    yourWord: words.p1,
    currentTurn: 'p1',
    turnIdx: 0,
    maxTurns: IMPOSTER_MAX_TURNS,
  });

  // If AI starts (currentTurn would already need to be p2, which it isn't), no-op
  // (p1 is always human and always starts)
}

/* ─────────────────────────── Clue handler ─────────────────────────── */

export async function handleImposterMessage(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  content: string
): Promise<void> {
  if (game.finished) return;
  const slot = partyOf(game, fromUserId);
  if (!slot) return;

  const state = game.state as unknown as ImposterState;
  if (state.phase !== 'clueing') return; // ignore during voting/finishing
  if (state.currentTurn !== slot) return;

  const text = content.trim().slice(0, 240);
  if (!text) return;

  const lockResult = await withGameLock(game, async (): Promise<
    { goToVoting: boolean; ended: boolean } | undefined
  > => {
    if (game.finished || state.phase !== 'clueing') return undefined;

    /**
     * Violation check: did the player say their OWN word?
     * Each player has their own secret word — the regex is per-player.
     */
    const myWord = state.words[slot];
    const wordRe = new RegExp(`\\b${myWord}\\b`, 'i');
    const violation = wordRe.test(text);

    state.history.push({ author: slot, content: text });
    state.turnIdx += 1;
    state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1';

    emitToRoom(nsp, game, 'game:imposter-clue', {
      author: slot,
      content: text,
      turnIdx: state.turnIdx,
      maxTurns: state.maxTurns,
      nextTurn: state.currentTurn,
    });

    if (violation) {
      state.loserSlot = slot;
      // Send violation event to room — both players see the loser's word
      emitToRoom(nsp, game, 'game:imposter-violation', {
        who: slot,
        word: myWord,
      });
      // Skip voting — go straight to finish
      return { goToVoting: false, ended: true };
    }

    if (state.turnIdx >= state.maxTurns) {
      // All clues done → voting phase
      return { goToVoting: true, ended: false };
    }

    return { goToVoting: false, ended: false };
  });

  if (!lockResult.ran || !lockResult.result) return;

  if (lockResult.result.ended) {
    await finishImposter(nsp, game);
    return;
  }

  if (lockResult.result.goToVoting) {
    await transitionToVoting(nsp, game);
    return;
  }

  // Continue clueing — schedule AI's turn if next is AI
  if (currentTurnIsAI(game)) {
    scheduleAIImposterMove(nsp, game);
  }
}

/* ─────────────────────────── AI clue ─────────────────────────── */

function scheduleAIImposterMove(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as ImposterState;
  const delay = 1800 + Math.random() * 2500;

  const t = setTimeout(async () => {
    if (game.finished || state.phase !== 'clueing') return;

    const aiSlot: 'p1' | 'p2' = state.currentTurn;
    const aiWord = state.words[aiSlot];

    /**
     * Build context from history. AI sees opponent's clues for "user" role
     * and its own previous clues for "assistant" role.
     */
    const chatHistory: ChatTurn[] = state.history.map((h) => ({
      role: h.author === aiSlot ? 'assistant' : 'user',
      content: h.content,
    }));

    let clue: string;
    try {
      clue = await aiImposterDescription(aiWord, game.aiPersona!, chatHistory);
    } catch (err) {
      logger.error({ err }, 'AI imposter description failed, using fallback');
      clue = "its a thing thats hard to explain in one clue";
    }

    // Apply the AI's clue under the same lock (race-safe)
    const lockResult = await withGameLock(game, async (): Promise<
      { goToVoting: boolean; ended: boolean } | undefined
    > => {
      if (game.finished || state.phase !== 'clueing') return undefined;
      if (state.currentTurn !== aiSlot) return undefined; // turn changed somehow

      /**
       * 🔴 Fix: Check violation for AI too (no auto-censor).
       *
       * Old version called text.replace(re, '****') in aiImposterDescription
       * to silently censor the word. That made AI literally unable to lose
       * by slipping. Unfair to humans.
       *
       * New version: AI's clue is treated like a player's. If it accidentally
       * says its own word, AI loses. (Hard for AI to do given the prompt,
       * but possible.)
       */
      const wordRe = new RegExp(`\\b${aiWord}\\b`, 'i');
      const violation = wordRe.test(clue);

      state.history.push({ author: aiSlot, content: clue });
      state.turnIdx += 1;
      state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1';

      emitToRoom(nsp, game, 'game:imposter-clue', {
        author: aiSlot,
        content: clue,
        turnIdx: state.turnIdx,
        maxTurns: state.maxTurns,
        nextTurn: state.currentTurn,
      });

      if (violation) {
        state.loserSlot = aiSlot;
        emitToRoom(nsp, game, 'game:imposter-violation', {
          who: aiSlot,
          word: aiWord,
        });
        return { goToVoting: false, ended: true };
      }

      if (state.turnIdx >= state.maxTurns) {
        return { goToVoting: true, ended: false };
      }

      return { goToVoting: false, ended: false };
    });

    if (!lockResult.ran || !lockResult.result) return;

    if (lockResult.result.ended) {
      await finishImposter(nsp, game);
      return;
    }

    if (lockResult.result.goToVoting) {
      await transitionToVoting(nsp, game);
      return;
    }

    // Continue clueing — if it's AI's turn AGAIN (won't happen with strict alternation
    // but defensive), schedule again
    if (currentTurnIsAI(game)) {
      scheduleAIImposterMove(nsp, game);
    }
  }, delay);

  game.timers.push(t);
}

/* ─────────────────────────── Voting phase ─────────────────────────── */

async function transitionToVoting(nsp: Namespace, game: ActiveGame): Promise<void> {
  if (game.finished) return;
  const state = game.state as unknown as ImposterState;
  state.phase = 'voting';

  emitToRoom(nsp, game, 'game:vote-phase', {
    kind: 'imposter-vote',
    turnIdx: state.turnIdx,
  });

  // For AI opponent, AI auto-votes after delay (random pick weighted slightly toward correctness)
  if (game.isPlayer2AI) {
    scheduleAIImposterVote(nsp, game);
  }

  // 30s timer: if voting incomplete, force-finish with whoever has voted
  state.voteTimer = setTimeout(async () => {
    if (game.finished) return;
    logger.info({ roomKey: game.roomKey }, 'Imposter vote phase timeout');
    await finishImposter(nsp, game);
  }, IMPOSTER_VOTE_DURATION_MS);
  game.timers.push(state.voteTimer);
}

function scheduleAIImposterVote(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as ImposterState;
  const delay = 2000 + Math.random() * 3000;

  const t = setTimeout(() => {
    if (game.finished || state.phase !== 'voting') return;
    /**
     * AI heuristic vote (no LLM call to save cost):
     *
     * AI is always p2 in our matchmaking. It "votes" by guessing who the
     * imposter is. We bias 65% toward suspecting the OTHER player (p1),
     * because that's what a paranoid human would do. 35% it suspects
     * itself (p2), which keeps games unpredictable for the human.
     *
     * Note: this means AI is wrong about as often as a 50/50 guesser
     * (since the imposter is randomly p1 or p2). Makes the game fair.
     */
    const aiVote: 'p1' | 'p2' = Math.random() < 0.65 ? 'p1' : 'p2';

    state.votes.p2 = aiVote;
    emitToRoom(nsp, game, 'game:imposter-vote-cast', {
      voter: 'p2',
      // We don't reveal what they voted yet — just that they voted
    });

    // If both have voted, finish
    if (state.votes.p1 && state.votes.p2) {
      void finishImposter(nsp, game);
    }
  }, delay);

  game.timers.push(t);
}

/* ─────────────────────────── Vote handler ─────────────────────────── */

/**
 * Handle a player's vote during the voting phase.
 * Vote is which slot they think is the imposter.
 */
export async function handleImposterVote(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  vote: 'p1' | 'p2'
): Promise<void> {
  if (game.finished) return;
  const slot = partyOf(game, fromUserId);
  if (!slot) return;

  const state = game.state as unknown as ImposterState;
  if (state.phase !== 'voting') return;
  if (vote !== 'p1' && vote !== 'p2') return;

  // Idempotent: don't double-count
  if (state.votes[slot] !== null) return;

  state.votes[slot] = vote;

  emitToRoom(nsp, game, 'game:imposter-vote-cast', {
    voter: slot,
  });

  // If both voted (or one voted vs AI which auto-votes), finish
  if (state.votes.p1 && state.votes.p2) {
    await finishImposter(nsp, game);
  }
}

/* ─────────────────────────── Finish ─────────────────────────── */

async function finishImposter(nsp: Namespace, game: ActiveGame): Promise<void> {
  if (game.finished) return;
  game.finished = true;
  clearAllTimers(game);

  const state = game.state as unknown as ImposterState;
  state.phase = 'finishing';
  game.session.status = 'finished';
  game.session.finishedAt = new Date();

  /**
   * Determine winner based on game state:
   *
   * Path 1: Someone said their word out loud → loserSlot set → other wins
   * Path 2: Voting completed → check votes
   *
   * For voting: imposter wins if they were NOT correctly identified.
   * In a 1v1 game, that means the real-word player voted wrong.
   * The imposter's vote is mostly aesthetic in 1v1 (they're guessing about themselves).
   */
  let winnerSlot: 'p1' | 'p2' | null = null;
  let summaryText = '';

  if (state.loserSlot) {
    // Someone slipped during clueing
    winnerSlot = state.loserSlot === 'p1' ? 'p2' : 'p1';
    summaryText = `${state.loserSlot === state.imposterSlot ? 'The imposter' : 'A player'} accidentally said their secret word.`;
  } else {
    // Voting outcome
    const realSlot: 'p1' | 'p2' = state.imposterSlot === 'p1' ? 'p2' : 'p1';
    const realPlayerVote = state.votes[realSlot];

    if (realPlayerVote === state.imposterSlot) {
      // Real-word player correctly identified imposter
      winnerSlot = realSlot;
      summaryText = `The real word was "${state.realWord}". The imposter (${state.imposterSlot}) was caught!`;
    } else {
      // Real-word player guessed wrong — imposter wins
      winnerSlot = state.imposterSlot;
      summaryText = `The real word was "${state.realWord}". The imposter (${state.imposterSlot}) escaped detection!`;
    }
  }

  // Scoring with imposter premium
  // (imposter wins are harder, so give 18; real-word win is 12)
  const isImposterWin = winnerSlot === state.imposterSlot && !state.loserSlot;
  const winnerPts = isImposterWin ? 18 : 12;
  const loserPts = 4;

  const p1Pts = winnerSlot === 'p1' ? winnerPts : loserPts;
  const p2Pts = winnerSlot === 'p2' ? winnerPts : loserPts;

  const p1Result = await applyGameScore(
    String(game.session.player1Id),
    'imposter',
    p1Pts
  );
  game.session.player1Score = p1Pts;

  let p2Result = { newScore: 0 };
  if (game.session.player2Id) {
    p2Result = await applyGameScore(
      String(game.session.player2Id),
      'imposter',
      p2Pts
    );
    game.session.player2Score = p2Pts;
  }
  await game.session.save();

  // Reveal everything via game:judged broadcast (both see same)
  emitToRoom(nsp, game, 'game:judged', {
    winner: winnerSlot === 'p1' ? 'player1' : 'player2',
    realWord: state.realWord,
    imposterWord: state.words[state.imposterSlot],
    imposterSlot: state.imposterSlot,
    summary: summaryText,
    votes: state.votes,
  });

  /**
   * 🟡 Fix: Personalized result emit — each player sees their OWN result.
   * Old code broadcast a "summary" with "You said the word" to both players,
   * which made the winner see "You said the word" too. Now each gets their
   * own correct framing.
   */
  const p1Rank = await getRank(String(game.session.player1Id), 'overall');
  const p1IsWinner = winnerSlot === 'p1';
  const p1WasImposter = state.imposterSlot === 'p1';
  emitToSlot(nsp, game, 'p1', 'game:result', {
    opponentType: game.isPlayer2AI ? 'ai' : 'human',
    correct: p1IsWinner,
    points: p1Pts,
    newScore: p1Result.newScore,
    streak: 0,
    rank: p1Rank,
    yourWord: state.words.p1,
    realWord: state.realWord,
    youWereImposter: p1WasImposter,
    summary: buildPersonalizedSummary({
      isWinner: p1IsWinner,
      wasImposter: p1WasImposter,
      slipped: state.loserSlot === 'p1',
      realWord: state.realWord,
      yourWord: state.words.p1,
    }),
  });

  if (game.session.player2Id) {
    const p2Rank = await getRank(String(game.session.player2Id), 'overall');
    const p2IsWinner = winnerSlot === 'p2';
    const p2WasImposter = state.imposterSlot === 'p2';
    emitToSlot(nsp, game, 'p2', 'game:result', {
      opponentType: 'human',
      correct: p2IsWinner,
      points: p2Pts,
      newScore: p2Result.newScore,
      streak: 0,
      rank: p2Rank,
      yourWord: state.words.p2,
      realWord: state.realWord,
      youWereImposter: p2WasImposter,
      summary: buildPersonalizedSummary({
        isWinner: p2IsWinner,
        wasImposter: p2WasImposter,
        slipped: state.loserSlot === 'p2',
        realWord: state.realWord,
        yourWord: state.words.p2,
      }),
    });
  }

  gcGame(game.roomKey);
}

/**
 * Build a personalized summary string for one player's result screen.
 * Each player sees a different message based on their own perspective.
 */
function buildPersonalizedSummary(args: {
  isWinner: boolean;
  wasImposter: boolean;
  slipped: boolean;
  realWord: string;
  yourWord: string;
}): string {
  const { isWinner, wasImposter, slipped, realWord, yourWord } = args;

  if (slipped) {
    return `You said "${yourWord}" out loud — instant loss.`;
  }

  if (wasImposter) {
    if (isWinner) {
      return `You were the imposter (your word: "${yourWord}", real word: "${realWord}"). You fooled them!`;
    }
    return `You were the imposter (your word: "${yourWord}", real word: "${realWord}"). They caught you.`;
  }

  // Real-word player
  if (isWinner) {
    return `You had the real word ("${realWord}") and correctly identified the imposter!`;
  }
  return `You had the real word ("${realWord}") but voted wrong — the imposter escaped.`;
}