import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  passwordHash: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  vaultPinHash?: string;
  panicSecretHash?: string;
  panicLocked: boolean;
  customContactNames: Map<string, string>;
  createdAt: Date;
  deletedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    publicKey: { type: String },
    encryptedPrivateKey: { type: String },
    vaultPinHash: { type: String },
    panicSecretHash: { type: String },
    panicLocked: { type: Boolean, default: false },
    customContactNames: { type: Map, of: String, default: {} },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', UserSchema);
