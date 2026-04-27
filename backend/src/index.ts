import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from '@/utils/db';
import authRoutes from '@/routes/authRoutes';
import chatRoutes from '@/routes/chatRoutes';
import messageRoutes from '@/routes/messageRoutes';
import privacyRoutes from '@/routes/privacyRoutes';
import { registerSocketHandlers } from '@/socket/handlers';
import { startCleanupJob } from '@/jobs/cleanup';

dotenv.config();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development for Socket.IO
      // In production, restrict to specific domains
      if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:3000'
        ];
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      } else {
        callback(null, true);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],  // Ensure both transports available
});

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down.' },
  }),
);

// ─── Middleware ────────────────────────────────────────────────────────────────
// CORS configuration - allow multiple origins for development
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS rejected origin: ${origin}`);
      callback(null, true); // Allow in dev, restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', privacyRoutes);
app.use('/api', chatRoutes);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', app: 'Chat-India API' });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
registerSocketHandlers(io);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    startCleanupJob();
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });
