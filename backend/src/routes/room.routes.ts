import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Room } from '../models/Room.model';
import { Message } from '../models/Message.model';
import { User } from '../models/User.model';
import { redis } from '../config/redis';
import { authRequired } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

const CreateRoomSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(280).optional().default(''),
  category: z
    .enum(['tech', 'gaming', 'random', 'science', 'music', 'sports', 'general'])
    .default('general'),
  mood: z
    .enum(['chill', 'serious', 'funny', 'tech', 'creative', 'debate'])
    .default('chill'),
  isPrivate: z.boolean().default(false),
  icon: z.string().max(8).default('💬'),
});

/** Coerce a possibly-malformed mongo document into the API shape. */
type RoomLean = {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category?: string;
  mood?: string;
  icon?: string;
  isPinned?: boolean;
  activeUsers?: number;
  members?: mongoose.Types.ObjectId[];
  messageCount?: number;
  createdAt?: Date;
};

function shapeRoom(r: RoomLean) {
  return {
    id: String(r._id),
    name: r.name ?? 'Untitled',
    description: r.description ?? '',
    category: r.category ?? 'general',
    mood: r.mood ?? 'chill',
    icon: r.icon ?? '💬',
    isPinned: r.isPinned ?? false,
    activeUsers: r.activeUsers ?? 0,
    memberCount: r.members?.length ?? 0,
    messageCount: r.messageCount ?? 0,
    createdAt: r.createdAt,
  };
}

router.get('/', authRequired, async (req: Request, res: Response) => {
  const { category, q } = req.query;
  const filter: Record<string, unknown> = {
    $or: [{ isPrivate: false }, { isPrivate: { $exists: false } }],
  };
  if (category && category !== 'all') filter.category = category;
  if (q) filter.name = { $regex: String(q), $options: 'i' };

  // const rooms = await Room.find(filter)
  //   .sort({ isPinned: -1, activeUsers: -1, createdAt: -1 })
  //   .limit(50)
  //   .lean();

  // const rooms = await Room.find(filter)
  // .sort({ isPinned: -1, activeUsers: -1, createdAt: -1 })
  // .limit(50)
  // .lean<RoomLean>();

  const rooms = await Room.find(filter)
  .sort({ isPinned: -1, activeUsers: -1, createdAt: -1 })
  .limit(50)
  .lean<RoomLean[]>(); // ✅ array type

  res.json({ rooms: rooms.map(shapeRoom) });
});

router.post(
  '/',
  authRequired,
  validateBody(CreateRoomSchema),
  async (req: Request, res: Response) => {
    const data = req.body as z.infer<typeof CreateRoomSchema>;
    const room = await Room.create({
      ...data,
      createdBy: req.userId,
      admins: [req.userId],
      members: [req.userId],
    });
    // const lean = room.toObject();
    // res.status(201).json({ room: shapeRoom(lean as Record<string, unknown>) });
    const lean = room.toObject() as RoomLean;
res.status(201).json({ room: shapeRoom(lean) });
  }
);

router.get('/:id', authRequired, async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'Invalid room id' });
    return;
  }
  // const room = await Room.findById(req.params.id).lean();
  const room = await Room.findById(req.params.id).lean<RoomLean>();
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({ room: shapeRoom(room) });
});

router.get('/:id/messages', authRequired, async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.json({ messages: [] });
    return;
  }
  const before = req.query.before ? new Date(String(req.query.before)) : new Date();
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const messages = await Message.find({
    roomId: req.params.id,
    createdAt: { $lt: before },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    messages: messages.reverse().map((m) => ({
      id: String(m._id),
      roomId: String(m.roomId),
      senderId: m.senderId ? String(m.senderId) : null,
      senderType: m.senderType,
      senderName: m.senderName,
      senderAvatarSeed: m.senderAvatarSeed,
      content: m.content,
      type: m.type,
      reactions: m.reactions ?? [],
      createdAt: m.createdAt,
    })),
  });
});

router.get('/:id/online', authRequired, async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.json({ users: [], count: 0 });
    return;
  }
  const userIds = await redis.smembers(`room:online:${req.params.id}`);
  if (userIds.length === 0) {
    res.json({ users: [], count: 0 });
    return;
  }
  const users = await User.find({ _id: { $in: userIds } })
    .select('username displayName avatarSeed status')
    .lean();
  res.json({
    count: users.length,
    users: users.map((u) => ({
      id: String(u._id),
      username: u.username,
      displayName: u.displayName || u.username,
      avatarSeed: u.avatarSeed,
      status: u.status,
    })),
  });
});

export default router;