import { redis } from '../config/redis';
import { User } from '../models/User.model';

const LB_KEY = (scope: string) => `lb:${scope}`;
// scopes: "overall", "turing", "word-forge", "debate", "imposter"

export async function addScore(userId: string, scope: string, delta: number): Promise<number> {
  const newScore = await redis.zincrby(LB_KEY(scope), delta, userId);
  return Number(newScore);
}

export async function getRank(userId: string, scope = 'overall'): Promise<number | null> {
  const rank = await redis.zrevrank(LB_KEY(scope), userId);
  return rank === null ? null : rank + 1;
}

export async function getTopN(scope: string, n = 10): Promise<{ userId: string; score: number; rank: number }[]> {
  const raw = await redis.zrevrange(LB_KEY(scope), 0, n - 1, 'WITHSCORES');
  const out: { userId: string; score: number; rank: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    out.push({ userId: raw[i], score: Number(raw[i + 1]), rank: i / 2 + 1 });
  }
  return out;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  score: number;
  rank: number;
}

/**
 * Hydrate top-N entries with user info from Mongo in a single query.
 */
export async function getLeaderboardWithUsers(scope: string, n = 10): Promise<LeaderboardEntry[]> {
  const top = await getTopN(scope, n);
  if (top.length === 0) return [];

  const ids = top.map((t) => t.userId);
  const users = await User.find({ _id: { $in: ids } })
    .select('username displayName avatarSeed')
    .lean();

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return top
    .map((t) => {
      const u = userMap.get(t.userId);
      if (!u) return null;
      return {
        userId: t.userId,
        username: u.username,
        displayName: u.displayName || u.username,
        avatarSeed: u.avatarSeed,
        score: t.score,
        rank: t.rank,
      };
    })
    .filter((x): x is LeaderboardEntry => x !== null);
}
