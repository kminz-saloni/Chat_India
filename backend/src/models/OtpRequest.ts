import mongoose, { Document, Schema } from 'mongoose';

export interface IOtpRequest extends Document {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

const OtpRequestSchema = new Schema<IOtpRequest>({
  phone: { type: String, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
});

export const OtpRequest = mongoose.model<IOtpRequest>('OtpRequest', OtpRequestSchema);
