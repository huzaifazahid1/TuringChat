import { Schema, model, Document, Types } from 'mongoose';

export type GameType = 'turing' | 'word-forge' | 'debate' | 'imposter' | 'interrogation';

export interface IGameMessage {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

export interface IGameSession extends Document {
  _id: Types.ObjectId;
  gameType: GameType;
  roomKey: string; // ephemeral socket room
  player1Id: Types.ObjectId;
  player2Id: Types.ObjectId | null; // null when opponent is AI
  isPlayer2AI: boolean;
  messages: IGameMessage[];
  player1Vote: 'human' | 'ai' | null;
  player2Vote: 'human' | 'ai' | null;
  player1Score: number;
  player2Score: number;
  result: 'player1' | 'player2' | 'draw' | null;
  metadata: Record<string, unknown>; // e.g. theme word, debate topic, judge JSON
  duration: number; // seconds
  status: 'active' | 'voting' | 'finished';
  createdAt: Date;
  finishedAt: Date | null;
}

const GameMessageSchema = new Schema<IGameMessage>(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GameSessionSchema = new Schema<IGameSession>(
  {
    gameType: {
      type: String,
      enum: ['turing', 'word-forge', 'debate', 'imposter', 'interrogation'],
      required: true,
      index: true,
    },
    roomKey: { type: String, required: true, unique: true },
    player1Id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    player2Id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isPlayer2AI: { type: Boolean, default: false },
    messages: { type: [GameMessageSchema], default: [] },
    player1Vote: { type: String, enum: ['human', 'ai', null], default: null },
    player2Vote: { type: String, enum: ['human', 'ai', null], default: null },
    player1Score: { type: Number, default: 0 },
    player2Score: { type: Number, default: 0 },
    result: { type: String, enum: ['player1', 'player2', 'draw', null], default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    duration: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'voting', 'finished'],
      default: 'active',
    },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GameSessionSchema.index({ player1Id: 1, createdAt: -1 });
GameSessionSchema.index({ player2Id: 1, createdAt: -1 });

export const GameSession = model<IGameSession>('GameSession', GameSessionSchema);
