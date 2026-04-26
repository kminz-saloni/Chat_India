import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { User } from '@/models/User';
import { Chat } from '@/models/Chat';
import { Message } from '@/models/Message';
import { io } from '@/index';
import { emitNewMessage } from '@/socket/handlers';
import mongoose from 'mongoose';

// ─── GET /users/search?phone=... ─────────────────────────────────────────────
export async function searchUsers(req: AuthRequest, res: Response): Promise<void> {
  const { phone } = req.query;
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ message: 'phone query parameter is required' });
    return;
  }

  // Sanitize: only find non-deleted users, exclude self
  const users = await User.find({
    phone: { $regex: phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    deletedAt: null,
    _id: { $ne: req.userId },
  })
    .select('_id name phone publicKey')
    .limit(10);

  res.json({ users });
}

// ─── POST /chats ──────────────────────────────────────────────────────────────
export async function createOrGetChat(req: AuthRequest, res: Response): Promise<void> {
  const { memberId } = req.body;
  if (!memberId) {
    res.status(400).json({ message: 'memberId is required' });
    return;
  }

  const me = new mongoose.Types.ObjectId(req.userId);
  const other = new mongoose.Types.ObjectId(memberId as string);

  // Check if direct chat already exists between these two users
  let chat = await Chat.findOne({
    type: 'direct',
    members: { $all: [me, other], $size: 2 },
  }).populate('lastMessage');

  if (!chat) {
    // Verify the other user exists
    const otherUser = await User.findById(other).select('_id name phone publicKey');
    if (!otherUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    chat = await Chat.create({ type: 'direct', members: [me, other] });
  }

  res.status(201).json({ chat });
}

// ─── GET /chats ───────────────────────────────────────────────────────────────
export async function getMyChats(req: AuthRequest, res: Response): Promise<void> {
  const me = new mongoose.Types.ObjectId(req.userId);

  const chats = await Chat.find({ members: me })
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
        inVault: chat.vaultEnabledFor.some((id) => id.toString() === req.userId),
        contact: other,
      };
    }),
  );

  // Exclude vaulted chats from the main list (returned separately by vault routes)
  const mainChats = hydratedChats.filter((c) => !c.inVault);

  res.json({ chats: mainChats });
}

// ─── POST /messages ───────────────────────────────────────────────────────────
export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const { chatId, ciphertext, selfDestructAt } = req.body;
  if (!chatId || !ciphertext) {
    res.status(400).json({ message: 'chatId and ciphertext are required' });
    return;
  }

  const me = new mongoose.Types.ObjectId(req.userId);

  // Authorization: user must be a member of the chat
  const chat = await Chat.findOne({ _id: chatId, members: me });
  if (!chat) {
    res.status(403).json({ message: 'Not a member of this chat' });
    return;
  }

  const message = await Message.create({
    chatId,
    senderId: me,
    ciphertext,
    selfDestructAt: selfDestructAt ?? undefined,
    status: 'sent',
  });

  // Update chat's lastMessage and updatedAt
  await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: new Date() });

  // Realtime delivery to all chat members
  emitNewMessage(io, chatId, message);

  res.status(201).json({ message });
}

// ─── GET /chats/:chatId/messages?page=1 ──────────────────────────────────────
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const { chatId } = req.params;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = 40;

  const me = new mongoose.Types.ObjectId(req.userId);

  const chat = await Chat.findOne({ _id: chatId, members: me });
  if (!chat) {
    res.status(403).json({ message: 'Not a member of this chat' });
    return;
  }

  const messages = await Message.find({ chatId, deleted: false })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ messages: messages.reverse(), page, hasMore: messages.length === limit });
}
