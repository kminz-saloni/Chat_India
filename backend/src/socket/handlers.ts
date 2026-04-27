import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Session } from '@/models/Session';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret';

// userId → Set of socketIds (multi-tab support)
const onlineUsers = new Map<string, Set<string>>();

function addOnline(userId: string, socketId: string) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socketId);
}

function removeOnline(userId: string, socketId: string) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) onlineUsers.delete(userId);
  }
}

export function isOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

export function registerSocketHandlers(io: Server): void {
  // ─── Auth middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    console.log('[Socket] Incoming connection:', { socketId: socket.id, hasToken: !!token });
    
    if (!token) {
      console.warn('[Socket] Rejected: No token provided');
      return next(new Error('Unauthorized'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId: string };
      console.log('[Socket] Token verified:', { userId: payload.userId, sessionId: payload.sessionId });

      // Validate session is still active
      const session = await Session.findOne({ _id: payload.sessionId, active: true });
      if (!session) {
        console.warn(`[Socket] Session not found or inactive: ${payload.sessionId}`);
        return next(new Error('Session expired'));
      }

      // Update last active
      await Session.findByIdAndUpdate(payload.sessionId, { lastActive: new Date() });

      socket.data.userId = payload.userId;
      socket.data.sessionId = payload.sessionId;
      next();
    } catch (err) {
      console.error('[Socket] Auth error:', err instanceof Error ? err.message : String(err));
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId: string = socket.data.userId;
    console.log(`[Socket] User ${userId} connected (${socket.id})`);

    addOnline(userId, socket.id);

    // ─── Join personal room for user-specific events (e.g. panic) ──────────────
    socket.join(`user:${userId}`);

    // ─── Join all user's chat rooms ────────────────────────────────────────────
    const userChats = await Chat.find({ members: new mongoose.Types.ObjectId(userId) }).select('_id');
    for (const chat of userChats) {
      socket.join(`chat:${chat._id}`);
    }

    // ─── Notify contacts this user is online ──────────────────────────────────
    socket.broadcast.emit('presence:online', { userId });

    // ─── chat:join ────────────────────────────────────────────────────────────
    socket.on('chat:join', async (data: { chatId: string }) => {
      const { chatId } = data;
      const chat = await Chat.findOne({
        _id: chatId,
        members: new mongoose.Types.ObjectId(userId),
      });
      if (!chat) return;
      socket.join(`chat:${chatId}`);

      // Mark all messages in this chat as delivered
      await Message.updateMany(
        { chatId, senderId: { $ne: userId }, status: 'sent' },
        { status: 'delivered' },
      );
    });

    // ─── typing:start ─────────────────────────────────────────────────────────
    socket.on('typing:start', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('typing:start', { chatId: data.chatId, userId });
    });

    // ─── typing:stop ──────────────────────────────────────────────────────────
    socket.on('typing:stop', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('typing:stop', { chatId: data.chatId, userId });
    });

    // ─── receipt:read ─────────────────────────────────────────────────────────
    socket.on('receipt:read', async (data: { chatId: string; messageIds: string[] }) => {
      const { chatId, messageIds } = data;

      await Message.updateMany(
        { _id: { $in: messageIds }, chatId, senderId: { $ne: userId } },
        { status: 'read' },
      );

      // Notify the chat room (sender will update their tick)
      socket.to(`chat:${chatId}`).emit('receipt:read', { chatId, messageIds, readBy: userId });
    });

    // ─── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] User ${userId} disconnected (${socket.id})`);
      removeOnline(userId, socket.id);

      if (!isOnline(userId)) {
        // Broadcast offline only when all tabs are closed
        socket.broadcast.emit('presence:offline', { userId, lastSeen: new Date().toISOString() });
      }
    });
  });
}

/**
 * Emit a new message to all members of a chat room.
 * Called from the REST message controller after saving to DB.
 */
export function emitNewMessage(io: Server, chatId: string, message: unknown): void {
  io.to(`chat:${chatId}`).emit('message:new', message);
}

/**
 * Emit a message update (edit/delete) to a chat room.
 */
export function emitMessageUpdate(io: Server, chatId: string, update: unknown): void {
  io.to(`chat:${chatId}`).emit('message:updated', update);
}

/**
 * Emit a panic event to all active clients of a specific user.
 */
export function emitPanicEvent(io: Server, userId: string): void {
  io.to(`user:${userId}`).emit('panic:triggered', { timestamp: new Date().toISOString() });
}
