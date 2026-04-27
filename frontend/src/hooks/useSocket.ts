'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';

let socketInstance: Socket | null = null;
type SocketEventHandler = (data: unknown) => void;
const pendingEventHandlers = new Map<string, Set<SocketEventHandler>>();

function attachPendingHandlers(socket: Socket) {
  for (const [event, handlers] of pendingEventHandlers.entries()) {
    for (const handler of handlers) {
      socket.off(event, handler);
      socket.on(event, handler);
    }
  }
}

function resolveSocketUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (envUrl) return envUrl;

  if (typeof window === 'undefined') return 'http://localhost:5000';

  const { protocol, hostname } = window.location;

  // GitHub Codespaces forwarded ports use hostnames like:
  // <codespace>-3000.app.github.dev -> <codespace>-5000.app.github.dev
  if (hostname.endsWith('.app.github.dev')) {
    const mappedHost = hostname.replace(/-\d+\.app\.github\.dev$/, '-5000.app.github.dev');
    if (mappedHost !== hostname) {
      return `https://${mappedHost}`;
    }
  }

  const httpProtocol = protocol === 'https:' ? 'https:' : 'http:';
  return `${httpProtocol}//${hostname}:5000`;
}

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
      attachPendingHandlers(socketInstance);
      return;
    }

    // Route Socket.IO directly to backend (no proxy needed, CORS configured)
    const SOCKET_URL = resolveSocketUrl();

    console.log('[Socket] Connecting to:', SOCKET_URL, { hasToken: !!token });
    socketInstance = io(SOCKET_URL, {
      path: '/socket.io/',
      auth: { token },
      // Polling-first is more reliable behind proxies/tunnels and avoids websocket timeout loops.
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] ✓ Connected via', socketInstance?.io?.engine?.transport?.name, ':', socketInstance?.id);
      if (socketInstance) attachPendingHandlers(socketInstance);
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

    socketInstance.on('connect_error', (err: unknown) => {
      const socketError = err as { message?: string; data?: { message?: string }; type?: string; code?: string | number };
      const errorMsg = socketError?.message || socketError?.data?.message || String(err);
      console.error('[Socket] ✗ Connection error:', {
        message: errorMsg,
        type: socketError?.type,
        code: socketError?.code,
      });
    });

    socketRef.current = socketInstance;
    attachPendingHandlers(socketInstance);

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
    const normalizedHandler = handler as SocketEventHandler;
    let handlers = pendingEventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      pendingEventHandlers.set(event, handlers);
    }
    handlers.add(normalizedHandler);

    if (socketRef.current) {
      socketRef.current.off(event, normalizedHandler);
      socketRef.current.on(event, normalizedHandler);
    }

    return () => {
      const eventHandlers = pendingEventHandlers.get(event);
      if (eventHandlers) {
        eventHandlers.delete(normalizedHandler);
        if (eventHandlers.size === 0) pendingEventHandlers.delete(event);
      }
      socketRef.current?.off(event, normalizedHandler);
    };
  }, []);

  return {
    joinChat,
    sendTypingStart,
    sendTypingStop,
    sendReadReceipt,
    sendDeliveryReceipt,
    onEvent,
  };
}
