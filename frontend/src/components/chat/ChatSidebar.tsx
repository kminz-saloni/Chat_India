'use client';

import { useState, useRef } from 'react';
import { apiRequest } from '@/lib/api';
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
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSearch(q: string) {
    setSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiRequest<{ users: Contact[] }>(
          `/users/search?phone=${encodeURIComponent(q)}`,
          { token },
        );
        setSearchResults(res.users);
      } catch { /* noop */ } finally { setSearching(false); }
    }, 350);
  }

  async function startChat(contact: Contact) {
    try {
      await apiRequest('/chats', { method: 'POST', token, body: { memberId: contact._id } });
      setSearch('');
      setSearchResults([]);
      onChatCreated();
    } catch { /* noop */ }
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
          <h2 className="gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>
            {showVault ? '🔐 Vault' : '💬 Chats'}
          </h2>
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
        {/* Search */}
        <input
          type="text"
          className="input-field"
          placeholder="Search by phone to start chat…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ fontSize: 13, padding: '10px 14px' }}
        />
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
            {searching ? 'Searching…' : 'Results'}
          </p>
          {searchResults.map((u) => (
            <div
              key={u._id}
              onClick={() => startChat(u)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar name={u.name} size={36} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{u.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', opacity: 1 - i * 0.15 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ width: '60%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ width: '40%', height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
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
              online={!!onlineUsers[chat.contact?._id]}
              onClick={() => onSelectChat(chat)}
              onMoveToVault={onMoveToVault ? () => onMoveToVault(chat._id) : undefined}
              inVault={showVault}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChatRow({ chat, active, online, onClick, onMoveToVault, inVault }: { chat: ChatItem; active: boolean; online: boolean; onClick: () => void; onMoveToVault?: () => void; inVault?: boolean }) {
  const name = chat.contact?.name ?? 'Unknown';
  const time = chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
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
        background: active ? 'rgba(108,99,255,0.12)' : 'transparent',
        borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(e) => { setHovered(true); if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
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
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 6 }}>{time}</span>
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
              color: 'var(--muted)'
            }}
          >
            {inVault ? "Remove" : "Move to Vault"}
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
