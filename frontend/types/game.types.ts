// export type GameType = 'turing' | 'word-forge' | 'debate' | 'imposter';

// export interface GameOpponent {
//   name: string;
//   avatarSeed: string;
// }

// export interface GameMessage {
//   senderId: string;          // 'ai-opponent' for AI; userId otherwise
//   content: string;
//   senderName: string;
//   senderType: 'human' | 'opponent';
//   timestamp: string;
// }

// export interface GameMatch {
//   roomKey: string;
//   gameType: GameType;
//   timeLimit: number;
//   opponent: GameOpponent;
//   youAre: GameOpponent;
// }

// export interface GameResult {
//   opponentType: 'human' | 'ai';
//   yourVote: 'human' | 'ai' | null;
//   correct: boolean;
//   points: number;
//   newScore: number;
//   streak: number;
//   rank: number | null;
// }

// export type GamePhase = 'idle' | 'searching' | 'playing' | 'voting' | 'finished';








// export type GameType = 'turing' | 'word-forge' | 'debate' | 'imposter' | 'interrogation';

// export interface GameOpponent {
//   name: string;
//   avatarSeed: string;
// }

// export interface GameMessage {
//   senderId: string; // 'ai-opponent' for AI; userId otherwise
//   content: string;
//   senderName: string;
//   senderType: 'human' | 'opponent';
//   timestamp: string;
// }

// export interface GameMatch {
//   roomKey: string;
//   gameType: GameType;
//   timeLimit: number;
//   opponent: GameOpponent;
//   youAre: GameOpponent;
// }

// export interface GameResult {
//   opponentType: 'human' | 'ai';
//   yourVote?: 'human' | 'ai' | null;
//   correct: boolean;
//   points: number;
//   newScore: number;
//   streak: number;
//   rank: number | null;
//   summary?: string;
// }

// export type GamePhase = 'idle' | 'searching' | 'playing' | 'voting' | 'finished';

// /* ── Word Forge events ── */
// export interface WordForgeInit {
//   kind: 'word-forge-init';
//   theme: string;
//   story: string;
//   turn: 'p1' | 'p2';
//   wordCount: number;
//   maxWords: number;
// }

// export interface WordAdded {
//   word: string;
//   story: string;
//   by: 'p1' | 'p2';
//   wordCount: number;
//   maxWords: number;
//   turn: 'p1' | 'p2';
// }

// /* ── Debate events ── */
// export interface DebateInit {
//   kind: 'debate-init';
//   topic: string;
//   yourSide: 'pro' | 'con';
//   opponentSide: 'pro' | 'con';
//   currentTurn: 'p1' | 'p2';
//   round: number;
//   maxRounds: number;
//   secondsPerRound: number;
// }

// export interface DebateArgument {
//   author: 'p1' | 'p2';
//   content: string;
//   round: number;
// }

// export interface DebateTurnSwitch {
//   round: number;
//   currentTurn: 'p1' | 'p2';
// }

// /* ── Imposter events ── */
// export interface ImposterInit {
//   kind: 'imposter-init';
//   word: string;
//   currentTurn: 'p1' | 'p2';
//   turnIdx: number;
//   maxTurns: number;
// }

// export interface ImposterClue {
//   author: 'p1' | 'p2';
//   content: string;
//   turnIdx: number;
//   maxTurns: number;
//   nextTurn: 'p1' | 'p2';
// }

// export interface ImposterViolation {
//   who: 'p1' | 'p2';
//   word: string;
// }

// /* ── Interrogation events ── */
// export interface InterrogationInit {
//   kind: 'interrogation-init';
//   role: 'interrogator' | 'answerer';
//   maxQuestions: number;
//   questionIdx: number;
// }

// export interface InterrogationQuestion {
//   question: string;
//   questionIdx: number;
//   maxQuestions: number;
// }

// export interface InterrogationAnswer {
//   answer: string;
//   questionIdx: number;
//   maxQuestions: number;
//   allAnswered: boolean;
// }

// /* ── Judge result (shared) ── */
// export interface JudgedResult {
//   winner?: 'player1' | 'player2' | 'draw';
//   creativity?: number;
//   coherence?: number;
//   p1_score?: number;
//   p2_score?: number;
//   summary?: string;
// }







































export type GameType = 'turing' | 'word-forge' | 'debate' | 'imposter' | 'interrogation';

export interface GameOpponent {
  name: string;
  avatarSeed: string;
}

export interface GameMessage {
  senderId: string; // 'ai-opponent' for AI; userId otherwise
  content: string;
  senderName: string;
  senderType: 'human' | 'opponent';
  timestamp: string;
}

export interface GameMatch {
  roomKey: string;
  gameType: GameType;
  timeLimit: number;
  youAreSlot: 'p1' | 'p2';
  opponent: GameOpponent;
  youAre: GameOpponent;
}

export interface GameResult {
  opponentType: 'human' | 'ai';
  yourVote?: 'human' | 'ai' | null;
  correct: boolean;
  points: number;
  newScore: number;
  streak: number;
  rank: number | null;
  summary?: string;
}

export type GamePhase = 'idle' | 'searching' | 'playing' | 'voting' | 'finished';

/* ── Word Forge events ── */
export interface WordForgeInit {
  kind: 'word-forge-init';
  theme: string;
  story: string;
  currentTurn: 'p1' | 'p2';
  wordCount: number;
  maxWords: number;
}

export interface WordAdded {
  word: string;
  story: string;
  by: 'p1' | 'p2';
  wordCount: number;
  maxWords: number;
  currentTurn: 'p1' | 'p2';
}

/* ── Debate events ── */
export interface DebateInit {
  kind: 'debate-init';
  topic: string;
  yourSide: 'pro' | 'con';
  opponentSide: 'pro' | 'con';
  currentTurn: 'p1' | 'p2';
  round: number;
  maxRounds: number;
  secondsPerRound: number;
}

export interface DebateArgument {
  author: 'p1' | 'p2';
  content: string;
  round: number;
}

export interface DebateTurnSwitch {
  round: number;
  currentTurn: 'p1' | 'p2';
}

/* ── Imposter events ── */
export interface ImposterInit {
  kind: 'imposter-init';
  word: string;
  currentTurn: 'p1' | 'p2';
  turnIdx: number;
  maxTurns: number;
}

export interface ImposterClue {
  author: 'p1' | 'p2';
  content: string;
  turnIdx: number;
  maxTurns: number;
  nextTurn: 'p1' | 'p2';
}

export interface ImposterViolation {
  who: 'p1' | 'p2';
  word: string;
}

/* ── Interrogation events ── */
export interface InterrogationInit {
  kind: 'interrogation-init';
  role: 'interrogator' | 'answerer';
  maxQuestions: number;
  questionIdx: number;
}

export interface InterrogationQuestion {
  question: string;
  questionIdx: number;
  maxQuestions: number;
}

export interface InterrogationAnswer {
  answer: string;
  questionIdx: number;
  maxQuestions: number;
  allAnswered: boolean;
}

/* ── Judge result (shared) ── */
export interface JudgedResult {
  winner?: 'player1' | 'player2' | 'draw';
  creativity?: number;
  coherence?: number;
  p1_score?: number;
  p2_score?: number;
  summary?: string;
}