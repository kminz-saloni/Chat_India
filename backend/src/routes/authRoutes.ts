import { Router } from 'express';
import {
  requestOtp,
  verifyOtp,
  register,
  login,
  logout,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  deleteAccount,
  uploadKeys,
  panicUnlock,
} from '@/controllers/authController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

// Public routes
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/panic-unlock', panicUnlock);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.get('/sessions', authMiddleware, getSessions);
router.delete('/sessions/:sessionId', authMiddleware, revokeSession);
router.delete('/sessions', authMiddleware, revokeAllOtherSessions);
router.delete('/account', authMiddleware, deleteAccount);
router.patch('/keys', authMiddleware, uploadKeys);

export default router;
