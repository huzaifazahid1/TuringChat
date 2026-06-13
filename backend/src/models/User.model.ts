import { Schema, model, Document, Types } from 'mongoose';

export interface IUserStats {
  gamesPlayed: number;
  correctGuesses: number;
  timesAsFooled: number;
  highestStreak: number;
  currentStreak: number;
  totalMessages: number;
  currentScore: number;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio: string;
  avatarSeed: string;
  status: 'online' | 'offline' | 'away';
  lastSeenAt: Date;
  stats: IUserStats;
  createdAt: Date;
  updatedAt: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    gamesPlayed: { type: Number, default: 0 },
    correctGuesses: { type: Number, default: 0 },
    timesAsFooled: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    currentScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, default: '', maxlength: 40 },
    bio: { type: String, default: '', maxlength: 160 },
    avatarSeed: { type: String, required: true },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline',
    },
    lastSeenAt: { type: Date, default: Date.now },
    stats: { type: UserStatsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ 'stats.currentScore': -1 });

export const User = model<IUser>('User', UserSchema);
