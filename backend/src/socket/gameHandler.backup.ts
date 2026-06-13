// import type { Namespace, Socket } from 'socket.io';
// import { GameSession, type IGameSession, type GameType } from '../models/GameSession.model';
// import {
//   tryMatchHuman,
//   enqueue,
//   dequeue,
//   newRoomKey,
// } from '../services/matchmaking';
// import { applyTuringScore, applyGameScore } from '../services/scoring';
// import { getRank } from '../services/leaderboard';
// import {
//   deceptiveHumanReply,
//   pickBotPersona,
//   pickDebateTopic,
//   pickSecretWord,
//   aiWordForgeMove,
//   aiDebateArgument,
//   aiImposterDescription,
//   aiInterrogationAnswer,
//   judgeJSON,
//   type ChatTurn,
//   type BotPersona,
// } from '../services/groqService';
// import { logger } from '../utils/logger';

// /* ─────────────────────────── Constants ─────────────────────────── */

// const AI_FALLBACK_DELAY_MS = 15_000; // wait this long for a human before pairing with AI

// const TURING_DURATION = 60;        // seconds total
// const WORD_FORGE_MAX_WORDS = 30;   // story length before judging
// const DEBATE_MAX_ROUNDS = 4;       // 2 per player, alternating
// const DEBATE_SECONDS_PER_ROUND = 30;
// const IMPOSTER_MAX_TURNS = 6;      // 3 clues each, alternating
// const INTERROGATION_QUESTIONS = 5;

// const VALID_GAME_TYPES: GameType[] = [
//   'turing',
//   'word-forge',
//   'debate',
//   'imposter',
//   'interrogation',
// ];

// /* ─────────────────────────── Active-game state ─────────────────────────── */

// interface ActiveGame {
//   session: IGameSession;
//   gameType: GameType;
//   roomKey: string;
//   player1SocketId: string;
//   player2SocketId: string | null; // null when AI
//   isPlayer2AI: boolean;
//   aiPersona: BotPersona | null;
//   startedAt: number;
//   finished: boolean;
//   timers: NodeJS.Timeout[];
//   state: Record<string, unknown>;
// }

// const activeGames = new Map<string, ActiveGame>(); // roomKey → ActiveGame

// /** userId → pending AI-fallback timer (per game type tracked via map key) */
// const pendingAIMatches = new Map<string, NodeJS.Timeout>();
// const pendingKey = (userId: string, gameType: string) => `${gameType}:${userId}`;

// /* ─────────────────────────── Helpers ─────────────────────────── */

// function clearAllTimers(game: ActiveGame): void {
//   for (const t of game.timers) {
//     clearTimeout(t);
//     clearInterval(t);
//   }
//   game.timers = [];
// }

// function gcGame(roomKey: string, delayMs = 30_000): void {
//   setTimeout(() => activeGames.delete(roomKey), delayMs);
// }

// function partyOf(game: ActiveGame, userId: string): 'p1' | 'p2' | null {
//   if (String(game.session.player1Id) === userId) return 'p1';
//   if (game.session.player2Id && String(game.session.player2Id) === userId) return 'p2';
//   return null;
// }

// function socketIdOf(game: ActiveGame, slot: 'p1' | 'p2'): string | null {
//   return slot === 'p1' ? game.player1SocketId : game.player2SocketId;
// }

// function emitToSlot(
//   nsp: Namespace,
//   game: ActiveGame,
//   slot: 'p1' | 'p2',
//   event: string,
//   payload: unknown
// ): void {
//   const sid = socketIdOf(game, slot);
//   if (sid) nsp.to(sid).emit(event, payload);
// }

// function emitToRoom(
//   nsp: Namespace,
//   game: ActiveGame,
//   event: string,
//   payload: unknown
// ): void {
//   nsp.to(game.roomKey).emit(event, payload);
// }

// function clearPendingAIMatch(userId: string, gameType: string): void {
//   const key = pendingKey(userId, gameType);
//   const t = pendingAIMatches.get(key);
//   if (t) {
//     clearTimeout(t);
//     pendingAIMatches.delete(key);
//   }
// }

// function clearAllPendingForUser(userId: string): void {
//   for (const gt of VALID_GAME_TYPES) clearPendingAIMatch(userId, gt);
// }

// /* ─────────────────────────── Game start ─────────────────────────── */

// interface PlayerInfo {
//   userId: string;
//   socketId: string;
//   displayName: string;
//   avatarSeed: string;
// }

// async function startHumanVsHumanGame(
//   nsp: Namespace,
//   gameType: GameType,
//   p1: PlayerInfo,
//   p2: PlayerInfo
// ): Promise<void> {
//   const roomKey = newRoomKey(gameType, 'h');

//   const session = await GameSession.create({
//     gameType,
//     roomKey,
//     player1Id: p1.userId,
//     player2Id: p2.userId,
//     isPlayer2AI: false,
//     status: 'active',
//   });

//   const game: ActiveGame = {
//     session,
//     gameType,
//     roomKey,
//     player1SocketId: p1.socketId,
//     player2SocketId: p2.socketId,
//     isPlayer2AI: false,
//     aiPersona: null,
//     startedAt: Date.now(),
//     finished: false,
//     timers: [],
//     state: {},
//   };
//   activeGames.set(roomKey, game);

//   // Both sockets join the room
//   nsp.sockets.get(p1.socketId)?.join(roomKey);
//   nsp.sockets.get(p2.socketId)?.join(roomKey);

//   // Tell each side what's happening (their opponent is shown as "Stranger" so neither can tell)
//   emitToSlot(nsp, game, 'p1', 'game:match-found', {
//     roomKey,
//     gameType,
//     timeLimit: TURING_DURATION,
//     youAreSlot: 'p1',
//     opponent: { name: 'Stranger', avatarSeed: 'stranger-' + Math.random().toString(36).slice(2, 8) },
//     youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
//   });
//   emitToSlot(nsp, game, 'p2', 'game:match-found', {
//     roomKey,
//     gameType,
//     timeLimit: TURING_DURATION,
//     youAreSlot: 'p2',
//     opponent: { name: 'Stranger', avatarSeed: 'stranger-' + Math.random().toString(36).slice(2, 8) },
//     youAre: { name: p2.displayName, avatarSeed: p2.avatarSeed },
//   });

//   await initGameSpecific(nsp, game);
// }

// async function startAIGame(
//   nsp: Namespace,
//   gameType: GameType,
//   p1: PlayerInfo
// ): Promise<void> {
//   const roomKey = newRoomKey(gameType, 'ai');
//   const persona = pickBotPersona();

//   const session = await GameSession.create({
//     gameType,
//     roomKey,
//     player1Id: p1.userId,
//     player2Id: null,
//     isPlayer2AI: true,
//     status: 'active',
//   });

//   const game: ActiveGame = {
//     session,
//     gameType,
//     roomKey,
//     player1SocketId: p1.socketId,
//     player2SocketId: null,
//     isPlayer2AI: true,
//     aiPersona: persona,
//     startedAt: Date.now(),
//     finished: false,
//     timers: [],
//     state: {},
//   };
//   activeGames.set(roomKey, game);
//   nsp.sockets.get(p1.socketId)?.join(roomKey);

//   emitToSlot(nsp, game, 'p1', 'game:match-found', {
//     roomKey,
//     gameType,
//     timeLimit: TURING_DURATION,
//     youAreSlot: 'p1',
//     opponent: { name: persona.handle, avatarSeed: persona.handle },
//     youAre: { name: p1.displayName, avatarSeed: p1.avatarSeed },
//   });

//   await initGameSpecific(nsp, game);
// }

// async function initGameSpecific(nsp: Namespace, game: ActiveGame): Promise<void> {
//   switch (game.gameType) {
//     case 'turing':
//       game.state = { votes: { p1: null, p2: null }, aiHistory: [] };
//       startTuringTimer(nsp, game);
//       break;

//     case 'word-forge': {
//       const themes = [
//         'Lost in space',
//         'A small village by the sea',
//         'A magical library',
//         'The last robot',
//         'A storm at midnight',
//         'A forgotten kingdom',
//       ];
//       const theme = themes[Math.floor(Math.random() * themes.length)];
//       game.state = {
//         theme,
//         story: '',
//         currentTurn: 'p1',
//         wordCount: 0,
//         maxWords: WORD_FORGE_MAX_WORDS,
//       };
//       game.session.metadata = { theme, story: '' };
//       await game.session.save();
//       emitToRoom(nsp, game, 'game:metadata', {
//         kind: 'word-forge-init',
//         theme,
//         story: '',
//         currentTurn: 'p1',
//         wordCount: 0,
//         maxWords: WORD_FORGE_MAX_WORDS,
//       });
//       break;
//     }

//     case 'debate': {
//       const topic = await pickDebateTopic();
//       const p1Side = Math.random() < 0.5 ? 'pro' : 'con';
//       const p2Side: 'pro' | 'con' = p1Side === 'pro' ? 'con' : 'pro';
//       game.state = {
//         topic,
//         sides: { p1: p1Side, p2: p2Side },
//         round: 1,
//         currentTurn: 'p1',
//         history: [] as { author: 'p1' | 'p2'; content: string }[],
//       };
//       game.session.metadata = { topic, sides: { p1: p1Side, p2: p2Side } };
//       await game.session.save();

//       // Personalized payloads so each player knows their own side
//       emitToSlot(nsp, game, 'p1', 'game:metadata', {
//         kind: 'debate-init',
//         topic,
//         yourSide: p1Side,
//         opponentSide: p2Side,
//         currentTurn: 'p1',
//         round: 1,
//         maxRounds: DEBATE_MAX_ROUNDS,
//         secondsPerRound: DEBATE_SECONDS_PER_ROUND,
//       });
//       emitToSlot(nsp, game, 'p2', 'game:metadata', {
//         kind: 'debate-init',
//         topic,
//         yourSide: p2Side,
//         opponentSide: p1Side,
//         currentTurn: 'p1',
//         round: 1,
//         maxRounds: DEBATE_MAX_ROUNDS,
//         secondsPerRound: DEBATE_SECONDS_PER_ROUND,
//       });

//       startDebateRoundTimer(nsp, game);
//       // p1 always opens; if p1 is AI (never in current matchmaking but defensive), do the move
//       if (currentTurnIsAI(game)) void scheduleAIDebateMove(nsp, game);
//       break;
//     }

//     case 'imposter': {
//       const word = await pickSecretWord();
//       game.state = {
//         word,
//         turnIdx: 0,
//         maxTurns: IMPOSTER_MAX_TURNS,
//         currentTurn: 'p1',
//         history: [] as { author: 'p1' | 'p2'; content: string }[],
//         loserSlot: null as 'p1' | 'p2' | null,
//       };
//       game.session.metadata = { word };
//       await game.session.save();
//       emitToRoom(nsp, game, 'game:metadata', {
//         kind: 'imposter-init',
//         word,
//         currentTurn: 'p1',
//         turnIdx: 0,
//         maxTurns: IMPOSTER_MAX_TURNS,
//       });
//       // p1 is always human; AI starts only if currentTurn is p2 and AI
//       break;
//     }

//     case 'interrogation': {
//       game.state = {
//         questionIdx: 0,
//         maxQuestions: INTERROGATION_QUESTIONS,
//         exchanges: [] as { question: string; answer: string }[],
//         voted: false,
//         history: [] as ChatTurn[],
//       };
//       // Personalized roles: p1 always interrogates, p2 (or AI) answers.
//       emitToSlot(nsp, game, 'p1', 'game:metadata', {
//         kind: 'interrogation-init',
//         role: 'interrogator',
//         maxQuestions: INTERROGATION_QUESTIONS,
//         questionIdx: 0,
//       });
//       if (!game.isPlayer2AI) {
//         emitToSlot(nsp, game, 'p2', 'game:metadata', {
//           kind: 'interrogation-init',
//           role: 'answerer',
//           maxQuestions: INTERROGATION_QUESTIONS,
//           questionIdx: 0,
//         });
//       }
//       break;
//     }
//   }
// }

// function currentTurnIsAI(game: ActiveGame): boolean {
//   if (!game.isPlayer2AI) return false;
//   const s = game.state as { currentTurn?: 'p1' | 'p2'; turn?: 'p1' | 'p2' };
//   const ct = s.currentTurn ?? s.turn;
//   return ct === 'p2';
// }

// /* ─────────────────────────── Turing ─────────────────────────── */

// function startTuringTimer(nsp: Namespace, game: ActiveGame): void {
//   let secondsLeft = TURING_DURATION;
//   const interval = setInterval(() => {
//     if (game.finished) return;
//     secondsLeft -= 1;
//     emitToRoom(nsp, game, 'game:timer', { secondsLeft });
//     if (secondsLeft <= 0) {
//       clearInterval(interval);
//       game.session.status = 'voting';
//       void game.session.save();
//       emitToRoom(nsp, game, 'game:vote-phase', {});
//       // Auto-finalize 30s after vote phase begins so a no-vote doesn't hang the game
//       const auto = setTimeout(() => void finishTuringGame(nsp, game), 30_000);
//       game.timers.push(auto);
//     }
//   }, 1000);
//   game.timers.push(interval);
// }

// async function handleTuringMessage(
//   nsp: Namespace,
//   game: ActiveGame,
//   fromUserId: string,
//   text: string
// ): Promise<void> {
//   if (game.session.status !== 'active') return;

//   const slot = partyOf(game, fromUserId);
//   if (!slot) return;

//   game.session.messages.push({
//     senderId: fromUserId,
//     senderName: slot,
//     content: text,
//     timestamp: new Date(),
//   });
//   await game.session.save();

//   emitToRoom(nsp, game, 'game:message', {
//     senderId: fromUserId,
//     content: text,
//     senderName: slot,
//     senderType: 'human',
//     timestamp: new Date().toISOString(),
//   });

//   // AI reply if opponent is AI
//   if (game.isPlayer2AI && slot === 'p1' && game.aiPersona) {
//     const state = game.state as { aiHistory: ChatTurn[] };
//     state.aiHistory.push({ role: 'user', content: text });

//     const delayMs = 1100 + Math.random() * 2400;
//     const t = setTimeout(async () => {
//       if (game.finished || game.session.status !== 'active') return;
//       try {
//         const reply = await deceptiveHumanReply(state.aiHistory, game.aiPersona!);
//         state.aiHistory.push({ role: 'assistant', content: reply });
//         game.session.messages.push({
//           senderId: 'ai-opponent',
//           senderName: 'opponent',
//           content: reply,
//           timestamp: new Date(),
//         });
//         await game.session.save();
//         emitToRoom(nsp, game, 'game:message', {
//           senderId: 'ai-opponent',
//           content: reply,
//           senderName: 'opponent',
//           senderType: 'opponent',
//           timestamp: new Date().toISOString(),
//         });
//       } catch (err) {
//         logger.error({ err }, 'Turing AI reply failed');
//       }
//     }, delayMs);
//     game.timers.push(t);
//   }
// }

// async function handleTuringVote(
//   nsp: Namespace,
//   game: ActiveGame,
//   fromUserId: string,
//   vote: 'human' | 'ai'
// ): Promise<void> {
//   const slot = partyOf(game, fromUserId);
//   if (!slot) return;
//   const state = game.state as {
//     votes: { p1: 'human' | 'ai' | null; p2: 'human' | 'ai' | null };
//   };
//   state.votes[slot] = vote;

//   if (game.isPlayer2AI) {
//     // No second voter — finish as soon as p1 votes
//     state.votes.p2 = 'human';
//     await finishTuringGame(nsp, game);
//   } else if (state.votes.p1 && state.votes.p2) {
//     await finishTuringGame(nsp, game);
//   }
// }

// async function finishTuringGame(nsp: Namespace, game: ActiveGame): Promise<void> {
//   if (game.finished) return;
//   game.finished = true;
//   clearAllTimers(game);

//   const session = game.session;
//   const state = game.state as {
//     votes: { p1: 'human' | 'ai' | null; p2: 'human' | 'ai' | null };
//   };

//   session.player1Vote = state.votes.p1;
//   session.player2Vote = state.votes.p2;
//   session.status = 'finished';
//   session.finishedAt = new Date();
//   session.duration = Math.round((Date.now() - game.startedAt) / 1000);

//   // Player 1 (always human in current matchmaking)
//   const p1Correct = state.votes.p1 === (session.isPlayer2AI ? 'ai' : 'human');
//   const p1FooledOpp = !session.isPlayer2AI && state.votes.p2 === 'ai';
//   const p1Result = await applyTuringScore({
//     userId: String(session.player1Id),
//     guessedCorrectly: p1Correct,
//     fooledOpponent: p1FooledOpp,
//   });
//   session.player1Score = p1Result.delta;

//   let p2Result = { delta: 0, newScore: 0, streak: 0 };
//   if (!session.isPlayer2AI && session.player2Id) {
//     const p2Correct = state.votes.p2 === 'human';
//     const p2FooledOpp = state.votes.p1 === 'ai';
//     p2Result = await applyTuringScore({
//       userId: String(session.player2Id),
//       guessedCorrectly: p2Correct,
//       fooledOpponent: p2FooledOpp,
//     });
//     session.player2Score = p2Result.delta;
//   }
//   await session.save();

//   // Personalized results
//   const p1Rank = await getRank(String(session.player1Id), 'overall');
//   emitToSlot(nsp, game, 'p1', 'game:result', {
//     opponentType: session.isPlayer2AI ? 'ai' : 'human',
//     yourVote: state.votes.p1,
//     correct: p1Correct,
//     points: p1Result.delta,
//     newScore: p1Result.newScore,
//     streak: p1Result.streak,
//     rank: p1Rank,
//   });

//   if (!session.isPlayer2AI && session.player2Id) {
//     const p2Rank = await getRank(String(session.player2Id), 'overall');
//     const p2Correct = state.votes.p2 === 'human';
//     emitToSlot(nsp, game, 'p2', 'game:result', {
//       opponentType: 'human',
//       yourVote: state.votes.p2,
//       correct: p2Correct,
//       points: p2Result.delta,
//       newScore: p2Result.newScore,
//       streak: p2Result.streak,
//       rank: p2Rank,
//     });
//   }

//   gcGame(game.roomKey);
// }

// /* ─────────────────────────── Word Forge ─────────────────────────── */

// async function handleWordForgeMove(
//   nsp: Namespace,
//   game: ActiveGame,
//   fromUserId: string,
//   word: string
// ): Promise<void> {
//   if (game.finished) return;
//   const slot = partyOf(game, fromUserId);
//   if (!slot) return;
//   const state = game.state as {
//     theme: string;
//     story: string;
//     currentTurn: 'p1' | 'p2';
//     wordCount: number;
//     maxWords: number;
//   };
//   if (state.currentTurn !== slot) return; // not your turn

//   const w = (word || '').trim().split(/\s+/)[0]?.replace(/[^a-zA-Z'-]/g, '') || '';
//   if (!w) return;

//   state.story = (state.story + ' ' + w).trim();
//   state.wordCount += 1;
//   state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1';

//   game.session.metadata = { theme: state.theme, story: state.story };
//   await game.session.save();

//   emitToRoom(nsp, game, 'game:word-added', {
//     word: w,
//     story: state.story,
//     by: slot,
//     wordCount: state.wordCount,
//     maxWords: state.maxWords,
//     currentTurn: state.currentTurn,
//   });

//   if (state.wordCount >= state.maxWords) {
//     await finishWordForge(nsp, game);
//     return;
//   }

//   // If next turn is AI, schedule AI move
//   if (currentTurnIsAI(game)) {
//     const delay = 800 + Math.random() * 1500;
//     const t = setTimeout(async () => {
//       if (game.finished) return;
//       try {
//         const aiWord = await aiWordForgeMove(state.theme, state.story);
//         await handleAIWordForgeMove(nsp, game, aiWord);
//       } catch (err) {
//         logger.error({ err }, 'AI word-forge move failed');
//       }
//     }, delay);
//     game.timers.push(t);
//   }
// }

// async function handleAIWordForgeMove(
//   nsp: Namespace,
//   game: ActiveGame,
//   word: string
// ): Promise<void> {
//   const state = game.state as {
//     theme: string;
//     story: string;
//     currentTurn: 'p1' | 'p2';
//     wordCount: number;
//     maxWords: number;
//   };
//   if (state.currentTurn !== 'p2' || !game.isPlayer2AI) return;
//   state.story = (state.story + ' ' + word).trim();
//   state.wordCount += 1;
//   state.currentTurn = 'p1';

//   game.session.metadata = { theme: state.theme, story: state.story };
//   await game.session.save();

//   emitToRoom(nsp, game, 'game:word-added', {
//     word,
//     story: state.story,
//     by: 'p2',
//     wordCount: state.wordCount,
//     maxWords: state.maxWords,
//     currentTurn: state.currentTurn,
//   });

//   if (state.wordCount >= state.maxWords) {
//     await finishWordForge(nsp, game);
//   }
// }

// async function finishWordForge(nsp: Namespace, game: ActiveGame): Promise<void> {
//   if (game.finished) return;
//   game.finished = true;
//   clearAllTimers(game);
//   const state = game.state as { theme: string; story: string };
//   game.session.status = 'finished';
//   game.session.finishedAt = new Date();
//   await game.session.save();

//   const judged = await judgeJSON<{
//     creativity: number;
//     coherence: number;
//     winner: 'player1' | 'player2' | 'draw';
//     summary: string;
//   }>(
//     'Score this collaborative one-word-at-a-time story on creativity (0-100) and coherence (0-100). Then pick the winner based on which player added more memorable, surprising, story-advancing words. If contributions feel even, return "draw".',
//     { theme: state.theme, story: state.story },
//     '{ "creativity": <0-100>, "coherence": <0-100>, "winner": "player1"|"player2"|"draw", "summary": "<one sentence>" }'
//   );

//   const result = judged ?? { creativity: 50, coherence: 50, winner: 'draw' as const, summary: 'Couldn\'t reach the judge.' };

//   // Apply scores
//   const p1Pts = result.winner === 'player1' ? 15 : result.winner === 'draw' ? 8 : 5;
//   const p2Pts = result.winner === 'player2' ? 15 : result.winner === 'draw' ? 8 : 5;
//   const p1Result = await applyGameScore(String(game.session.player1Id), 'word-forge', p1Pts);
//   game.session.player1Score = p1Pts;
//   let p2Result = { newScore: 0 };
//   if (game.session.player2Id) {
//     p2Result = await applyGameScore(String(game.session.player2Id), 'word-forge', p2Pts);
//     game.session.player2Score = p2Pts;
//   }
//   await game.session.save();

//   emitToRoom(nsp, game, 'game:judged', result);
//   const p1Rank = await getRank(String(game.session.player1Id), 'overall');
//   emitToSlot(nsp, game, 'p1', 'game:result', {
//     opponentType: game.isPlayer2AI ? 'ai' : 'human',
//     correct: result.winner === 'player1',
//     points: p1Pts,
//     newScore: p1Result.newScore,
//     streak: 0,
//     rank: p1Rank,
//     summary: result.summary,
//   });
//   if (game.session.player2Id) {
//     const p2Rank = await getRank(String(game.session.player2Id), 'overall');
//     emitToSlot(nsp, game, 'p2', 'game:result', {
//       opponentType: 'human',
//       correct: result.winner === 'player2',
//       points: p2Pts,
//       newScore: p2Result.newScore,
//       streak: 0,
//       rank: p2Rank,
//       summary: result.summary,
//     });
//   }
//   gcGame(game.roomKey);
// }

// /* ─────────────────────────── Debate ─────────────────────────── */

// function startDebateRoundTimer(nsp: Namespace, game: ActiveGame): void {
//   let secondsLeft = DEBATE_SECONDS_PER_ROUND;
//   const state = game.state as {
//     round: number;
//     currentTurn: 'p1' | 'p2';
//   };
//   const interval = setInterval(() => {
//     if (game.finished) {
//       clearInterval(interval);
//       return;
//     }
//     secondsLeft -= 1;
//     emitToRoom(nsp, game, 'game:timer', {
//       secondsLeft,
//       round: state.round,
//       currentTurn: state.currentTurn,
//     });
//     if (secondsLeft <= 0) {
//       clearInterval(interval);
//       // Auto-skip if no message
//       void advanceDebate(nsp, game, null);
//     }
//   }, 1000);
//   game.timers.push(interval);
// }

// async function handleDebateMessage(
//   nsp: Namespace,
//   game: ActiveGame,
//   fromUserId: string,
//   content: string
// ): Promise<void> {
//   if (game.finished) return;
//   const slot = partyOf(game, fromUserId);
//   if (!slot) return;
//   const state = game.state as {
//     currentTurn: 'p1' | 'p2';
//     history: { author: 'p1' | 'p2'; content: string }[];
//   };
//   if (state.currentTurn !== slot) return; // not your turn
//   await advanceDebate(nsp, game, content);
// }

// async function advanceDebate(
//   nsp: Namespace,
//   game: ActiveGame,
//   content: string | null
// ): Promise<void> {
//   if (game.finished) return;
//   clearAllTimers(game);

//   const state = game.state as {
//     topic: string;
//     sides: { p1: 'pro' | 'con'; p2: 'pro' | 'con' };
//     round: number;
//     currentTurn: 'p1' | 'p2';
//     history: { author: 'p1' | 'p2'; content: string }[];
//   };

//   const author = state.currentTurn;
//   const argument = content?.trim() || '(skipped — time ran out)';
//   state.history.push({ author, content: argument });

//   game.session.messages.push({
//     senderId: author === 'p1' ? String(game.session.player1Id) : (game.session.player2Id ? String(game.session.player2Id) : 'ai-opponent'),
//     senderName: author,
//     content: argument,
//     timestamp: new Date(),
//   });
//   await game.session.save();

//   emitToRoom(nsp, game, 'game:debate-argument', {
//     author,
//     content: argument,
//     round: state.round,
//   });

//   // Advance turn or finish
//   if (state.round >= DEBATE_MAX_ROUNDS) {
//     await finishDebate(nsp, game);
//     return;
//   }

//   state.round += 1;
//   state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1';
//   emitToRoom(nsp, game, 'game:debate-turn', {
//     round: state.round,
//     currentTurn: state.currentTurn,
//   });

//   // Restart timer for next round
//   startDebateRoundTimer(nsp, game);

//   // If next turn is AI, schedule its move
//   if (currentTurnIsAI(game)) {
//     void scheduleAIDebateMove(nsp, game);
//   }
// }

// async function scheduleAIDebateMove(nsp: Namespace, game: ActiveGame): Promise<void> {
//   const state = game.state as {
//     topic: string;
//     sides: { p1: 'pro' | 'con'; p2: 'pro' | 'con' };
//     history: { author: 'p1' | 'p2'; content: string }[];
//   };
//   const delay = 2500 + Math.random() * 4000; // think for a couple seconds
//   const t = setTimeout(async () => {
//     if (game.finished) return;
//     try {
//       const chatHistory: ChatTurn[] = state.history.map((h) => ({
//         role: h.author === 'p2' ? 'assistant' : 'user',
//         content: h.content,
//       }));
//       const reply = await aiDebateArgument(
//         state.topic,
//         state.sides.p2,
//         game.aiPersona!,
//         chatHistory
//       );
//       await advanceDebate(nsp, game, reply);
//     } catch (err) {
//       logger.error({ err }, 'AI debate move failed');
//       await advanceDebate(nsp, game, '(skipped)');
//     }
//   }, delay);
//   game.timers.push(t);
// }

// async function finishDebate(nsp: Namespace, game: ActiveGame): Promise<void> {
//   if (game.finished) return;
//   game.finished = true;
//   clearAllTimers(game);
//   const state = game.state as {
//     topic: string;
//     sides: { p1: 'pro' | 'con'; p2: 'pro' | 'con' };
//     history: { author: 'p1' | 'p2'; content: string }[];
//   };
//   game.session.status = 'finished';
//   game.session.finishedAt = new Date();
//   await game.session.save();

//   const judged = await judgeJSON<{
//     winner: 'player1' | 'player2' | 'draw';
//     p1_score: number;
//     p2_score: number;
//     summary: string;
//   }>(
//     'Judge this rapid-fire debate. Score each player 0-100 on argument quality (logic, persuasiveness, responsiveness to opponent). Pick a winner. Be fair to both sides.',
//     {
//       topic: state.topic,
//       p1_side: state.sides.p1,
//       p2_side: state.sides.p2,
//       transcript: state.history,
//     },
//     '{ "winner": "player1"|"player2"|"draw", "p1_score": <0-100>, "p2_score": <0-100>, "summary": "<one sentence>" }'
//   );

//   const result = judged ?? { winner: 'draw' as const, p1_score: 50, p2_score: 50, summary: 'Couldn\'t reach the judge.' };

//   const p1Pts = result.winner === 'player1' ? 15 : result.winner === 'draw' ? 8 : 5;
//   const p2Pts = result.winner === 'player2' ? 15 : result.winner === 'draw' ? 8 : 5;
//   const p1Result = await applyGameScore(String(game.session.player1Id), 'debate', p1Pts);
//   game.session.player1Score = p1Pts;
//   let p2Result = { newScore: 0 };
//   if (game.session.player2Id) {
//     p2Result = await applyGameScore(String(game.session.player2Id), 'debate', p2Pts);
//     game.session.player2Score = p2Pts;
//   }
//   await game.session.save();

//   emitToRoom(nsp, game, 'game:judged', result);
//   const p1Rank = await getRank(String(game.session.player1Id), 'overall');
//   emitToSlot(nsp, game, 'p1', 'game:result', {
//     opponentType: game.isPlayer2AI ? 'ai' : 'human',
//     correct: result.winner === 'player1',
//     points: p1Pts,
//     newScore: p1Result.newScore,
//     streak: 0,
//     rank: p1Rank,
//     summary: result.summary,
//   });
//   if (game.session.player2Id) {
//     const p2Rank = await getRank(String(game.session.player2Id), 'overall');
//     emitToSlot(nsp, game, 'p2', 'game:result', {
//       opponentType: 'human',
//       correct: result.winner === 'player2',
//       points: p2Pts,
//       newScore: p2Result.newScore,
//       streak: 0,
//       rank: p2Rank,
//       summary: result.summary,
//     });
//   }
//   gcGame(game.roomKey);
// }

// /* ─────────────────────────── Imposter Prompt ─────────────────────────── */

// async function handleImposterMessage(
//   nsp: Namespace,
//   game: ActiveGame,
//   fromUserId: string,
//   content: string
// ): Promise<void> {
//   if (game.finished) return;
//   const slot = partyOf(game, fromUserId);
//   if (!slot) return;
//   const state = game.state as {
//     word: string;
//     turnIdx: number;
//     maxTurns: number;
//     currentTurn: 'p1' | 'p2';
//     history: { author: 'p1' | 'p2'; content: string }[];
//     loserSlot: 'p1' | 'p2' | null;
//   };
//   if (state.currentTurn !== slot) return;

//   const text = content.trim().slice(0, 240);
//   if (!text) return;

//   const wordRe = new RegExp(`\\b${state.word}\\b`, 'i');
//   const violation = wordRe.test(text);

//   state.history.push({ author: slot, content: text });
//   state.turnIdx += 1;
//   state.currentTurn = state.currentTurn === 'p1' ? 'p2' : 'p1';

//   emitToRoom(nsp, game, 'game:imposter-clue', {
//     author: slot,
//     content: text,
//     turnIdx: state.turnIdx,
//     maxTurns: state.maxTurns,
//     nextTurn: state.currentTurn,
//   });

//   if (violation) {
//     state.loserSlot = slot;
//     emitToRoom(nsp, game, 'game:imposter-violation', { who: slot, word: state.word });
//     await finishImposter(nsp, game);
//     return;
//   }

//   if (state.turnIdx >= state.maxTurns) {
//     await finishImposter(nsp, game);
//     return;
//   }

//   // AI's turn?
//   if (currentTurnIsAI(game)) {
//     void scheduleAIImposterMove(nsp, game);
//   }
// }

// async function scheduleAIImposterMove(nsp: Namespace, game: ActiveGame): Promise<void> {
//   const state = game.state as {
//     word: string;
//     history: { author: 'p1' | 'p2'; content: string }[];
//   };
//   const delay = 1800 + Math.random() * 2500;
//   const t = setTimeout(async () => {
//     if (game.finished) return;
//     const chatHistory: ChatTurn[] = state.history.map((h) => ({
//       role: h.author === 'p2' ? 'assistant' : 'user',
//       content: h.content,
//     }));
//     const clue = await aiImposterDescription(state.word, game.aiPersona!, chatHistory);
//     // Simulate the AI submitting via the same path
//     const fakeUserId = 'ai-opponent';
//     // Bypass the user-id check since AI is p2:
//     const s = game.state as {
//       word: string;
//       turnIdx: number;
//       maxTurns: number;
//       currentTurn: 'p1' | 'p2';
//       history: { author: 'p1' | 'p2'; content: string }[];
//       loserSlot: 'p1' | 'p2' | null;
//     };
//     if (s.currentTurn !== 'p2' || game.finished) return;

//     const wordRe = new RegExp(`\\b${s.word}\\b`, 'i');
//     const violation = wordRe.test(clue);
//     s.history.push({ author: 'p2', content: clue });
//     s.turnIdx += 1;
//     s.currentTurn = 'p1';

//     emitToRoom(nsp, game, 'game:imposter-clue', {
//       author: 'p2',
//       content: clue,
//       turnIdx: s.turnIdx,
//       maxTurns: s.maxTurns,
//       nextTurn: s.currentTurn,
//     });

//     if (violation) {
//       s.loserSlot = 'p2';
//       emitToRoom(nsp, game, 'game:imposter-violation', { who: 'p2', word: s.word });
//       await finishImposter(nsp, game);
//       return;
//     }
//     if (s.turnIdx >= s.maxTurns) {
//       await finishImposter(nsp, game);
//     }
//     // suppress unused
//     void fakeUserId;
//   }, delay);
//   game.timers.push(t);
// }

// async function finishImposter(nsp: Namespace, game: ActiveGame): Promise<void> {
//   if (game.finished) return;
//   game.finished = true;
//   clearAllTimers(game);
//   const state = game.state as {
//     word: string;
//     history: { author: 'p1' | 'p2'; content: string }[];
//     loserSlot: 'p1' | 'p2' | null;
//   };
//   game.session.status = 'finished';
//   game.session.finishedAt = new Date();
//   await game.session.save();

//   let winner: 'player1' | 'player2' | 'draw';
//   let summary = '';

//   if (state.loserSlot === 'p1') {
//     winner = 'player2';
//     summary = `You said the secret word "${state.word}" — instant loss!`;
//   } else if (state.loserSlot === 'p2') {
//     winner = 'player1';
//     summary = `Opponent said the secret word "${state.word}" — instant loss for them!`;
//   } else {
//     // No violation — judge cleverness
//     const judged = await judgeJSON<{
//       winner: 'player1' | 'player2' | 'draw';
//       summary: string;
//     }>(
//       'Judge a word-clue game. Both players took turns describing the SAME secret word without saying it. Decide whose clues were cleverer, more specific, and more in-the-spirit-of-the-game. Pick a winner.',
//       {
//         word: state.word,
//         clues: state.history,
//       },
//       '{ "winner": "player1"|"player2"|"draw", "summary": "<one sentence>" }'
//     );
//     winner = judged?.winner ?? 'draw';
//     summary = judged?.summary ?? 'Both players gave decent clues.';
//   }

//   const p1Pts = winner === 'player1' ? 15 : winner === 'draw' ? 8 : 5;
//   const p2Pts = winner === 'player2' ? 15 : winner === 'draw' ? 8 : 5;
//   const p1Result = await applyGameScore(String(game.session.player1Id), 'imposter', p1Pts);
//   game.session.player1Score = p1Pts;
//   let p2Result = { newScore: 0 };
//   if (game.session.player2Id) {
//     p2Result = await applyGameScore(String(game.session.player2Id), 'imposter', p2Pts);
//     game.session.player2Score = p2Pts;
//   }
//   await game.session.save();

//   emitToRoom(nsp, game, 'game:judged', { winner, summary });
//   const p1Rank = await getRank(String(game.session.player1Id), 'overall');
//   emitToSlot(nsp, game, 'p1', 'game:result', {
//     opponentType: game.isPlayer2AI ? 'ai' : 'human',
//     correct: winner === 'player1',
//     points: p1Pts,
//     newScore: p1Result.newScore,
//     streak: 0,
//     rank: p1Rank,
//     summary,
//   });
//   if (game.session.player2Id) {
//     const p2Rank = await getRank(String(game.session.player2Id), 'overall');
//     emitToSlot(nsp, game, 'p2', 'game:result', {
//       opponentType: 'human',
//       correct: winner === 'player2',
//       points: p2Pts,
//       newScore: p2Result.newScore,
//       streak: 0,
//       rank: p2Rank,
//       summary,
//     });
//   }
//   gcGame(game.roomKey);
// }

// /* ─────────────────────────── Interrogation ─────────────────────────── */

// async function handleInterrogationMessage(
//   nsp: Namespace,
//   game: ActiveGame,
//   fromUserId: string,
//   content: string
// ): Promise<void> {
//   if (game.finished) return;
//   const slot = partyOf(game, fromUserId);
//   if (!slot) return;
//   const state = game.state as {
//     questionIdx: number;
//     maxQuestions: number;
//     exchanges: { question: string; answer: string }[];
//     voted: boolean;
//     history: ChatTurn[];
//   };

//   const text = content.trim().slice(0, 280);
//   if (!text) return;

//   // p1 asks; p2 (or AI) answers. Even though both can be human, only p1 can vote.
//   if (slot === 'p1') {
//     // It's a question
//     if (state.exchanges.length >= state.maxQuestions) return;
//     const exchange = { question: text, answer: '' };
//     state.exchanges.push(exchange);
//     state.history.push({ role: 'user', content: text });

//     emitToRoom(nsp, game, 'game:interrogation-question', {
//       question: text,
//       questionIdx: state.exchanges.length,
//       maxQuestions: state.maxQuestions,
//     });

//     if (game.isPlayer2AI && game.aiPersona) {
//       const delay = 1800 + Math.random() * 3200;
//       const t = setTimeout(async () => {
//         if (game.finished) return;
//         try {
//           const answer = await aiInterrogationAnswer(text, game.aiPersona!, state.history);
//           state.history.push({ role: 'assistant', content: answer });
//           exchange.answer = answer;
//           emitToRoom(nsp, game, 'game:interrogation-answer', {
//             answer,
//             questionIdx: state.exchanges.length,
//             maxQuestions: state.maxQuestions,
//             allAnswered: state.exchanges.length >= state.maxQuestions,
//           });
//           if (state.exchanges.length >= state.maxQuestions) {
//             emitToSlot(nsp, game, 'p1', 'game:vote-phase', {});
//           }
//         } catch (err) {
//           logger.error({ err }, 'AI interrogation answer failed');
//         }
//       }, delay);
//       game.timers.push(t);
//     }
//   } else if (slot === 'p2') {
//     // Human answer
//     const last = state.exchanges[state.exchanges.length - 1];
//     if (!last || last.answer) return; // no question pending or already answered
//     last.answer = text;
//     state.history.push({ role: 'user', content: text });
//     emitToRoom(nsp, game, 'game:interrogation-answer', {
//       answer: text,
//       questionIdx: state.exchanges.length,
//       maxQuestions: state.maxQuestions,
//       allAnswered: state.exchanges.length >= state.maxQuestions,
//     });
//     if (state.exchanges.length >= state.maxQuestions) {
//       emitToSlot(nsp, game, 'p1', 'game:vote-phase', {});
//     }
//   }
// }

// async function handleInterrogationVote(
//   nsp: Namespace,
//   game: ActiveGame,
//   fromUserId: string,
//   vote: 'human' | 'ai'
// ): Promise<void> {
//   if (game.finished) return;
//   const slot = partyOf(game, fromUserId);
//   if (slot !== 'p1') return; // only interrogator votes
//   const state = game.state as { voted: boolean };
//   if (state.voted) return;
//   state.voted = true;

//   game.finished = true;
//   clearAllTimers(game);
//   game.session.player1Vote = vote;
//   game.session.status = 'finished';
//   game.session.finishedAt = new Date();

//   const correct = vote === (game.isPlayer2AI ? 'ai' : 'human');
//   const p1Result = await applyTuringScore({
//     userId: String(game.session.player1Id),
//     guessedCorrectly: correct,
//     fooledOpponent: false,
//   });
//   game.session.player1Score = p1Result.delta;

//   // Reward p2 (if human) just for participating
//   if (game.session.player2Id) {
//     await applyGameScore(String(game.session.player2Id), 'interrogation', 5);
//   }
//   await game.session.save();

//   const p1Rank = await getRank(String(game.session.player1Id), 'overall');
//   emitToSlot(nsp, game, 'p1', 'game:result', {
//     opponentType: game.isPlayer2AI ? 'ai' : 'human',
//     yourVote: vote,
//     correct,
//     points: p1Result.delta,
//     newScore: p1Result.newScore,
//     streak: p1Result.streak,
//     rank: p1Rank,
//   });
//   if (game.session.player2Id) {
//     const p2Rank = await getRank(String(game.session.player2Id), 'overall');
//     emitToSlot(nsp, game, 'p2', 'game:result', {
//       opponentType: 'human',
//       yourVote: null,
//       correct: !correct, // p2 "wins" if p1 guessed wrong
//       points: 5,
//       newScore: 0,
//       streak: 0,
//       rank: p2Rank,
//     });
//   }
//   gcGame(game.roomKey);
// }

// /* ─────────────────────────── Public registration ─────────────────────────── */

// export function registerGameHandlers(nsp: Namespace, socket: Socket): void {
//   const userId: string = socket.data.userId;
//   const displayName: string = socket.data.displayName;
//   const avatarSeed: string = socket.data.avatarSeed;

//   /* ──────────── Matchmaking ──────────── */

//   socket.on('game:find-match', async ({ gameType }: { gameType: GameType }) => {
//     if (!VALID_GAME_TYPES.includes(gameType)) {
//       socket.emit('game:error', { error: 'Unknown game type' });
//       return;
//     }

//     // Try to pop a waiting human first
//     const human = await tryMatchHuman(userId, gameType);
//     if (human) {
//       // Cancel the opponent's pending AI fallback (they were queued, waiting)
//       clearPendingAIMatch(human.opponentUserId, gameType);

//       const oppSocket = nsp.sockets.get(human.opponentSocketId);
//       const oppDisplayName = oppSocket?.data?.displayName || 'Stranger';
//       const oppAvatarSeed = oppSocket?.data?.avatarSeed || 'stranger';

//       await startHumanVsHumanGame(
//         nsp,
//         gameType,
//         {
//           userId: human.opponentUserId,
//           socketId: human.opponentSocketId,
//           displayName: oppDisplayName,
//           avatarSeed: oppAvatarSeed,
//         },
//         { userId, socketId: socket.id, displayName, avatarSeed }
//       );
//       return;
//     }

//     // No human available → queue + schedule AI fallback
//     await enqueue(userId, socket.id, gameType);
//     socket.emit('game:queued', { gameType, fallbackInMs: AI_FALLBACK_DELAY_MS });

//     const t = setTimeout(async () => {
//       pendingAIMatches.delete(pendingKey(userId, gameType));
//       const stillQueued = await dequeue(userId, gameType);
//       if (!stillQueued) return; // they got matched or cancelled
//       // Make sure socket is still here
//       const liveSocket = nsp.sockets.get(socket.id);
//       if (!liveSocket) return;
//       try {
//         await startAIGame(nsp, gameType, {
//           userId,
//           socketId: socket.id,
//           displayName,
//           avatarSeed,
//         });
//       } catch (err) {
//         logger.error({ err }, 'startAIGame failed after timeout');
//         socket.emit('game:error', { error: 'Could not start match' });
//       }
//     }, AI_FALLBACK_DELAY_MS);
//     pendingAIMatches.set(pendingKey(userId, gameType), t);
//   });

//   socket.on('game:cancel-match', async ({ gameType }: { gameType: GameType }) => {
//     clearPendingAIMatch(userId, gameType);
//     await dequeue(userId, gameType);
//     socket.emit('game:cancelled', { gameType });
//   });

//   /* ──────────── Generic game message dispatch ──────────── */

//   socket.on(
//     'game:message',
//     async ({ roomKey, content }: { roomKey: string; content: string }) => {
//       const game = activeGames.get(roomKey);
//       if (!game) return;
//       const text = (content || '').trim();
//       if (!text || text.length > 600) return;

//       switch (game.gameType) {
//         case 'turing':
//           await handleTuringMessage(nsp, game, userId, text);
//           break;
//         case 'debate':
//           await handleDebateMessage(nsp, game, userId, text);
//           break;
//         case 'imposter':
//           await handleImposterMessage(nsp, game, userId, text);
//           break;
//         case 'interrogation':
//           await handleInterrogationMessage(nsp, game, userId, text);
//           break;
//         default:
//           // word-forge uses game:word-submit
//           break;
//       }
//     }
//   );

//   socket.on('game:vote', async ({ roomKey, vote }: { roomKey: string; vote: 'human' | 'ai' }) => {
//     const game = activeGames.get(roomKey);
//     if (!game) return;
//     if (vote !== 'human' && vote !== 'ai') return;

//     if (game.gameType === 'turing') {
//       await handleTuringVote(nsp, game, userId, vote);
//     } else if (game.gameType === 'interrogation') {
//       await handleInterrogationVote(nsp, game, userId, vote);
//     }
//   });

//   socket.on(
//     'game:word-submit',
//     async ({ roomKey, word }: { roomKey: string; word: string }) => {
//       const game = activeGames.get(roomKey);
//       if (!game || game.gameType !== 'word-forge') return;
//       await handleWordForgeMove(nsp, game, userId, word);
//     }
//   );

//   /* ──────────── Disconnect cleanup ──────────── */

//   socket.on('disconnect', () => {
//     // Clear any pending AI fallbacks
//     clearAllPendingForUser(userId);
//     // Mark in-flight games as forfeited (best-effort)
//     for (const [key, g] of activeGames) {
//       if (g.player1SocketId === socket.id || g.player2SocketId === socket.id) {
//         if (!g.finished) {
//           nsp.to(key).emit('game:opponent-left', {});
//         }
//       }
//     }
//     // Drop from any queues
//     for (const gt of VALID_GAME_TYPES) {
//       void dequeue(userId, gt);
//     }
//   });
// }












































