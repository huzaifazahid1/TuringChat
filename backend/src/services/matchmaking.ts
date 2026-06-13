// import { redis } from '../config/redis';
// import { randomUUID } from 'crypto';

// const QUEUE_KEY = (gameType: string) => `mm:queue:${gameType}`;
// const SOCKET_KEY = (userId: string) => `mm:socket:${userId}`;

// export interface HumanMatch {
//   roomKey: string;
//   opponentUserId: string;
//   opponentSocketId: string;
// }

// /**
//  * Try to pop a waiting human from the queue. Returns null if no one is
//  * waiting (or the queue had stale entries). Caller is responsible for
//  * either enqueuing this user OR starting an AI fallback timer when null.
//  *
//  * The queue is FIFO so the longest-waiting player gets matched first.
//  */
// export async function tryMatchHuman(
//   userId: string,
//   gameType: string
// ): Promise<HumanMatch | null> {
//   const queueKey = QUEUE_KEY(gameType);

//   // Drain stale entries until we find a live one.
//   // Bound the loop to avoid pathological cases.
//   for (let i = 0; i < 20; i++) {
//     const opponent = await redis.lpop(queueKey);
//     if (!opponent) return null;
//     if (opponent === userId) continue;

//     const oppSocketId = await redis.get(SOCKET_KEY(opponent));
//     if (!oppSocketId) continue;

//     return {
//       roomKey: `game:${gameType}:${randomUUID()}`,
//       opponentUserId: opponent,
//       opponentSocketId: oppSocketId,
//     };
//   }
//   return null;
// }

// /**
//  * Add this user to the back of the queue. They'll be matched by the next
//  * caller of `tryMatchHuman` for this game type.
//  */
// export async function enqueue(
//   userId: string,
//   socketId: string,
//   gameType: string
// ): Promise<void> {
//   await redis.set(SOCKET_KEY(userId), socketId, 'EX', 600);
//   await redis.rpush(QUEUE_KEY(gameType), userId);
//   await redis.expire(QUEUE_KEY(gameType), 600);
// }

// /**
//  * Remove user from the queue. Returns true if they were actually in it.
//  * Used both by user-initiated cancel AND by the AI-fallback timer to
//  * verify the user is still waiting before starting an AI match.
//  */
// export async function dequeue(userId: string, gameType: string): Promise<boolean> {
//   const removed = await redis.lrem(QUEUE_KEY(gameType), 0, userId);
//   await redis.del(SOCKET_KEY(userId));
//   return removed > 0;
// }

// export function newRoomKey(gameType: string, kind: 'h' | 'ai'): string {
//   return `game:${gameType}:${kind}:${randomUUID()}`;
// }







/**
 * MATCHMAKING SERVICE
 * ─────────────────────────────────────────────────────────────────
 * Manages the FIFO queue of players waiting for opponents per game type.
 * Uses Redis for cross-server state (lists, strings).
 *
 * KEY DESIGN: Atomic check-or-enqueue via Lua script
 * ─────────────────────────────────────────────────
 * Naive flow has a race condition:
 *
 *   1. tryMatchHuman(A) → LPOP returns null (queue empty)
 *   2. tryMatchHuman(B) → LPOP returns null (queue STILL empty, A hasn't enqueued)
 *   3. enqueue(A) → A is in queue
 *   4. enqueue(B) → both in queue, neither matched
 *
 * Result: both wait 15s, both get AI fallback. Aap ne yeh bug observe kiya tha.
 *
 * Solution: matchOrEnqueue() runs LPOP + RPUSH atomically as a single Redis
 * Lua script. No interleaving possible — Redis runs Lua scripts to completion.
 *
 * Reference: https://redis.io/commands/eval
 */

import { redis } from '../config/redis';
import { randomUUID } from 'crypto';

const QUEUE_KEY = (gameType: string) => `mm:queue:${gameType}`;
const SOCKET_KEY = (userId: string) => `mm:socket:${userId}`;

// TTLs
const SOCKET_TTL_SECONDS = 600;     // 10 min — covers very long match wait
const QUEUE_TTL_SECONDS = 600;      // queue auto-expires if abandoned

export interface HumanMatch {
  roomKey: string;
  opponentUserId: string;
  opponentSocketId: string;
}

/**
 * Lua script: atomically pop a live opponent OR enqueue self.
 *
 * KEYS[1] = queue key (mm:queue:turing)
 * KEYS[2] = my socket key (mm:socket:<userId>)
 * ARGV[1] = my userId
 * ARGV[2] = my socketId
 * ARGV[3] = socket TTL seconds
 * ARGV[4] = queue TTL seconds
 *
 * Returns:
 *   - {opponent_userId, opponent_socketId} if a live opponent was popped
 *   - {""} (empty string) if I was enqueued (no opponent available)
 *
 * Why drain stale entries (up to 20 attempts):
 *   Queue may contain disconnected users whose mm:socket:<id> has expired.
 *   We pop them off (cleanup) and continue looking for a live one.
 */
const MATCH_OR_ENQUEUE_LUA = `
local queueKey = KEYS[1]
local mySocketKey = KEYS[2]
local myUserId = ARGV[1]
local mySocketId = ARGV[2]
local socketTTL = tonumber(ARGV[3])
local queueTTL = tonumber(ARGV[4])

-- Try up to 20 stale-cleanup pops before giving up
for i = 1, 20 do
  local opponent = redis.call('LPOP', queueKey)
  if not opponent then
    break  -- queue empty
  end
  if opponent ~= myUserId then
    local oppSocketKey = 'mm:socket:' .. opponent
    local oppSocketId = redis.call('GET', oppSocketKey)
    if oppSocketId then
      -- Found live opponent! Clean up their socket key (they're matched now)
      redis.call('DEL', oppSocketKey)
      return {opponent, oppSocketId}
    end
    -- else: stale entry, was popped, continue
  end
end

-- No opponent found — enqueue self
redis.call('SET', mySocketKey, mySocketId, 'EX', socketTTL)
redis.call('RPUSH', queueKey, myUserId)
redis.call('EXPIRE', queueKey, queueTTL)
return {''}
`;

/**
 * Atomic match-or-enqueue.
 *
 * Returns HumanMatch if a live opponent was found and matched.
 * Returns null if the user was added to the queue (caller should start AI fallback timer).
 *
 * @param userId - the calling user's id
 * @param socketId - their current socket connection id
 * @param gameType - which game queue
 */
export async function matchOrEnqueue(
  userId: string,
  socketId: string,
  gameType: string
): Promise<HumanMatch | null> {
  const result = (await redis.eval(
    MATCH_OR_ENQUEUE_LUA,
    2, // KEYS count
    QUEUE_KEY(gameType),
    SOCKET_KEY(userId),
    userId,
    socketId,
    String(SOCKET_TTL_SECONDS),
    String(QUEUE_TTL_SECONDS)
  )) as [string, string?] | string[];

  // Result shape: [opponentId, opponentSocketId] or [""]
  if (!result || !result[0]) {
    return null; // enqueued
  }
  const [opponentUserId, opponentSocketId] = result;
  if (!opponentSocketId) return null; // safety

  return {
    roomKey: `game:${gameType}:h:${randomUUID()}`,
    opponentUserId,
    opponentSocketId,
  };
}

/**
 * Remove user from a queue. Called by:
 *   1. User clicks "Cancel" — explicit removal
 *   2. AI fallback timer fires — verify still queued before starting AI game
 *   3. Disconnect cleanup — remove from all queues
 *
 * Returns true if the user was actually in the queue. False = already removed
 * (e.g. matched in the meantime).
 */
export async function dequeue(userId: string, gameType: string): Promise<boolean> {
  // LREM count=0 removes ALL occurrences (defensive against duplicates)
  const removed = await redis.lrem(QUEUE_KEY(gameType), 0, userId);
  await redis.del(SOCKET_KEY(userId));
  return removed > 0;
}

/**
 * Generate a unique room key for a new game session.
 */
export function newRoomKey(gameType: string, kind: 'h' | 'ai'): string {
  return `game:${gameType}:${kind}:${randomUUID()}`;
}

/* ────────────── DEPRECATED — kept for backwards compatibility ────────────── */

/**
 * @deprecated Use matchOrEnqueue() instead. This function has a known race
 * condition where two simultaneous callers can both see "queue empty" and
 * both end up enqueued without matching each other.
 *
 * Kept here only because gameHandlers.ts may still call it during migration.
 * Safe to remove once gameHandlers.ts is fully migrated.
 */
export async function tryMatchHuman(
  userId: string,
  gameType: string
): Promise<HumanMatch | null> {
  const queueKey = QUEUE_KEY(gameType);
  for (let i = 0; i < 20; i++) {
    const opponent = await redis.lpop(queueKey);
    if (!opponent) return null;
    if (opponent === userId) continue;
    const oppSocketId = await redis.get(SOCKET_KEY(opponent));
    if (!oppSocketId) continue;
    return {
      roomKey: `game:${gameType}:${randomUUID()}`,
      opponentUserId: opponent,
      opponentSocketId: oppSocketId,
    };
  }
  return null;
}

/**
 * @deprecated Use matchOrEnqueue() instead.
 */
export async function enqueue(
  userId: string,
  socketId: string,
  gameType: string
): Promise<void> {
  await redis.set(SOCKET_KEY(userId), socketId, 'EX', SOCKET_TTL_SECONDS);
  await redis.rpush(QUEUE_KEY(gameType), userId);
  await redis.expire(QUEUE_KEY(gameType), QUEUE_TTL_SECONDS);
}