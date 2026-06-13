/**
 * WORD FORGE GAME HANDLERS
 * ─────────────────────────────────────────────────────────────────
 * Collaborative storytelling game. 30 words total, alternating turns.
 * AI judge picks winner based on quality of contributions.
 *
 * BUG FIXES IN THIS VERSION:
 *
 * 🟠 Fix #1: Per-turn timeout (60s)
 *   BEFORE: No timer. If a player went AFK, opponent stuck forever.
 *           Game session would stay 'active' in Mongo indefinitely.
 *   AFTER:  Each player has 60 seconds to submit a word. If they don't,
 *           opponent wins by forfeit (similar to Debate's auto-skip but
 *           ending the game cleanly instead of awkwardly skipping).
 *
 * 🟠 Fix #2: Judge attribution
 *   BEFORE: Judge prompt asked "which player added more memorable words"
 *           but only got { theme, story } — no per-player word mapping.
 *           So judge was essentially picking randomly between p1/p2.
 *   AFTER:  We track wordsByPlayer: { p1: [], p2: [] } and pass to judge.
 *           Judge can now actually evaluate per-player contribution quality.
 *
 * 🟢 Fix #3: Centralized turn switching
 *   BEFORE: state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1'
 *           repeated in 3 places.
 *   AFTER:  switchTurn(state) helper.
 */

import type { Namespace } from 'socket.io';
import { GameSession } from '../../models/GameSession.model';
import { aiWordForgeMove, judgeJSON } from '../../services/groqService';
import {
  activeGames,
  clearAllTimers,
  currentTurnIsAI,
  emitToRoom,
  emitToSlot,
  forfeitGame,
  gcGame,
  partyOf,
  withGameLock,
  type ActiveGame,
} from '../../services/gameUtils';
import { newRoomKey } from '../../services/matchmaking';
import { applyGameScore } from '../../services/scoring';
import { getRank } from '../../services/leaderboard';
import { logger } from '../../utils/logger';
import { pickBotPersona } from '../../services/groqService';

const WORD_FORGE_MAX_WORDS = 30;
const WORD_FORGE_TURN_TIMEOUT_MS = 60_000;  // NEW: 60s per turn

const THEMES = [
  'Lost in space',
  'A small village by the sea',
  'A magical library',
  'The last robot',
  'A storm at midnight',
  'A forgotten kingdom',
];

interface PlayerInfo {
  userId: string;
  socketId: string;
  displayName: string;
  avatarSeed: string;
}

/* ─────────────────────────── State shape ─────────────────────────── */

interface WordForgeState {
  theme: string;
  story: string;
  currentTurn: 'p1' | 'p2';
  wordCount: number;
  maxWords: number;
  /**
   * 🟠 Fix #2: Track which player contributed which words.
   * Used at finish time to give the AI judge per-player attribution.
   */
  wordsByPlayer: { p1: string[]; p2: string[] };
  /**
   * 🟠 Fix #1: Reference to the current turn timeout so we can cancel it
   * when a word is submitted. Stored separately from game.timers because
   * we need to clear specifically THIS timer (not all of them).
   */
  turnTimeout: NodeJS.Timeout | null;
}

function makeStrangerOpponent(): { name: string; avatarSeed: string } {
  return {
    name: 'Stranger',
    avatarSeed: 'stranger-' + Math.random().toString(36).slice(2, 10),
  };
}

/**
 * 🟢 Fix #3: Centralized turn switch.
 */
function switchTurn(state: WordForgeState): void {
  state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1';
}

/* ─────────────────────────── Game start ─────────────────────────── */

export async function startWordForgeHumanVsHumanGame(
  nsp: Namespace,
  p1: PlayerInfo,
  p2: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('word-forge', 'h');
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];

  const session = await GameSession.create({
    gameType: 'word-forge',
    roomKey,
    player1Id: p1.userId,
    player2Id: p2.userId,
    isPlayer2AI: false,
    status: 'active',
    metadata: { theme, story: '' },
  });

  const state: WordForgeState = {
    theme,
    story: '',
    currentTurn: 'p1',
    wordCount: 0,
    maxWords: WORD_FORGE_MAX_WORDS,
    wordsByPlayer: { p1: [], p2: [] },
    turnTimeout: null,
  };

  const game: ActiveGame = {
    session,
    gameType: 'word-forge',
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
    logger.warn({ roomKey }, 'Word-forge start: socket gone, aborting');
    activeGames.delete(roomKey);
    session.status = 'finished';
    await session.save().catch(() => undefined);
    return;
  }
  p1Socket.join(roomKey);
  p2Socket.join(roomKey);

  emitToSlot(nsp, game, 'p1', 'game:match-found', {
    roomKey,
    gameType: 'word-forge',
    timeLimit: WORD_FORGE_TURN_TIMEOUT_MS / 1000,  // per-turn limit (informational)
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });
  emitToSlot(nsp, game, 'p2', 'game:match-found', {
    roomKey,
    gameType: 'word-forge',
    timeLimit: WORD_FORGE_TURN_TIMEOUT_MS / 1000,
    youAreSlot: 'p2',
    opponent: makeStrangerOpponent(),
    youAre: { name: p2.displayName, avatarSeed: p2.avatarSeed },
  });

  emitToRoom(nsp, game, 'game:metadata', {
    kind: 'word-forge-init',
    theme,
    story: '',
    currentTurn: 'p1',
    wordCount: 0,
    maxWords: WORD_FORGE_MAX_WORDS,
  });

  // 🟠 Fix #1: Start turn timer for p1
  startTurnTimeout(nsp, game);
}

export async function startWordForgeAIGame(
  nsp: Namespace,
  p1: PlayerInfo
): Promise<void> {
  const roomKey = newRoomKey('word-forge', 'ai');
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  const persona = pickBotPersona();

  const session = await GameSession.create({
    gameType: 'word-forge',
    roomKey,
    player1Id: p1.userId,
    player2Id: null,
    isPlayer2AI: true,
    status: 'active',
    metadata: { theme, story: '' },
  });

  const state: WordForgeState = {
    theme,
    story: '',
    currentTurn: 'p1',
    wordCount: 0,
    maxWords: WORD_FORGE_MAX_WORDS,
    wordsByPlayer: { p1: [], p2: [] },
    turnTimeout: null,
  };

  const game: ActiveGame = {
    session,
    gameType: 'word-forge',
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
    gameType: 'word-forge',
    timeLimit: WORD_FORGE_TURN_TIMEOUT_MS / 1000,
    youAreSlot: 'p1',
    opponent: makeStrangerOpponent(),
    youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
  });

  emitToRoom(nsp, game, 'game:metadata', {
    kind: 'word-forge-init',
    theme,
    story: '',
    currentTurn: 'p1',
    wordCount: 0,
    maxWords: WORD_FORGE_MAX_WORDS,
  });

  startTurnTimeout(nsp, game);
}

/* ─────────────────────────── Turn timeout ─────────────────────────── */

/**
 * 🟠 Fix #1: Per-turn timeout.
 *
 * Each turn has 60 seconds. If the active player doesn't submit a word in time,
 * they forfeit and the opponent wins.
 *
 * Why forfeit instead of "skip turn"? Because in a 30-word game, skipping
 * keeps the AFK player in the loop indefinitely. Better to end cleanly with
 * a clear winner.
 */
function startTurnTimeout(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as WordForgeState;

  // Clear any existing turn timer (should already be null but defensive)
  if (state.turnTimeout) {
    clearTimeout(state.turnTimeout);
    state.turnTimeout = null;
  }

  state.turnTimeout = setTimeout(async () => {
    if (game.finished) return;
    // The active player ran out of time. They forfeit; opponent wins.
    const survivorSlot: 'p1' | 'p2' = state.currentTurn === 'p1' ? 'p2' : 'p1';

    logger.info(
      { roomKey: game.roomKey, slot: state.currentTurn },
      'Word-forge turn timeout — forfeiting'
    );

    // Notify both players what happened (informational; they'll see the result anyway)
    emitToRoom(nsp, game, 'game:metadata', {
      kind: 'word-forge-timeout',
      timedOutSlot: state.currentTurn,
    });

    await forfeitGame(nsp, game, survivorSlot);
  }, WORD_FORGE_TURN_TIMEOUT_MS);

  // Also push to game.timers so clearAllTimers (on game finish) catches it
  game.timers.push(state.turnTimeout);
}

function clearTurnTimeout(state: WordForgeState): void {
  if (state.turnTimeout) {
    clearTimeout(state.turnTimeout);
    state.turnTimeout = null;
  }
}

/* ─────────────────────────── Move handler ─────────────────────────── */

export async function handleWordForgeMove(
  nsp: Namespace,
  game: ActiveGame,
  fromUserId: string,
  word: string
): Promise<void> {
  if (game.finished) return;
  const slot = partyOf(game, fromUserId);
  if (!slot) return;

  const state = game.state as unknown as WordForgeState;
  if (state.currentTurn !== slot) return; // not your turn

  // Sanitize input
  const w =
    (word || '').trim().split(/\s+/)[0]?.replace(/[^a-zA-Z'-]/g, '') || '';
  if (!w) return;

  /**
   * 🔴 Race protection (same pattern as Debate):
   * If turn timeout is firing simultaneously with a player submission,
   * we don't want both to mutate state. The lock serializes them.
   */
  const lockResult = await withGameLock(game, async (): Promise<{ shouldFinish: boolean } | undefined> => {
    if (game.finished) return undefined;

    // Cancel turn timeout (player submitted in time)
    clearTurnTimeout(state);

    // Apply move
    state.story = (state.story + ' ' + w).trim();
    state.wordCount += 1;
    state.wordsByPlayer[slot].push(w); // 🟠 Fix #2: track per-player
    switchTurn(state);

    game.session.metadata = {
      theme: state.theme,
      story: state.story,
      wordsByPlayer: state.wordsByPlayer,
    };
    await game.session.save();

    emitToRoom(nsp, game, 'game:word-added', {
      word: w,
      story: state.story,
      by: slot,
      wordCount: state.wordCount,
      maxWords: state.maxWords,
      currentTurn: state.currentTurn,
    });

    return { shouldFinish: state.wordCount >= state.maxWords };
  });

  if (!lockResult.ran || !lockResult.result) return;

  if (lockResult.result.shouldFinish) {
    await finishWordForge(nsp, game);
    return;
  }

  // Schedule AI's turn if next is AI, else start timer for next human turn
  if (currentTurnIsAI(game)) {
    scheduleAIWordForgeMove(nsp, game);
  } else {
    startTurnTimeout(nsp, game);
  }
}

/* ─────────────────────────── AI move ─────────────────────────── */

function scheduleAIWordForgeMove(nsp: Namespace, game: ActiveGame): void {
  const state = game.state as unknown as WordForgeState;
  const delay = 800 + Math.random() * 1500;

  const t = setTimeout(async () => {
    if (game.finished) return;
    let aiWord: string;
    try {
      aiWord = await aiWordForgeMove(state.theme, state.story);
    } catch (err) {
      logger.error({ err }, 'AI word-forge move failed, using fallback');
      aiWord = 'and';
    }
    await applyAIWordForgeMove(nsp, game, aiWord);
  }, delay);

  game.timers.push(t);
}

async function applyAIWordForgeMove(
  nsp: Namespace,
  game: ActiveGame,
  word: string
): Promise<void> {
  if (game.finished) return;

  const lockResult = await withGameLock(game, async (): Promise<{ shouldFinish: boolean } | undefined> => {
    if (game.finished) return undefined;

    const state = game.state as unknown as WordForgeState;
    if (state.currentTurn !== 'p2' || !game.isPlayer2AI) return undefined;

    state.story = (state.story + ' ' + word).trim();
    state.wordCount += 1;
    state.wordsByPlayer.p2.push(word); // 🟠 Fix #2: track AI words too
    state.currentTurn = 'p1';

    game.session.metadata = {
      theme: state.theme,
      story: state.story,
      wordsByPlayer: state.wordsByPlayer,
    };
    await game.session.save();

    emitToRoom(nsp, game, 'game:word-added', {
      word,
      story: state.story,
      by: 'p2',
      wordCount: state.wordCount,
      maxWords: state.maxWords,
      currentTurn: state.currentTurn,
    });

    return { shouldFinish: state.wordCount >= state.maxWords };
  });

  if (!lockResult.ran || !lockResult.result) return;

  if (lockResult.result.shouldFinish) {
    await finishWordForge(nsp, game);
  } else {
    // Next turn is p1 (human) — start their turn timer
    startTurnTimeout(nsp, game);
  }
}

/* ─────────────────────────── Finish ─────────────────────────── */

async function finishWordForge(nsp: Namespace, game: ActiveGame): Promise<void> {
  if (game.finished) return;
  game.finished = true;
  clearAllTimers(game);

  const state = game.state as unknown as WordForgeState;
  game.session.status = 'finished';
  game.session.finishedAt = new Date();
  await game.session.save();

  /**
   * 🟠 Fix #2: Pass per-player word lists to the judge.
   *
   * Previously: judge got only { theme, story }. It had no idea which player
   * contributed which words, so its "winner" pick was effectively random.
   *
   * Now: judge sees both the final story AND each player's word list. It can
   * actually compare contribution quality.
   */
  const judged = await judgeJSON<{
    creativity: number;
    coherence: number;
    winner: 'player1' | 'player2' | 'draw';
    summary: string;
  }>(
    'Score this collaborative one-word-at-a-time story on creativity (0-100) and coherence (0-100). The wordsByPlayer field tells you exactly which words each player contributed. Pick a winner based on which player added more memorable, surprising, story-advancing words. If contributions feel even, return "draw".',
    {
      theme: state.theme,
      story: state.story,
      wordsByPlayer: state.wordsByPlayer, // 🟠 NEW
    },
    '{ "creativity": <0-100>, "coherence": <0-100>, "winner": "player1"|"player2"|"draw", "summary": "<one sentence>" }'
  );

  const result = judged ?? {
    creativity: 50,
    coherence: 50,
    winner: 'draw' as const,
    summary: "Couldn't reach the judge.",
  };

  const p1Pts = result.winner === 'player1' ? 15 : result.winner === 'draw' ? 8 : 5;
  const p2Pts = result.winner === 'player2' ? 15 : result.winner === 'draw' ? 8 : 5;

  const p1Result = await applyGameScore(
    String(game.session.player1Id),
    'word-forge',
    p1Pts
  );
  game.session.player1Score = p1Pts;

  let p2Result = { newScore: 0 };
  if (game.session.player2Id) {
    p2Result = await applyGameScore(
      String(game.session.player2Id),
      'word-forge',
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