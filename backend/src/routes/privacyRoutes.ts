import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';
import {
  setupVault,
  unlockVault,
  moveChatToVault,
  triggerPanic,
  triggerPanicByPhrase,
  getVaultChats,
  resetVault,
  getVaultInfo,
  getPanicSettings,
  upsertPanicSettings,
} from '@/controllers/privacyController';

const router = Router();

router.use(authMiddleware);

router.get('/vault/info', getVaultInfo);
router.post('/vault/setup', setupVault);
router.post('/vault/unlock', unlockVault);
router.post('/vault/reset', resetVault);
router.post('/vault/move-chat', moveChatToVault);
router.get('/vault/chats', getVaultChats);
router.get('/panic/settings', getPanicSettings);
router.post('/panic/settings', upsertPanicSettings);
router.post('/panic/trigger', triggerPanic);
router.post('/panic/trigger-phrase', triggerPanicByPhrase);

export default router;
