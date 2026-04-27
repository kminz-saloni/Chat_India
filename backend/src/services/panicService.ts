import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { Session } from '@/models/Session';
import { User } from '@/models/User';
import { emitPanicEvent } from '@/socket/handlers';

export async function lockUserForPanic(userId: string, io: Server): Promise<void> {
  const user = await User.findById(userId).select('_id panicLocked');
  if (!user) return;

  if (!user.panicLocked) {
    user.panicLocked = true;
    await user.save();
  }

  await Session.updateMany({ userId: user._id, active: true }, { active: false });
  emitPanicEvent(io, String(user._id));
}

export async function isPanicPhraseValid(userId: string, phrase: string): Promise<boolean> {
  const user = await User.findById(userId).select('panicSecretHash');
  if (!user?.panicSecretHash) return false;
  return bcrypt.compare(phrase, user.panicSecretHash);
}
