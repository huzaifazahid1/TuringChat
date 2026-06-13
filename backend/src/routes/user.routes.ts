import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.model';
import { authRequired } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(160).optional(),
  avatarSeed: z.string().min(1).max(64).optional(),
});

router.patch(
  '/me',
  authRequired,
  validateBody(UpdateProfileSchema),
  async (req: Request, res: Response) => {
    const updates = req.body as z.infer<typeof UpdateProfileSchema>;
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      user: {
        id: String(user._id),
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarSeed: user.avatarSeed,
        stats: user.stats,
      },
    });
  }
);

router.get('/search', authRequired, async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) {
    res.json({ users: [] });
    return;
  }
  const users = await User.find({
    username: { $regex: `^${q.replace(/[^a-z0-9_]/g, '')}`, $options: 'i' },
  })
    .limit(10)
    .select('username displayName avatarSeed status');
  res.json({
    users: users.map((u) => ({
      id: String(u._id),
      username: u.username,
      displayName: u.displayName || u.username,
      avatarSeed: u.avatarSeed,
      status: u.status,
    })),
  });
});

router.get('/:id', authRequired, async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('username displayName bio avatarSeed status stats');
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: {
      id: String(user._id),
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio,
      avatarSeed: user.avatarSeed,
      status: user.status,
      stats: user.stats,
    },
  });
});

export default router;
