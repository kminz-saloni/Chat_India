import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';
import mongoose from 'mongoose';
import { io } from '@/index';
import { emitMessageUpdate } from '@/socket/handlers';

// ─── PATCH /messages/:id ──────────────────────────────────────────────────────
export async function editMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { ciphertext, senderCiphertext } = req.body;

  if (!ciphertext) {
    res.status(400).json({ message: 'ciphertext is required' });
    return;
  }

  const message = await Message.findById(id);
  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return;
  }

  if (message.senderId.toString() !== req.userId) {
    res.status(403).json({ message: 'Only sender can edit the message' });
    return;
  }

  if (message.deleted) {
    res.status(400).json({ message: 'Cannot edit a deleted message' });
    return;
  }

  message.ciphertext = ciphertext;
  if (senderCiphertext !== undefined) {
    message.senderCiphertext = senderCiphertext;
  }
  message.edited = true;
  await message.save();

  // Realtime broadcast to chat room
  emitMessageUpdate(io, message.chatId.toString(), {
    type: 'edit',
    messageId: message._id,
    ciphertext,
    senderCiphertext: senderCiphertext ?? undefined,
    edited: true
  });

  res.json({ success: true, message });
}

// ─── DELETE /messages/:id ─────────────────────────────────────────────────────
export async function deleteMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const message = await Message.findById(id);
  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return;
  }

  if (message.senderId.toString() !== req.userId) {
    res.status(403).json({ message: 'Only sender can delete the message' });
    return;
  }

  if (message.deleted) {
    res.json({ success: true, message });
    return;
  }

  // Soft delete: clear ciphertext and metadata but keep the record
  message.deleted = true;
  message.ciphertext = ''; 
  message.edited = false;
  message.reactions = [];
  await message.save();

  // Realtime broadcast to chat room
  emitMessageUpdate(io, message.chatId.toString(), {
    type: 'delete',
    messageId: message._id,
    deleted: true
  });

  res.json({ success: true, message });
}

// ─── POST /messages/:id/react ─────────────────────────────────────────────────
export async function reactToMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { emoji } = req.body;

  const message = await Message.findById(id);
  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return;
  }

  if (message.deleted) {
    res.status(400).json({ message: 'Cannot react to a deleted message' });
    return;
  }

  const me = new mongoose.Types.ObjectId(req.userId);

  // Check if user is part of the chat
  const chat = await Chat.findOne({ _id: message.chatId, members: me });
  if (!chat) {
    res.status(403).json({ message: 'Not a member of this chat' });
    return;
  }

  // Find existing reaction from this user
  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.userId.toString() === req.userId
  );

  if (emoji) {
    // Add or update reaction
    if (existingReactionIndex !== -1) {
      message.reactions[existingReactionIndex].emoji = emoji;
    } else {
      message.reactions.push({ userId: me, emoji });
    }
  } else {
    // Remove reaction if emoji is empty or null
    if (existingReactionIndex !== -1) {
      message.reactions.splice(existingReactionIndex, 1);
    }
  }

  await message.save();

  // Realtime broadcast to chat room
  emitMessageUpdate(io, message.chatId.toString(), {
    type: 'reaction',
    messageId: message._id,
    reactions: message.reactions
  });

  res.json({ success: true, reactions: message.reactions });
}
