import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';
import {
  setupVault,
  unlockVault,
  moveChatToVault,
  triggerPanic,
  getVaultChats,
  resetVault,
  getVaultInfo,
} from '@/controllers/privacyController';

const router = Router();

router.use(authMiddleware);

router.get('/vault/info', getVaultInfo);
router.post('/vault/setup', setupVault);
router.post('/vault/unlock', unlockVault);
router.post('/vault/reset', resetVault);
router.post('/vault/move-chat', moveChatToVault);
router.get('/vault/chats', getVaultChats);
router.post('/panic/trigger', triggerPanic);

export default router;
