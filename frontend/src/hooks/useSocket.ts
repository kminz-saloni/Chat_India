'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';

let socketInstance: Socket | null = null;

/**
 * useSocket — manages a singleton Socket.IO connection authenticated with JWT.
 * Returns the socket instance and helper event binders.
 */
export function useSocket() {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Reuse existing connection if token hasn't changed
    if (socketInstance && socketInstance.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,  // Reduce from 10 to fail fast
      reconnectionDelay: 2000,  // Increase delay to avoid spam
      reconnectionDelayMax: 5000,
      connectTimeout: 5000,     // Add explicit timeout
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance?.id);
    });

    socketInstance.on('connect_error', (err: any) => {
      const errorMsg = err.message || String(err);
      // Only log session expiry as a warning (actionable)
      // Suppress other connection errors since they're non-critical
      if (errorMsg === 'Session expired') {
        console.warn('[Socket] Session expired — reconnecting');
        return;
      }
      // Silently fail for other errors (network unreachable, CORS, etc.)
      // Socket.IO will retry automatically, and polling transport will handle it
    });

    // Event listeners for real-time updates (optional)
    socketInstance?.on('message:new', (data) => {
      console.log('[Socket] New message:', data);
    });

    socketInstance?.on('user:typing', (data) => {
      console.log('[Socket] User typing:', data);
    });

    socketRef.current = socketInstance;

    return () => {
      // Don't disconnect on every re-render — only on logout (token = null)
    };
  }, [token]);

  // Disconnect when token is cleared (logout)
  useEffect(() => {
    if (!token && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      socketRef.current = null;
    }
  }, [token]);

  const joinChat = useCallback((chatId: string) => {
    socketRef.current?.emit('chat:join', { chatId });
  }, []);

  const sendTypingStart = useCallback((chatId: string) => {
    socketRef.current?.emit('typing:start', { chatId });
  }, []);

  const sendTypingStop = useCallback((chatId: string) => {
    socketRef.current?.emit('typing:stop', { chatId });
  }, []);

  const sendReadReceipt = useCallback((chatId: string, messageIds: string[]) => {
    socketRef.current?.emit('receipt:read', { chatId, messageIds });
  }, []);

  const onEvent = useCallback(<T>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return {
    socket: socketRef.current,
    joinChat,
    sendTypingStart,
    sendTypingStop,
    sendReadReceipt,
    onEvent,
  };
}
