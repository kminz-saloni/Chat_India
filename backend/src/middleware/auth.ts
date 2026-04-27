import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Session } from '@/models/Session';

export interface AuthRequest extends Request {
  userId?: string;
  sessionId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret';

export function generateToken(userId: string, sessionId: string): string {
  return jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: '30d' });
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId: string };

    const session = await Session.findOne({
      _id: payload.sessionId,
      userId: payload.userId,
      active: true,
    }).select('_id');

    if (!session) {
      res.status(401).json({ message: 'Session expired' });
      return;
    }

    req.userId = payload.userId;
    req.sessionId = payload.sessionId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
