import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  type: 'direct';
  members: mongoose.Types.ObjectId[];
  vaultEnabledFor: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    type: { type: String, enum: ['direct'], default: 'direct' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    vaultEnabledFor: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true },
);

// Index for fast member lookups
ChatSchema.index({ members: 1 });

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);
