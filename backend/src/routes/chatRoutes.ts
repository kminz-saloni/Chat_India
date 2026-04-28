import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';
import {
  searchUsers,
  createOrGetChat,
  getMyChats,
  sendMessage,
  getMessages,
  updateCustomName,
} from '@/controllers/chatController';

const router = Router();

router.use(authMiddleware);

// Users
router.get('/users/search', searchUsers);

// Chats
router.post('/chats', createOrGetChat);
router.get('/chats', getMyChats);
router.get('/chats/:chatId/messages', getMessages);
router.patch('/chats/:chatId/custom-name', updateCustomName);

// Messages
router.post('/messages', sendMessage);

export default router;
