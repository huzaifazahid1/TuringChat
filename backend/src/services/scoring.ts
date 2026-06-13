import { User } from '../models/User.model';
import { addScore } from './leaderboard';

export const SCORING = {
  CORRECT_GUESS: 10,
  FOOLED_OPPONENT: 5,
  STREAK_BONUS_PER: 2, // +2 per streak step
  CHAT_MESSAGE: 0, // we don't currently award chat messages
} as const;

export interface TuringScoreInput {
  userId: string;
  guessedCorrectly: boolean;
  fooledOpponent: boolean;
}

/**
 * Apply score for a Turing-game player. Mutates Mongo + leaderboard atomically-ish.
 */
export async function applyTuringScore(input: TuringScoreInput): Promise<{
  delta: number;
  newScore: number;
  streak: number;
}> {
  const { userId, guessedCorrectly, fooledOpponent } = input;

  let delta = 0;
  if (guessedCorrectly) delta += SCORING.CORRECT_GUESS;
  if (fooledOpponent) delta += SCORING.FOOLED_OPPONENT;

  const user = await User.findById(userId);
  if (!user) return { delta: 0, newScore: 0, streak: 0 };

  if (guessedCorrectly) {
    user.stats.currentStreak += 1;
    if (user.stats.currentStreak > user.stats.highestStreak) {
      user.stats.highestStreak = user.stats.currentStreak;
    }
    delta += user.stats.currentStreak * SCORING.STREAK_BONUS_PER;
    user.stats.correctGuesses += 1;
  } else {
    user.stats.currentStreak = 0;
  }

  if (fooledOpponent) user.stats.timesAsFooled += 1;

  user.stats.gamesPlayed += 1;
  user.stats.currentScore += delta;
  await user.save();

  await addScore(userId, 'overall', delta);
  await addScore(userId, 'turing', delta);

  return {
    delta,
    newScore: user.stats.currentScore,
    streak: user.stats.currentStreak,
  };
}

/**
 * Generic per-game scoring (Word Forge, Debate, Imposter).
 */
export async function applyGameScore(
  userId: string,
  scope: string,
  delta: number
): Promise<{ delta: number; newScore: number }> {
  const user = await User.findById(userId);
  if (!user) return { delta: 0, newScore: 0 };

  user.stats.currentScore += delta;
  user.stats.gamesPlayed += 1;
  await user.save();

  await addScore(userId, 'overall', delta);
  await addScore(userId, scope, delta);

  return { delta, newScore: user.stats.currentScore };
}
