import { create } from 'zustand';
import type {
  GameMatch,
  GameMessage,
  GamePhase,
  GameResult,
  GameType,
} from '@/types/game.types';

interface QueueInfo {
  gameType: GameType;
  fallbackInMs: number;
  queuedAt: number; // performance.now() reference
}

interface GameState {
  phase: GamePhase;
  gameType: GameType | null;
  match: GameMatch | null;
  messages: GameMessage[];
  secondsLeft: number;
  result: GameResult | null;
  metadata: Record<string, unknown>;
  queueInfo: QueueInfo | null;

  setPhase: (p: GamePhase) => void;
  setGameType: (g: GameType | null) => void;
  setMatch: (m: GameMatch | null) => void;
  pushMessage: (m: GameMessage) => void;
  setSecondsLeft: (n: number) => void;
  setResult: (r: GameResult | null) => void;
  setMetadata: (m: Record<string, unknown>) => void;
  setQueueInfo: (q: QueueInfo | null) => void;

  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'idle',
  gameType: null,
  match: null,
  messages: [],
  secondsLeft: 0,
  result: null,
  metadata: {},
  queueInfo: null,

  setPhase: (phase) => set({ phase }),
  setGameType: (gameType) => set({ gameType }),
  setMatch: (match) => set({ match }),
  pushMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setSecondsLeft: (secondsLeft) => set({ secondsLeft }),
  setResult: (result) => set({ result }),
  setMetadata: (metadata) => set({ metadata }),
  setQueueInfo: (queueInfo) => set({ queueInfo }),

  reset: () =>
    set({
      phase: 'idle',
      gameType: null,
      match: null,
      messages: [],
      secondsLeft: 0,
      result: null,
      metadata: {},
      queueInfo: null,
    }),
}));