import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { User } from '../models/User.model';
import {
  authRequired,
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
} from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'Only letters, numbers and underscore'),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const LoginSchema = z.object({
  identifier: z.string().min(3), // username or email
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(10),
});

router.post(
  '/register',
  authLimiter,
  validateBody(RegisterSchema),
  async (req: Request, res: Response) => {
    const { username, email, password } = req.body as z.infer<typeof RegisterSchema>;
    const lcUser = username.toLowerCase();

    const exists = await User.findOne({ $or: [{ username: lcUser }, { email: email.toLowerCase() }] });
    if (exists) {
      res.status(409).json({ error: 'Username or email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: lcUser,
      email: email.toLowerCase(),
      passwordHash,
      displayName: username,
      avatarSeed: lcUser, // DiceBear seed = username by default
      status: 'online',
    });

    const accessToken = signAccessToken(String(user._id), user.username);
    const refreshToken = signRefreshToken(String(user._id), user.username);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  }
);

router.post(
  '/login',
  authLimiter,
  validateBody(LoginSchema),
  async (req: Request, res: Response) => {
    const { identifier, password } = req.body as z.infer<typeof LoginSchema>;
    const lc = identifier.toLowerCase();
    const user = await User.findOne({ $or: [{ username: lc }, { email: lc }] }).select('+passwordHash');
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    user.status = 'online';
    user.lastSeenAt = new Date();
    await user.save();

    const accessToken = signAccessToken(String(user._id), user.username);
    const refreshToken = signRefreshToken(String(user._id), user.username);

    res.json({ accessToken, refreshToken, user: publicUser(user) });
  }
);

router.post('/refresh', validateBody(RefreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body as z.infer<typeof RefreshSchema>;
  try {
    const payload = verifyRefresh(refreshToken);
    const accessToken = signAccessToken(payload.sub, payload.username);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authRequired, async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: publicUser(user) });
});

function publicUser(u: import('../models/User.model').IUser) {
  return {
    id: String(u._id),
    username: u.username,
    email: u.email,
    displayName: u.displayName || u.username,
    bio: u.bio,
    avatarSeed: u.avatarSeed,
    status: u.status,
    stats: u.stats,
    createdAt: u.createdAt,
  };
}

export default router;
