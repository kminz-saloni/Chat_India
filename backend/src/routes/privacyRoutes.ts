import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';
import {
  setupVault,
  unlockVault,
  moveChatToVault,
  triggerPanic,
  getVaultChats,
  resetVault,
} from '@/controllers/privacyController';

const router = Router();

router.use(authMiddleware);

router.post('/vault/setup', setupVault);
router.post('/vault/unlock', unlockVault);
router.post('/vault/reset', resetVault);
router.post('/vault/move-chat', moveChatToVault);
router.get('/vault/chats', getVaultChats);
router.post('/panic/trigger', triggerPanic);

export default router;
