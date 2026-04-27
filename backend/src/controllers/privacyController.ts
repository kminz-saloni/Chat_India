import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { User } from '@/models/User';
import { Chat } from '@/models/Chat';
import { Session } from '@/models/Session';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { io } from '@/index';
import { emitPanicEvent } from '@/socket/handlers';

// ─── GET /vault/chats ────────────────────────────────────────────────────────
export async function getVaultChats(req: AuthRequest, res: Response): Promise<void> {
  const me = new mongoose.Types.ObjectId(req.userId);

  const chats = await Chat.find({ members: me, vaultEnabledFor: me })
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

  // Hydrate each chat with the other member's profile
  const hydratedChats = await Promise.all(
    chats.map(async (chat) => {
      const otherId = chat.members.find((m) => m.toString() !== req.userId);
      const other = otherId
        ? await User.findById(otherId).select('_id name phone publicKey')
        : null;
      return {
        _id: chat._id,
        type: chat.type,
        updatedAt: chat.updatedAt,
        lastMessage: chat.lastMessage,
        inVault: true,
        contact: other,
      };
    }),
  );

  res.json({ chats: hydratedChats });
}

// ─── POST /vault/setup ────────────────────────────────────────────────────────
export async function setupVault(req: AuthRequest, res: Response): Promise<void> {
  const { pin } = req.body;
  if (!pin) {
    res.status(400).json({ message: 'PIN is required' });
    return;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  user.vaultPinHash = await bcrypt.hash(pin, salt);
  await user.save();

  res.json({ success: true });
}

// ─── POST /vault/unlock ───────────────────────────────────────────────────────
export async function unlockVault(req: AuthRequest, res: Response): Promise<void> {
  const { pin, password } = req.body;
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // If they passed a password, check it (fallback)
  if (password) {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid password' });
      return;
    }
    res.json({ success: true });
    return;
  }

  // Otherwise, check PIN
  if (!pin) {
    res.status(400).json({ message: 'PIN or password is required' });
    return;
  }

  if (!user.vaultPinHash) {
    res.status(400).json({ message: 'Vault PIN not set' });
    return;
  }

  const isMatch = await bcrypt.compare(pin, user.vaultPinHash);
  if (!isMatch) {
    res.status(401).json({ message: 'Invalid PIN' });
    return;
  }

  res.json({ success: true });
}

// ─── POST /vault/move-chat ────────────────────────────────────────────────────
export async function moveChatToVault(req: AuthRequest, res: Response): Promise<void> {
  const { chatId } = req.body;
  if (!chatId) {
    res.status(400).json({ message: 'chatId is required' });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({ message: 'Chat not found' });
    return;
  }

  const me = new mongoose.Types.ObjectId(req.userId);
  if (!chat.members.includes(me)) {
    res.status(403).json({ message: 'Not a member of this chat' });
    return;
  }

  // Toggle vaulted status
  const vaultedIndex = chat.vaultEnabledFor.indexOf(me);
  if (vaultedIndex === -1) {
    chat.vaultEnabledFor.push(me);
  } else {
    chat.vaultEnabledFor.splice(vaultedIndex, 1);
  }

  await chat.save();
  res.json({ success: true, vaulted: vaultedIndex === -1 });
}

// ─── POST /panic/trigger ──────────────────────────────────────────────────────
export async function triggerPanic(req: AuthRequest, res: Response): Promise<void> {
  // We can require a specific code, or just accept the request if authenticated
  const { secretCode } = req.body;

  // e.g. check if code matches some predefined panic code or just accept it
  // In a real app, panic might be triggered by typing a special PIN in the vault
  
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  user.panicLocked = true;
  await user.save();

  // Invalidate all sessions except current? Or all sessions.
  // We will invalidate ALL sessions to ensure maximum security
  await Session.updateMany({ userId: user._id }, { active: false });

  // Broadcast via socket to all of this user's active connections
  emitPanicEvent(io, req.userId!);

  res.json({ success: true });
}

// ─── POST /vault/reset ────────────────────────────────────────────────────────
export async function resetVault(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Clear vault PIN
  user.vaultPinHash = undefined;
  await user.save();

  res.json({ success: true, message: 'Vault PIN cleared. You can set a new one anytime.' });
}
