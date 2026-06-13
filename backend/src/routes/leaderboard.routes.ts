import { Router, type Request, type Response } from 'express';
import { authRequired } from '../middleware/auth.middleware';
import { getLeaderboardWithUsers, getRank } from '../services/leaderboard';

const router = Router();

router.get('/', authRequired, async (req: Request, res: Response) => {
  const scope = String(req.query.scope || 'overall');
  const allowed = ['overall', 'turing', 'word-forge', 'debate', 'imposter'];
  const safeScope = allowed.includes(scope) ? scope : 'overall';

  const top = await getLeaderboardWithUsers(safeScope, 10);
  const yourRank = await getRank(req.userId as string, safeScope);

  res.json({ scope: safeScope, top, yourRank });
});

export default router;
