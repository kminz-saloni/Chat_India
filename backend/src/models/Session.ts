import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  deviceName: string;
  browser: string;
  ipHash: string;
  lastActive: Date;
  active: boolean;
  trusted: boolean;
}

const SessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceName: { type: String, default: 'Unknown Device' },
  browser: { type: String, default: 'Unknown Browser' },
  ipHash: { type: String, default: '' },
  lastActive: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  trusted: { type: Boolean, default: false },
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);
