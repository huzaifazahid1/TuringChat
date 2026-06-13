import { Server as IOServer, type Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { HttpServer } from '../types/http';
import { socketAuthMiddleware } from '../middleware/auth.middleware';
import { pubClient, subClient } from '../config/redis';
import { registerChatHandlers } from './chatHandlers';
import { registerGameHandlers } from './gameHandlers';
import { logger } from '../utils/logger';
import { User } from '../models/User.model';

export async function createSocketServer(httpServer: HttpServer): Promise<Server> {
  const io = new IOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
    pingTimeout: 30_000,
    pingInterval: 25_000,
  });

  // Wait for both pub/sub connections
  await Promise.all([
    pubClient.status === 'ready' ? Promise.resolve() : pubClient.connect().catch(() => undefined),
    subClient.status === 'ready' ? Promise.resolve() : subClient.connect().catch(() => undefined),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Socket.io Redis adapter attached');

  /* /chat namespace */
  const chatNs = io.of('/chat');
  chatNs.use(socketAuthMiddleware);
  chatNs.on('connection', async (socket) => {
    logger.debug({ id: socket.id, user: socket.data.username }, '/chat connected');

    await User.findByIdAndUpdate(socket.data.userId, {
      status: 'online',
      lastSeenAt: new Date(),
    });
    chatNs.emit('user:status', { userId: socket.data.userId, status: 'online' });

    registerChatHandlers(chatNs, socket);

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.data.userId, {
        status: 'offline',
        lastSeenAt: new Date(),
      });
      chatNs.emit('user:status', { userId: socket.data.userId, status: 'offline' });
    });
  });

  /* /game namespace */
  const gameNs = io.of('/game');
  gameNs.use(socketAuthMiddleware);
  gameNs.on('connection', (socket) => {
    logger.debug({ id: socket.id, user: socket.data.username }, '/game connected');
    registerGameHandlers(gameNs, socket);
  });

  return io;
}
