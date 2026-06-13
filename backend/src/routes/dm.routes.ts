import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { DMThread, buildParticipantsKey } from '../models/DMThread.model';
import { DMMessage } from '../models/DmMessage.model';
import { User } from '../models/User.model';
import { authRequired } from '../middleware/auth.middleware';

const router = Router();

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  displayName: string;
  avatarSeed: string;
}

/** GET /dms — list current user's threads, newest first. */
router.get('/', authRequired, async (req: Request, res: Response) => {
  const me = req.userId!;
  const threads = await DMThread.find({ participants: me })
    .sort({ lastMessageAt: -1 })
    .limit(50)
    .populate('participants', 'username displayName avatarSeed')
    .lean();

  res.json({
    threads: threads.map((t) => {
      const populated = (t.participants as unknown as PopulatedUser[]) || [];
      const other = populated.find((p) => String(p._id) !== me);
      return {
        id: String(t._id),
        otherUser: other
          ? {
              id: String(other._id),
              username: other.username,
              displayName: other.displayName,
              avatarSeed: other.avatarSeed,
            }
          : null,
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
      };
    }),
  });
});

/** POST /dms/with/:userId — get or create a thread with another user. */
router.post<{ userId: string }>(
  '/with/:userId',
  authRequired,
  async (req: Request<{ userId: string }>, res: Response) => {
  const me = req.userId!;
  const otherId = req.params.userId;
  if (!mongoose.isValidObjectId(otherId)) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }
  if (otherId === me) {
    res.status(400).json({ error: "You can't DM yourself" });
    return;
  }
  const other = await User.findById(otherId).lean();
  if (!other) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const key = buildParticipantsKey(me, otherId);
  let thread = await DMThread.findOne({ participantsKey: key });
  if (!thread) {
    thread = await DMThread.create({
      participants: [me, otherId],
      participantsKey: key,
      lastMessage: '',
      lastMessageAt: new Date(),
    });
  }

  res.json({
    thread: {
      id: String(thread._id),
      otherUser: {
        id: String(other._id),
        username: other.username,
        displayName: other.displayName,
        avatarSeed: other.avatarSeed,
      },
      lastMessage: thread.lastMessage,
      lastMessageAt: thread.lastMessageAt,
    },
  });
});

/** GET /dms/:threadId/messages — paginated message history. */
router.get<{ threadId: string }>(
  '/:threadId/messages',
  authRequired,
  async (req: Request<{ threadId: string }>, res: Response) => {
  const me = req.userId!;
  const threadId = req.params.threadId;
  if (!mongoose.isValidObjectId(threadId)) {
    res.json({ messages: [] });
    return;
  }

  const thread = await DMThread.findById(threadId);
  if (!thread || !thread.participants.some((p) => String(p) === me)) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  const before = req.query.before ? new Date(String(req.query.before)) : new Date();
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const messages = await DMMessage.find({ threadId, createdAt: { $lt: before } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    messages: messages.reverse().map((m) => ({
      id: String(m._id),
      threadId: String(m.threadId),
      senderId: String(m.senderId),
      senderName: m.senderName,
      senderAvatarSeed: m.senderAvatarSeed,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
});

export default router;