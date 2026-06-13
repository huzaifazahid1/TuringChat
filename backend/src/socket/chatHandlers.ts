import type { Namespace, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Message } from '../models/Message.model';
import { Room } from '../models/Room.model';
import { DMThread } from '../models/DMThread.model';
import { DMMessage } from '../models/DmMessage.model';
import { askRoomBot, type ChatTurn } from '../services/groqService';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const TYPING_TTL = 3; // seconds

function asContextTurns(history: { senderName: string; senderType: string; content: string }[]): ChatTurn[] {
  return history.slice(-8).map((m) => ({
    role: m.senderType === 'ai' || m.senderType === 'bot' ? 'assistant' : 'user',
    content: `${m.senderName}: ${m.content}`,
  }));
}

/**
 * Recompute online count for a room from Redis and broadcast it.
 * Called on every join/leave/disconnect.
 */
async function broadcastRoomPresence(nsp: Namespace, roomId: string): Promise<void> {
  const onlineUserIds = await redis.smembers(`room:online:${roomId}`);
  const count = onlineUserIds.length;
  // Persist to Mongo so the room.activeUsers field reflects reality
  if (mongoose.isValidObjectId(roomId)) {
    await Room.findByIdAndUpdate(roomId, { activeUsers: count }).catch(() => undefined);
  }
  nsp.to(`room:${roomId}`).emit('chat:presence', {
    roomId,
    onlineCount: count,
    onlineUserIds,
  });
}

export function registerChatHandlers(nsp: Namespace, socket: Socket): void {
  const userId: string = socket.data.userId;
  const username: string = socket.data.username;
  const displayName: string = socket.data.displayName;
  const avatarSeed: string = socket.data.avatarSeed;

  /* ───────────────────── Public room events ───────────────────── */

  socket.on('chat:join', async ({ roomId }: { roomId: string }) => {
    if (!roomId || !mongoose.isValidObjectId(roomId)) return;
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('chat:error', { error: 'Room not found' });
      return;
    }

    socket.join(`room:${roomId}`);
    const wasNew = (await redis.sadd(`room:online:${roomId}`, userId)) === 1;
    await redis.expire(`room:online:${roomId}`, 60 * 60); // 1 hour

    // Auto-add to members list on first ever join
    const isMember = (room.members || []).some((m) => String(m) === userId);
    if (!isMember) {
      await Room.findByIdAndUpdate(roomId, {
        $addToSet: { members: userId },
      });
    }

    nsp.to(`room:${roomId}`).emit('chat:user-joined', {
      userId,
      username,
      displayName,
      avatarSeed,
    });
    socket.emit('chat:joined', { roomId });

    if (wasNew) await broadcastRoomPresence(nsp, roomId);
  });

  socket.on('chat:leave', async ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    socket.leave(`room:${roomId}`);
    const removed = (await redis.srem(`room:online:${roomId}`, userId)) === 1;
    nsp.to(`room:${roomId}`).emit('chat:user-left', { userId });
    if (removed) await broadcastRoomPresence(nsp, roomId);
  });

  socket.on(
    'chat:message',
    async ({ roomId, content }: { roomId: string; content: string }) => {
      const text = (content || '').trim();
      if (!text || text.length > 4000) return;
      if (!mongoose.isValidObjectId(roomId)) return;

      const room = await Room.findById(roomId);
      if (!room) return;

      // Persist human message
      const msg = await Message.create({
        roomId,
        senderId: userId,
        senderType: 'human',
        senderName: displayName,
        senderAvatarSeed: avatarSeed,
        content: text,
        type: 'text',
      });

      nsp.to(`room:${roomId}`).emit('chat:message', {
        id: String(msg._id),
        roomId,
        senderId: userId,
        senderType: 'human',
        senderName: displayName,
        senderAvatarSeed: avatarSeed,
        content: text,
        type: 'text',
        createdAt: msg.createdAt,
      });

      // Bump message count + auto-add membership
      await Room.findByIdAndUpdate(roomId, {
        $inc: { messageCount: 1 },
        $addToSet: { members: userId },
      });

      // /ai bot
      if (text.startsWith('/ai ')) {
        const question = text.slice(4).trim();
        if (!question) return;
        try {
          const recent = await Message.find({ roomId })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();
          const ctx = asContextTurns(recent.reverse());
          const reply = await askRoomBot(question, ctx);

          const aiMsg = await Message.create({
            roomId,
            senderId: null,
            senderType: 'bot',
            senderName: 'AI Assistant',
            senderAvatarSeed: 'turingbot',
            content: reply,
            type: 'ai',
          });

          nsp.to(`room:${roomId}`).emit('chat:message', {
            id: String(aiMsg._id),
            roomId,
            senderId: null,
            senderType: 'bot',
            senderName: 'AI Assistant',
            senderAvatarSeed: 'turingbot',
            content: reply,
            type: 'ai',
            createdAt: aiMsg.createdAt,
          });
          await Room.findByIdAndUpdate(roomId, { $inc: { messageCount: 1 } });
        } catch (err) {
          logger.error({ err }, 'AI bot failure');
        }
      }
    }
  );

  socket.on(
    'chat:typing',
    async ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      if (!roomId) return;
      if (isTyping) {
        await redis.set(`typing:${roomId}:${userId}`, '1', 'EX', TYPING_TTL);
      } else {
        await redis.del(`typing:${roomId}:${userId}`);
      }
      socket.to(`room:${roomId}`).emit('chat:typing', {
        roomId,
        userId,
        username,
        displayName,
        isTyping,
      });
    }
  );

  socket.on(
    'chat:reaction',
    async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!messageId || !emoji) return;
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const existing = msg.reactions.find((r) => r.emoji === emoji);
      if (existing) {
        const idx = existing.users.findIndex((u) => String(u) === userId);
        if (idx >= 0) {
          existing.users.splice(idx, 1);
          if (existing.users.length === 0) {
            msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
          }
        } else {
          existing.users.push(userId as never);
        }
      } else {
        msg.reactions.push({ emoji, users: [userId as never] });
      }
      await msg.save();

      nsp.to(`room:${msg.roomId}`).emit('chat:reaction', {
        messageId,
        reactions: msg.reactions,
      });
    }
  );

  /* ───────────────────── DM events ───────────────────── */

  socket.on('dm:join', async ({ threadId }: { threadId: string }) => {
    if (!mongoose.isValidObjectId(threadId)) return;
    const thread = await DMThread.findById(threadId);
    if (!thread) return;
    if (!thread.participants.some((p) => String(p) === userId)) return;
    socket.join(`dm:${threadId}`);
    socket.emit('dm:joined', { threadId });
  });

  socket.on('dm:leave', async ({ threadId }: { threadId: string }) => {
    socket.leave(`dm:${threadId}`);
  });

  socket.on(
    'dm:message',
    async ({ threadId, content }: { threadId: string; content: string }) => {
      const text = (content || '').trim();
      if (!text || text.length > 4000) return;
      if (!mongoose.isValidObjectId(threadId)) return;

      const thread = await DMThread.findById(threadId);
      if (!thread) return;
      if (!thread.participants.some((p) => String(p) === userId)) return;

      const msg = await DMMessage.create({
        threadId,
        senderId: userId,
        senderName: displayName,
        senderAvatarSeed: avatarSeed,
        content: text,
      });

      thread.lastMessage = text;
      thread.lastMessageAt = new Date();
      await thread.save();

      nsp.to(`dm:${threadId}`).emit('dm:message', {
        id: String(msg._id),
        threadId,
        senderId: userId,
        senderName: displayName,
        senderAvatarSeed: avatarSeed,
        content: text,
        createdAt: msg.createdAt,
      });
    }
  );

  socket.on(
    'dm:typing',
    async ({ threadId, isTyping }: { threadId: string; isTyping: boolean }) => {
      if (!threadId) return;
      socket.to(`dm:${threadId}`).emit('dm:typing', {
        threadId,
        userId,
        displayName,
        isTyping,
      });
    }
  );

  /* ───────────────────── Disconnect cleanup ───────────────────── */

  socket.on('disconnect', async () => {
    const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('room:'));
    for (const r of rooms) {
      const roomId = r.replace('room:', '');
      const removed = (await redis.srem(`room:online:${roomId}`, userId)) === 1;
      nsp.to(r).emit('chat:user-left', { userId });
      if (removed) await broadcastRoomPresence(nsp, roomId);
    }
  });
}