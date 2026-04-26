import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';
import {
  editMessage,
  deleteMessage,
  reactToMessage,
} from '@/controllers/messageController';

const router = Router();

router.use(authMiddleware);

router.patch('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/react', reactToMessage);

export default router;
