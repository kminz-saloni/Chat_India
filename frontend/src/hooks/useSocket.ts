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
    if (!token) {
      console.log('[Socket] No token, skipping connection');
      return;
    }

    // Reuse existing connection if token hasn't changed
    if (socketInstance && socketInstance.connected) {
      console.log('[Socket] Reusing existing connection');
      socketRef.current = socketInstance;
      return;
    }

    // Route Socket.IO directly to backend (no proxy needed, CORS configured)
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const SOCKET_URL = `${protocol}//${hostname}:5000`;

    console.log('[Socket] Connecting to:', SOCKET_URL, { hasToken: !!token });
    socketInstance = io(SOCKET_URL, {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] ✓ Connected via', socketInstance?.io?.engine?.transport?.name, ':', socketInstance?.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[Socket] ✗ Disconnected:', reason);
    });

    // Track polling attempts
    socketInstance.io?.engine?.on('upgrade', (transport) => {
      console.log('[Socket] Transport upgraded to:', transport.name);
    });

    socketInstance.io?.on('error', (error) => {
      console.error('[Socket] Engine error:', error);
    });

    socketInstance.on('connect_error', (err: any) => {
      const errorMsg = err?.message || err?.data?.message || String(err);
      console.error('[Socket] ✗ Connection error:', {
        message: errorMsg,
        type: err?.type,
        code: err?.code,
      });
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

  const sendDeliveryReceipt = useCallback((chatId: string, messageIds: string[]) => {
    socketRef.current?.emit('receipt:delivered', { chatId, messageIds });
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
    sendDeliveryReceipt,
    onEvent,
  };
}
