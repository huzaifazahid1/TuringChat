import { Schema, model, Document, Types } from 'mongoose';

export interface IDMMessage extends Document {
  _id: Types.ObjectId;
  threadId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderAvatarSeed: string;
  content: string;
  createdAt: Date;
}

const DMMessageSchema = new Schema<IDMMessage>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: 'DMThread', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderAvatarSeed: { type: String, required: true },
    content: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DMMessageSchema.index({ threadId: 1, createdAt: -1 });

export const DMMessage = model<IDMMessage>('DMMessage', DMMessageSchema);