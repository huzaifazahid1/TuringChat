import { Schema, model, Document, Types } from 'mongoose';

export interface IDMThread extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[]; // exactly 2 sorted user ids
  participantsKey: string;        // "<minId>:<maxId>" — used for upsert dedup
  lastMessage: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DMThreadSchema = new Schema<IDMThread>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    participantsKey: { type: String, required: true, unique: true, index: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DMThreadSchema.index({ participants: 1 });
DMThreadSchema.index({ lastMessageAt: -1 });

export const DMThread = model<IDMThread>('DMThread', DMThreadSchema);

export function buildParticipantsKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}