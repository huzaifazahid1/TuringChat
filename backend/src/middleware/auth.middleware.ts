import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { Socket } from 'socket.io';
import { User } from '../models/User.model';

export interface AuthTokenPayload extends JwtPayload {
  sub: string; // userId
  username: string;
}

// declare module 'express-serve-static-core' {
//   interface Request {
//     userId?: string;
//     username?: string;
//   }
// }

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
    }
  }
}


export function signAccessToken(userId: string, username: string): string {
  return jwt.sign({ sub: userId, username }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string, username: string): string {
  return jwt.sign({ sub: userId, username }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

export function verifyAccess(token: string): AuthTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET as string) as AuthTokenPayload;
}

export function verifyRefresh(token: string): AuthTokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as AuthTokenPayload;
}

/**
 * Express auth middleware — expects `Authorization: Bearer <token>`.
 */
export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccess(token);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Socket.io auth middleware — token comes via handshake.auth.token.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth token missing'));

    const payload = verifyAccess(token);
    const user = await User.findById(payload.sub).select('username displayName avatarSeed');
    if (!user) return next(new Error('User not found'));

    socket.data.userId = String(user._id);
    socket.data.username = user.username;
    socket.data.displayName = user.displayName || user.username;
    socket.data.avatarSeed = user.avatarSeed;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
