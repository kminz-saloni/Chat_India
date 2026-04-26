import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  ciphertext: string;
  edited: boolean;
  deleted: boolean;
  reactions: { userId: mongoose.Types.ObjectId; emoji: string }[];
  selfDestructAt?: Date;
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ciphertext: { type: String, required: true },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    selfDestructAt: { type: Date },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  },
  { timestamps: true },
);

// Compound index for paginated message fetching
MessageSchema.index({ chatId: 1, createdAt: -1 });
// TTL worker-assisted index for self-destruct
MessageSchema.index({ selfDestructAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
