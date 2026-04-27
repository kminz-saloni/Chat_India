'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useCrypto } from '@/hooks/useCrypto';
import { toast } from 'react-hot-toast';
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
  reactions?: { userId: string; emoji: string }[];
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

  // Vault state
  const [showVault, setShowVault] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPinPrompt, setVaultPinPrompt] = useState(false);
  const [vaultPin, setVaultPin] = useState('');

  // Mobile layout state
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user, router]);

  // ─── Load chat list ────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    if (!token) return;
    try {
      const endpoint = showVault && vaultUnlocked ? '/vault/chats' : '/chats';
      const data = await apiRequest<{ chats: ChatItem[] }>(endpoint, { token });
      setChats(data.chats);
      
      // If active chat is no longer in the list, close it
      if (activeChatId && !data.chats.find(c => c._id === activeChatId)) {
        setActiveChatId(null);
        setActiveContact(null);
        setMessages([]);
      }
    } catch {
      /* noop */
    } finally {
      setChatsLoading(false);
    }
  }, [token, showVault, vaultUnlocked, activeChatId]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // ─── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const offNewMsg = onEvent<Message>('message:new', (msg) => {
      if (msg.chatId === activeChatId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
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

    const offMsgUpdate = onEvent<any>('message:updated', (update) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== update.messageId) return m;
          
          if (update.type === 'edit') {
            if (cryptoReady && update.ciphertext) {
              decrypt(update.ciphertext)
                .then((pt) => setDecryptedCache((c) => ({ ...c, [m._id]: pt })))
                .catch(() => setDecryptedCache((c) => ({ ...c, [m._id]: '[Encrypted]' })));
            }
            return { ...m, ciphertext: update.ciphertext, edited: true };
          }
          if (update.type === 'delete') {
            return { ...m, deleted: true, ciphertext: '', edited: false, reactions: [] };
          }
          if (update.type === 'reaction') {
            return { ...m, reactions: update.reactions };
          }
          return m;
        })
      );
    });

    const { logout } = require('@/context/AuthContext');
    const offPanic = onEvent('panic:triggered', () => {
      setChats([]);
      setMessages([]);
      setDecryptedCache({});
      setVaultUnlocked(false);
      setShowVault(false);
      
      // We must invoke logout from context (could get it from useAuth but we don't want it in dependency array)
      window.location.href = '/auth/login'; // Force redirect and wipe
      localStorage.removeItem('ci_token');
      localStorage.removeItem('ci_user');
    });

    return () => {
      offNewMsg(); offTypingStart(); offTypingStop();
      offOnline(); offOffline(); offReceipt(); offMsgUpdate(); offPanic();
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

  async function handleSendMessage(plaintext: string, expirySeconds?: number) {
    if (!activeChatId || !activeContact?.publicKey || !token) return;
    const { encryptAndPackMessage } = await import('@/lib/crypto');
    const ciphertext = await encryptAndPackMessage(plaintext, activeContact.publicKey);
    
    let selfDestructAt: string | undefined;
    if (expirySeconds) {
      selfDestructAt = new Date(Date.now() + expirySeconds * 1000).toISOString();
    }

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
      selfDestructAt,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDecryptedCache((c) => ({ ...c, [optimistic._id]: plaintext }));

    try {
      const data = await apiRequest<{ message: Message }>('/messages', {
        method: 'POST',
        token,
        body: { chatId: activeChatId, ciphertext, selfDestructAt },
      });
      // Replace optimistic with real or remove optimistic if socket already added it
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m._id === data.message._id);
        if (alreadyExists) {
          return prev.filter((m) => m._id !== optimistic._id);
        }
        return prev.map((m) => (m._id === optimistic._id ? data.message : m));
      });
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

  async function handleEditMessage(messageId: string, newPlaintext: string) {
    if (!activeContact?.publicKey || !token) return;
    const { encryptAndPackMessage } = await import('@/lib/crypto');
    const ciphertext = await encryptAndPackMessage(newPlaintext, activeContact.publicKey);
    
    // Optimistic
    setDecryptedCache((prev) => ({ ...prev, [messageId]: newPlaintext }));
    setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, edited: true } : m));
    
    try {
      await apiRequest(`/messages/${messageId}`, {
        method: 'PATCH',
        token,
        body: { ciphertext },
      });
    } catch { /* noop */ }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!token) return;
    // Optimistic
    setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, deleted: true, ciphertext: '', edited: false, reactions: [] } : m));
    try {
      await apiRequest(`/messages/${messageId}`, {
        method: 'DELETE',
        token,
      });
    } catch { /* noop */ }
  }

  async function handleReactMessage(messageId: string, emoji: string) {
    if (!token) return;
    // Optimistic - we'll just send to server and let it update via socket or local state isn't strictly needed if socket is fast, but let's do optimistic
    setMessages((prev) => prev.map(m => {
      if (m._id !== messageId) return m;
      const existing = m.reactions?.filter(r => r.userId !== user?.id) || [];
      return { ...m, reactions: emoji ? [...existing, { userId: user?.id || '', emoji }] : existing };
    }));
    try {
      await apiRequest(`/messages/${messageId}/react`, {
        method: 'POST',
        token,
        body: { emoji },
      });
    } catch { /* noop */ }
  }

  async function handleMoveToVault(chatId: string) {
    if (!token) return;
    try {
      await apiRequest('/vault/move-chat', { method: 'POST', token, body: { chatId } });
      loadChats();
    } catch { /* noop */ }
  }

  async function handleVaultUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    
    if (!vaultPin.trim()) {
      toast.error('Please enter a PIN or password');
      return;
    }
    
    const userInput = vaultPin;
    
    try {
      // Try to unlock as PIN first
      await apiRequest('/vault/unlock', { method: 'POST', token, body: { pin: userInput } });
      setVaultUnlocked(true);
      setVaultPinPrompt(false);
      setVaultPin('');
      toast.success('Vault unlocked!');
    } catch (err: any) {
      const errorMessage = err.message || '';
      
      // If vault PIN not set, skip password try and go straight to setup
      if (errorMessage.includes('Vault PIN not set')) {
        try {
          await apiRequest('/vault/setup', { method: 'POST', token, body: { pin: userInput } });
          setVaultUnlocked(true);
          setVaultPinPrompt(false);
          setVaultPin('');
          toast.success('✅ Vault PIN configured! You can now hide chats.');
        } catch {
          toast.error('⚠️ Failed to setup vault PIN');
          setVaultPin(''); // Clear on error for retry
        }
        return;
      }
      
      // PIN failed, try password as fallback
      if (errorMessage.includes('Invalid PIN')) {
        try {
          await apiRequest('/vault/unlock', { method: 'POST', token, body: { password: userInput } });
          setVaultUnlocked(true);
          setVaultPinPrompt(false);
          setVaultPin('');
          toast.success('Vault unlocked!');
        } catch {
          // Both PIN and password failed
          toast.error('❌ Wrong PIN or password. Try again or cancel.');
          setVaultPin(''); // Clear input for retry
        }
        return;
      }
      
      // Generic error
      toast.error('Error unlocking vault');
      setVaultPin('');
    }
  }

  async function triggerPanic() {
    if (!token) return;
    try {
      await apiRequest('/panic/trigger', { method: 'POST', token, body: { secretCode: '#LOCK' } });
    } catch { /* noop */ }
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

      {/* Vault Unlock Modal */}
      {vaultPinPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', padding: 32, borderRadius: 16, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.3)' }}>
            <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700, textAlign: 'center' }}>🔐 Unlock Vault</h2>
            <p style={{ marginBottom: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Enter your PIN or password to access hidden chats</p>
            <form onSubmit={handleVaultUnlock}>
              <input 
                type="password" 
                placeholder="Enter PIN or Password" 
                value={vaultPin}
                onChange={e => setVaultPin(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '2px solid rgba(108,99,255,0.3)', 
                  borderRadius: 10, 
                  color: '#fff', 
                  outline: 'none', 
                  marginBottom: 20,
                  fontSize: 15,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108,99,255,0.6)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(108,99,255,0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  type="button" 
                  onClick={() => { setVaultPinPrompt(false); setShowVault(false); }} 
                  style={{ 
                    flex: 1, 
                    padding: '14px 16px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '2px solid rgba(255,255,255,0.15)', 
                    borderRadius: 10, 
                    color: '#fff', 
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    flex: 1, 
                    padding: '14px 16px', 
                    background: 'linear-gradient(135deg, #6c63ff, #5a4ecf)', 
                    border: 'none', 
                    borderRadius: 10, 
                    color: '#fff', 
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #7d72ff, #6c63ff)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(108,99,255,0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #6c63ff, #5a4ecf)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(108,99,255,0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🔓 Unlock
                </button>
              </div>
            </form>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <button
                onClick={async () => {
                  if (confirm('⚠️ This will clear your vault PIN. Are you sure?\n\nAll hidden chats will still exist but no longer be protected.')) {
                    try {
                      await apiRequest('/vault/reset', { method: 'POST', token });
                      setVaultPinPrompt(false);
                      setShowVault(false);
                      setVaultPin('');
                      toast.success('✅ Vault PIN cleared. Set a new one when ready.');
                    } catch {
                      toast.error('Failed to reset vault');
                    }
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  textDecoration: 'underline',
                  transition: 'color 0.2s',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ff6b6b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                🔄 Forgot PIN? Reset Vault
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingTop: cryptoReady ? 0 : 0 }}>
        {/* Sidebar - hide on mobile if chat is active */}
        <div style={{ 
          width: isMobile ? '100%' : 320, 
          display: (isMobile && activeChatId) ? 'none' : 'flex',
          flexDirection: 'column',
          borderRight: isMobile ? 'none' : '1px solid var(--border)'
        }}>
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={openChat}
            loading={chatsLoading}
            onlineUsers={onlineUsers}
            token={token ?? ''}
          onChatCreated={loadChats}
          showVault={showVault}
          onToggleVault={() => {
            if (showVault) {
              setShowVault(false);
              setVaultUnlocked(false);
            } else {
              setShowVault(true);
              setVaultPinPrompt(true);
            }
          }}
          onMoveToVault={handleMoveToVault}
          onPanic={triggerPanic}
        />
        </div>

        {/* Message Area - hide on mobile if no chat is active */}
        <div style={{ 
          flex: 1, 
          display: (isMobile && !activeChatId) ? 'none' : 'flex',
          flexDirection: 'column'
        }}>
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
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onReact={handleReactMessage}
          onBack={isMobile ? () => setActiveChatId(null) : undefined}
        />
        </div>
      </div>
    </div>
  );
}
