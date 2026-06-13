import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/db';
import { pingRedis } from './config/redis';
import { createSocketServer } from './socket';
import { logger } from './utils/logger';
import { apiLimiter } from './middleware/rateLimit.middleware';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roomRoutes from './routes/room.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import dmRoutes from './routes/dm.routes';

const PORT = Number(process.env.PORT) || 5000;

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = express();
  const httpServer = createServer(app);

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan('tiny'));
  app.use(apiLimiter);

  app.get('/health', async (_req: Request, res: Response) => {
    const redisOk = await pingRedis();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      services: { mongo: 'ok', redis: redisOk ? 'ok' : 'down' },
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/dms', dmRoutes);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  await createSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`🚀 TuringChat backend listening on :${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Bootstrap failed');
  process.exit(1);
});