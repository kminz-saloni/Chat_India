'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useCrypto } from '@/hooks/useCrypto';
import CryptoUnlockBanner from '@/components/CryptoUnlockBanner';
import ChatSidebar from '@/components/chat/ChatSidebar';
import MessageArea from '@/components/chat/MessageArea';

export interface Contact {
  _id: string;
  name: string;
  phone: string;
  publicKey: string;
}

export interface ChatItem {
  _id: string;
  contact: Contact;
  lastMessage?: { ciphertext: string; createdAt: string };
  updatedAt: string;
  unread?: number;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  ciphertext: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  deleted: boolean;
  edited: boolean;
  selfDestructAt?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const { ready: cryptoReady, decrypt } = useCrypto();
  const { joinChat, sendTypingStart, sendTypingStop, sendReadReceipt, onEvent } = useSocket();

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // ─── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user, router]);

  // ─── Load chat list ────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ chats: ChatItem[] }>('/chats', { token });
      setChats(data.chats);
    } catch {
      /* noop */
    } finally {
      setChatsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // ─── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const offNewMsg = onEvent<Message>('message:new', (msg) => {
      if (msg.chatId === activeChatId) {
        setMessages((prev) => [...prev, msg]);
        // Auto read-receipt
        sendReadReceipt(msg.chatId, [msg._id]);
        // Decrypt immediately
        if (cryptoReady) {
          decrypt(msg.ciphertext)
            .then((pt) => setDecryptedCache((c) => ({ ...c, [msg._id]: pt })))
            .catch(() => setDecryptedCache((c) => ({ ...c, [msg._id]: '[Encrypted]' })));
        }
      }
      // Bump the chat to top in sidebar
      loadChats();
    });

    const offTypingStart = onEvent<{ chatId: string; userId: string }>('typing:start', ({ chatId, userId }) => {
      if (chatId === activeChatId) setTypingUsers((t) => ({ ...t, [userId]: true }));
    });

    const offTypingStop = onEvent<{ chatId: string; userId: string }>('typing:stop', ({ chatId, userId }) => {
      if (chatId === activeChatId) setTypingUsers((t) => ({ ...t, [userId]: false }));
    });

    const offOnline = onEvent<{ userId: string }>('presence:online', ({ userId }) => {
      setOnlineUsers((o) => ({ ...o, [userId]: true }));
    });

    const offOffline = onEvent<{ userId: string }>('presence:offline', ({ userId }) => {
      setOnlineUsers((o) => ({ ...o, [userId]: false }));
    });

    const offReceipt = onEvent<{ chatId: string; messageIds: string[] }>('receipt:read', ({ chatId, messageIds }) => {
      if (chatId === activeChatId) {
        setMessages((prev) =>
          prev.map((m) => (messageIds.includes(m._id) ? { ...m, status: 'read' } : m)),
        );
      }
    });

    return () => {
      offNewMsg(); offTypingStart(); offTypingStop();
      offOnline(); offOffline(); offReceipt();
    };
  }, [activeChatId, cryptoReady, onEvent, sendReadReceipt, decrypt, loadChats]);

  // ─── Open a chat ───────────────────────────────────────────────────────────
  async function openChat(chat: ChatItem) {
    setActiveChatId(chat._id);
    setActiveContact(chat.contact);
    setMessages([]);
    setDecryptedCache({});
    setMessagesPage(1);
    setMsgsLoading(true);

    joinChat(chat._id);

    try {
      const data = await apiRequest<{ messages: Message[]; hasMore: boolean }>(
        `/chats/${chat._id}/messages?page=1`,
        { token: token ?? undefined },
      );
      setMessages(data.messages);
      setHasMore(data.hasMore);

      // Mark all as read
      const unread = data.messages.filter((m) => m.senderId !== user?.id && m.status !== 'read');
      if (unread.length > 0) sendReadReceipt(chat._id, unread.map((m) => m._id));

      // Decrypt all
      if (cryptoReady) {
        const pairs = await Promise.all(
          data.messages.map(async (m) => {
            try {
              const pt = await decrypt(m.ciphertext);
              return [m._id, pt] as const;
            } catch {
              return [m._id, '[Encrypted]'] as const;
            }
          }),
        );
        setDecryptedCache(Object.fromEntries(pairs));
      }
    } catch {
      /* noop */
    } finally {
      setMsgsLoading(false);
    }
  }

  async function loadMoreMessages() {
    if (!activeChatId || !hasMore || msgsLoading) return;
    const nextPage = messagesPage + 1;
    setMsgsLoading(true);
    try {
      const data = await apiRequest<{ messages: Message[]; hasMore: boolean }>(
        `/chats/${activeChatId}/messages?page=${nextPage}`,
        { token: token ?? undefined },
      );
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setMessagesPage(nextPage);
      if (cryptoReady) {
        const pairs = await Promise.all(
          data.messages.map(async (m) => {
            try { return [m._id, await decrypt(m.ciphertext)] as const; }
            catch { return [m._id, '[Encrypted]'] as const; }
          }),
        );
        setDecryptedCache((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
      }
    } catch { /* noop */ } finally { setMsgsLoading(false); }
  }

  async function handleSendMessage(plaintext: string) {
    if (!activeChatId || !activeContact?.publicKey || !token) return;
    const { encryptAndPackMessage } = await import('@/lib/crypto');
    const ciphertext = await encryptAndPackMessage(plaintext, activeContact.publicKey);

    // Optimistic
    const optimistic: Message = {
      _id: `opt-${Date.now()}`,
      chatId: activeChatId,
      senderId: user?.id ?? '',
      ciphertext,
      status: 'sent',
      createdAt: new Date().toISOString(),
      deleted: false,
      edited: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDecryptedCache((c) => ({ ...c, [optimistic._id]: plaintext }));

    try {
      const data = await apiRequest<{ message: Message }>('/messages', {
        method: 'POST',
        token,
        body: { chatId: activeChatId, ciphertext },
      });
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => (m._id === optimistic._id ? data.message : m)));
      setDecryptedCache((c) => {
        const next = { ...c, [data.message._id]: plaintext };
        delete next[optimistic._id];
        return next;
      });
      loadChats();
    } catch {
      // Mark failed
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? { ...m, status: 'sent' } : m)),
      );
    }
  }

  const isContactOnline = activeContact ? !!onlineUsers[activeContact._id] : false;
  const isContactTyping = activeContact ? !!typingUsers[activeContact._id] : false;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      <CryptoUnlockBanner />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingTop: cryptoReady ? 0 : 0 }}>
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={openChat}
          loading={chatsLoading}
          onlineUsers={onlineUsers}
          token={token ?? ''}
          onChatCreated={loadChats}
        />
        <MessageArea
          chat={activeChatId ? { _id: activeChatId, contact: activeContact! } : null}
          messages={messages}
          decryptedCache={decryptedCache}
          currentUserId={user?.id ?? ''}
          isOnline={isContactOnline}
          isTyping={isContactTyping}
          loading={msgsLoading}
          hasMore={hasMore}
          onLoadMore={loadMoreMessages}
          onSend={handleSendMessage}
          onTypingStart={() => activeChatId && sendTypingStart(activeChatId)}
          onTypingStop={() => activeChatId && sendTypingStop(activeChatId)}
        />
      </div>
    </div>
  );
}
