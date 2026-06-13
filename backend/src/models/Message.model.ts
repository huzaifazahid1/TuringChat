import { Schema, model, Document, Types } from 'mongoose';

export interface IReaction {
  emoji: string;
  users: Types.ObjectId[];
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  senderId: Types.ObjectId | null; // null for the AI bot
  senderType: 'human' | 'ai' | 'bot' | 'system';
  senderName: string; // denormalized for fast rendering
  senderAvatarSeed: string;
  content: string;
  type: 'text' | 'system' | 'ai';
  reactions: IReaction[];
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    emoji: { type: String, required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    senderType: {
      type: String,
      enum: ['human', 'ai', 'bot', 'system'],
      default: 'human',
    },
    senderName: { type: String, required: true },
    senderAvatarSeed: { type: String, required: true },
    content: { type: String, required: true, maxlength: 4000 },
    type: { type: String, enum: ['text', 'system', 'ai'], default: 'text' },
    reactions: { type: [ReactionSchema], default: [] },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

MessageSchema.index({ roomId: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', MessageSchema);
