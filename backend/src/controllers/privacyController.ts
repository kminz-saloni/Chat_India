import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { User } from '@/models/User';
import { Chat } from '@/models/Chat';
import { Message } from '@/models/Message';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { io } from '@/index';
import { isOnline } from '@/socket/handlers';
import { lockUserForPanic, isPanicPhraseValid } from '@/services/panicService';
// ─── GET /vault/info ─────────────────────────────────────────────────────
export async function getVaultInfo(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json({ pinSet: !!user.vaultPinHash });
}
// ─── GET /vault/chats ────────────────────────────────────────────────────────
export async function getVaultChats(req: AuthRequest, res: Response): Promise<void> {
  const me = new mongoose.Types.ObjectId(req.userId);

  const chats = await Chat.find({ members: me, vaultEnabledFor: me })
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

  const chatIds = chats.map((chat) => chat._id);
  const unreadAgg = await Message.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    {
      $match: {
        chatId: { $in: chatIds },
        senderId: { $ne: me },
        deleted: false,
        status: { $ne: 'read' },
      },
    },
    { $group: { _id: '$chatId', count: { $sum: 1 } } },
  ]);
  const unreadByChat = new Map(unreadAgg.map((item) => [String(item._id), item.count]));

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
        unread: unreadByChat.get(String(chat._id)) ?? 0,
        inVault: true,
        contactOnline: otherId ? isOnline(String(otherId)) : false,
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

  if (user.vaultPinHash) {
    res.status(409).json({ message: 'Vault PIN already set. Reset it first to configure a new PIN.' });
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

  await lockUserForPanic(String(user._id), io);

  res.json({ success: true });
}

// ─── GET /panic/settings ─────────────────────────────────────────────────────
export async function getPanicSettings(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.userId).select('panicSecretHash');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json({ configured: !!user.panicSecretHash });
}

// ─── POST /panic/settings ────────────────────────────────────────────────────
export async function upsertPanicSettings(req: AuthRequest, res: Response): Promise<void> {
  const { secretPhrase } = req.body as { secretPhrase?: string };

  if (!secretPhrase || typeof secretPhrase !== 'string') {
    res.status(400).json({ message: 'secretPhrase is required' });
    return;
  }

  const normalized = secretPhrase.trim();
  if (normalized.length < 6 || normalized.length > 64) {
    res.status(400).json({ message: 'Secret phrase must be between 6 and 64 characters' });
    return;
  }

  if (!normalized.startsWith('#LOCK-')) {
    res.status(400).json({ message: 'Secret phrase must start with #LOCK-' });
    return;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  user.panicSecretHash = await bcrypt.hash(normalized, 12);
  await user.save();
  res.json({ success: true, configured: true });
}

// ─── POST /panic/trigger-phrase ──────────────────────────────────────────────
export async function triggerPanicByPhrase(req: AuthRequest, res: Response): Promise<void> {
  const { chatId, phrase } = req.body as { chatId?: string; phrase?: string };
  if (!chatId || !phrase) {
    res.status(400).json({ message: 'chatId and phrase are required' });
    return;
  }

  const me = new mongoose.Types.ObjectId(req.userId);
  const chat = await Chat.findOne({ _id: chatId, members: me }).select('members');
  if (!chat) {
    res.status(403).json({ message: 'Not a member of this chat' });
    return;
  }

  const targetId = chat.members.find((id) => String(id) !== req.userId);
  if (!targetId) {
    res.status(400).json({ message: 'No target user in this chat' });
    return;
  }

  const normalized = phrase.trim();
  const valid = await isPanicPhraseValid(String(targetId), normalized);
  if (!valid) {
    res.status(403).json({ success: false, triggered: false, message: 'Invalid panic phrase' });
    return;
  }

  await lockUserForPanic(String(targetId), io);
  res.json({ success: true, triggered: true });
}

// ─── POST /vault/reset ────────────────────────────────────────────────────────
export async function resetVault(req: AuthRequest, res: Response): Promise<void> {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ message: 'Password is required to reset vault PIN' });
    return;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ message: 'Invalid password' });
    return;
  }

  // Clear vault PIN
  user.vaultPinHash = undefined;
  await user.save();

  res.json({ success: true, message: 'Vault PIN cleared. You can set a new one anytime.' });
}
