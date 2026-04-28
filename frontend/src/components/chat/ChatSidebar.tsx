'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { ChatItem, Contact } from '@/app/chat/page';

interface Props {
  chats: ChatItem[];
  activeChatId: string | null;
  onSelectChat: (chat: ChatItem) => void;
  loading: boolean;
  onlineUsers: Record<string, boolean>;
  token: string;
  onChatCreated: () => void;
  showVault?: boolean;
  onToggleVault?: () => void;
  onMoveToVault?: (chatId: string) => void;
  onPanic?: () => void;
}

export default function ChatSidebar({
  chats, activeChatId, onSelectChat, loading, onlineUsers, token, onChatCreated,
  showVault, onToggleVault, onMoveToVault, onPanic,
}: Props) {
  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread ?? 0), 0);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editChatId, setEditChatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleCreateNewChat(e: React.FormEvent) {
    e.preventDefault();
    if (!newChatPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setCreatingChat(true);
    try {
      // Search for user by phone
      const searchRes = await apiRequest<{ users: Contact[] }>(
        `/users/search?phone=${encodeURIComponent(newChatPhone)}`,
        { token },
      );

      if (!searchRes.users || searchRes.users.length === 0) {
        toast.error('No user found with that phone number');
        return;
      }

      const foundUser = searchRes.users[0];

      // Create chat with optional custom name
      await apiRequest('/chats', {
        method: 'POST',
        token,
        body: {
          memberId: foundUser._id,
          customName: newChatName.trim() || undefined,
        },
      });

      setNewChatPhone('');
      setNewChatName('');
      setShowNewChatModal(false);
      toast.success('Chat created successfully!');
      onChatCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create chat';
      toast.error(message);
    } finally {
      setCreatingChat(false);
    }
  }

  async function handleSaveCustomName(e: React.FormEvent) {
    e.preventDefault();
    if (!editChatId) return;
    if (!editName.trim()) {
      toast.error('Please enter a custom name');
      return;
    }

    setSavingEdit(true);
    try {
      await apiRequest(`/chats/${editChatId}/custom-name`, {
        method: 'PATCH',
        token,
        body: { customName: editName.trim() },
      });
      toast.success('Custom name updated');
      setShowEditModal(false);
      setEditChatId(null);
      setEditName('');
      onChatCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update name';
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div style={{
      width: 320, flexShrink: 0,
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 className="gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>
              {showVault ? '🔐 Vault' : '💬 Chats'}
            </h2>
            {!showVault && totalUnread > 0 && (
              <span style={{
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                padding: '0 6px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </div>
        {/* Action Buttons Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              aria-label="Trigger Panic Lock"
              onClick={onPanic}
              title="PANIC LOCK - Emergency Account Lock - Immediately locks your account and logs out all sessions"
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #ff5555, #cc0000)',
                border: '2px solid #ff3333',
                cursor: 'pointer',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                color: 'white',
                transition: 'all 0.25s',
                boxShadow: '0 4px 15px rgba(255, 85, 85, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 85, 85, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ff6666, #dd0000)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 85, 85, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ff5555, #cc0000)';
              }}
            >
              ⚠️ PANIC LOCK
            </button>
            <button
              aria-label={showVault ? 'Exit Vault' : 'Enter Hidden Vault'}
              onClick={onToggleVault}
              title={showVault ? 'Exit from Vault' : 'Enter Hidden Vault - Access private hidden chats'}
              style={{
                flex: 1,
                background: showVault ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : 'linear-gradient(135deg, #6c63ff, #5a4ecf)',
                border: showVault ? '2px solid #ffcc00' : '2px solid #5a4ecf',
                cursor: 'pointer',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                color: 'white',
                transition: 'all 0.25s',
                boxShadow: showVault ? '0 4px 15px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 4px 15px rgba(108, 99, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = showVault ? '0 6px 20px rgba(255, 215, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 6px 20px rgba(108, 99, 255, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = showVault ? '0 4px 15px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 4px 15px rgba(108, 99, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
            >
              {showVault ? '🔓 EXIT VAULT' : '🔐 VAULT'}
            </button>
          </div>
          <a
            href="/settings/sessions"
            aria-label="Open Settings and Sessions Management"
            title="Settings and Session Management - View active devices and logout other sessions"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #4a9eff, #2563eb)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.25s',
              boxShadow: '0 4px 15px rgba(74, 158, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              letterSpacing: '0.5px',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 158, 255, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #5aa5ff, #3b82f6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 158, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #4a9eff, #2563eb)';
            }}
          >
            ⚙️ SETTINGS
          </a>
        </div>
        {/* New Chat Button */}
        <button
          onClick={() => setShowNewChatModal(true)}
          disabled={showVault}
          style={{
            width: '100%',
            background: showVault ? 'rgba(108,99,255,0.3)' : 'linear-gradient(135deg, #6c63ff, #5a4ecf)',
            border: 'none',
            borderRadius: 8,
            padding: '12px 16px',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: showVault ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s',
            boxShadow: showVault ? 'none' : '0 4px 12px rgba(108, 99, 255, 0.3)',
          }}
          onMouseEnter={(e) => {
            if (!showVault) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(108, 99, 255, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = showVault ? 'none' : '0 4px 12px rgba(108, 99, 255, 0.3)';
          }}
          title={showVault ? 'Exit vault to start new chats' : 'Start a new chat'}
        >
          ➕ NEW CHAT
        </button>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', padding: 32, borderRadius: 16, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.3)' }}>
            <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700, textAlign: 'center' }}>💬 New Chat</h2>
            <p style={{ marginBottom: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Enter the phone number and optional custom name for this contact</p>
            <form onSubmit={handleCreateNewChat}>
              <input
                type="tel"
                placeholder="Phone number (e.g., +1234567890)"
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(243,245,251,0.12)',
                  border: '2px solid rgba(108,99,255,0.45)',
                  borderRadius: 10,
                  color: 'var(--foreground)',
                  outline: 'none',
                  marginBottom: 14,
                  fontSize: 15,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108,99,255,0.6)';
                  e.currentTarget.style.background = 'rgba(243,245,251,0.16)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(108,99,255,0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)';
                  e.currentTarget.style.background = 'rgba(243,245,251,0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                autoFocus
              />
              <input
                type="text"
                placeholder="Custom name (optional)"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(243,245,251,0.12)',
                  border: '2px solid rgba(108,99,255,0.45)',
                  borderRadius: 10,
                  color: 'var(--foreground)',
                  outline: 'none',
                  marginBottom: 20,
                  fontSize: 15,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108,99,255,0.6)';
                  e.currentTarget.style.background = 'rgba(243,245,251,0.16)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(108,99,255,0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)';
                  e.currentTarget.style.background = 'rgba(243,245,251,0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChatModal(false);
                    setNewChatPhone('');
                    setNewChatName('');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'rgba(243,245,251,0.1)',
                    border: '2px solid rgba(243,245,251,0.3)',
                    borderRadius: 10,
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(243,245,251,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(243,245,251,0.38)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(243,245,251,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(243,245,251,0.3)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingChat}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #6c63ff, #5a4ecf)',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    cursor: creatingChat ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    transition: 'all 0.2s',
                    opacity: creatingChat ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!creatingChat) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #7d72ff, #6c63ff)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #6c63ff, #5a4ecf)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {creatingChat ? '⏳ Creating...' : '✅ Create Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', opacity: 1 - i * 0.15 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(243,245,251,0.14)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ width: '60%', height: 14, borderRadius: 4, background: 'rgba(243,245,251,0.14)' }} />
                  <div style={{ width: '40%', height: 10, borderRadius: 4, background: 'rgba(243,245,251,0.1)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              {showVault ? '📭' : '💬'}
            </div>
            <p style={{ fontWeight: 600, color: 'var(--foreground)', marginTop: 8 }}>{showVault ? 'Vault is empty' : 'No chats yet'}</p>
            <p style={{ lineHeight: 1.5, fontSize: 13 }}>Search a phone number above to start a secure chat.</p>
          </div>
        ) : (
          chats.map((chat) => (
            <ChatRow
              key={chat._id}
              chat={chat}
              active={chat._id === activeChatId}
              online={!!onlineUsers[String(chat.contact?._id)]}
              onClick={() => onSelectChat(chat)}
              onMoveToVault={onMoveToVault ? () => onMoveToVault(chat._id) : undefined}
              inVault={showVault}
              onEditName={() => {
                setEditChatId(chat._id);
                setEditName(chat.contact?.name ?? '');
                setShowEditModal(true);
              }}
            />
          ))
        )}
      </div>

      {/* Edit Custom Name Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', padding: 32, borderRadius: 16, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.3)' }}>
            <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700, textAlign: 'center' }}>✏️ Edit Contact Name</h2>
            <p style={{ marginBottom: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Update the custom name shown only to you</p>
            <form onSubmit={handleSaveCustomName}>
              <input
                type="text"
                placeholder="Custom name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(243,245,251,0.12)',
                  border: '2px solid rgba(108,99,255,0.45)',
                  borderRadius: 10,
                  color: 'var(--foreground)',
                  outline: 'none',
                  marginBottom: 20,
                  fontSize: 15,
                  transition: 'all 0.2s',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditChatId(null);
                    setEditName('');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'rgba(243,245,251,0.1)',
                    border: '2px solid rgba(243,245,251,0.3)',
                    borderRadius: 10,
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #6c63ff, #5a4ecf)',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    cursor: savingEdit ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    transition: 'all 0.2s',
                    opacity: savingEdit ? 0.7 : 1,
                  }}
                >
                  {savingEdit ? '⏳ Saving...' : '✅ Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatRow({ chat, active, online, onClick, onMoveToVault, inVault, onEditName }: { chat: ChatItem; active: boolean; online: boolean; onClick: () => void; onMoveToVault?: () => void; inVault?: boolean; onEditName?: () => void }) {
  const name = chat.contact?.name ?? 'Unknown';
  const time = chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const unread = chat.unread ?? 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Chat with ${name}`}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', cursor: 'pointer',
        background: active ? 'rgba(108,99,255,0.2)' : 'transparent',
        borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(e) => { setHovered(true); if (!active) e.currentTarget.style.background = 'rgba(243,245,251,0.1)'; }}
      onMouseLeave={(e) => { setHovered(false); if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar name={name} size={42} />
        {online && (
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--success)',
            border: '2px solid var(--surface)',
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6, flexShrink: 0 }}>
            {unread > 0 && (
              <span style={{
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                padding: '0 6px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{time}</span>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
          🔒 Encrypted
        </p>

        {hovered && onMoveToVault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveToVault();
            }}
            title={inVault ? "Remove from Vault" : "Move to Vault"}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 10,
              cursor: 'pointer',
              color: 'var(--foreground)'
            }}
          >
            {inVault ? "Remove" : "Move to Vault"}
          </button>
        )}
        {hovered && onEditName && !inVault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditName();
            }}
            title="Edit custom name"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 10,
              cursor: 'pointer',
              color: 'var(--foreground)'
            }}
          >
            Rename
          </button>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, size }: { name: string; size: number }) {
  const initial = name?.[0]?.toUpperCase() ?? '?';
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},60%,40%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, color: '#fff', flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}
