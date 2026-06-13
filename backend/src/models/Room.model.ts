import { Schema, model, Document, Types } from 'mongoose';

export type RoomCategory =
  | 'tech'
  | 'gaming'
  | 'random'
  | 'science'
  | 'music'
  | 'sports'
  | 'general';

export type RoomMood =
  | 'chill'
  | 'serious'
  | 'funny'
  | 'tech'
  | 'creative'
  | 'debate';

export interface IRoom extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  category: RoomCategory;
  mood: RoomMood;
  isPrivate: boolean;
  isPinned: boolean;
  icon: string; // emoji
  members: Types.ObjectId[];
  admins: Types.ObjectId[];
  createdBy: Types.ObjectId;
  activeUsers: number;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, default: '', maxlength: 280 },
    category: {
      type: String,
      enum: ['tech', 'gaming', 'random', 'science', 'music', 'sports', 'general'],
      default: 'general',
    },
    mood: {
      type: String,
      enum: ['chill', 'serious', 'funny', 'tech', 'creative', 'debate'],
      default: 'chill',
    },
    isPrivate: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    icon: { type: String, default: '💬' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activeUsers: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RoomSchema.index({ category: 1 });
RoomSchema.index({ activeUsers: -1 });
RoomSchema.index({ isPinned: -1, activeUsers: -1 });

export const Room = model<IRoom>('Room', RoomSchema);
