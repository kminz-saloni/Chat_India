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
}

export default function ChatSidebar({
  chats, activeChatId, onSelectChat, loading, onlineUsers, token, onChatCreated,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 className="gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>💬 Chats</h2>
          <a href="/settings/sessions" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>⚙️</a>
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
          <div style={{ padding: 32, textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        ) : chats.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🔐</p>
            <p>No chats yet.</p>
            <p style={{ marginTop: 4 }}>Search a phone number above to start a secure chat.</p>
          </div>
        ) : (
          chats.map((chat) => (
            <ChatRow
              key={chat._id}
              chat={chat}
              active={chat._id === activeChatId}
              online={!!onlineUsers[chat.contact?._id]}
              onClick={() => onSelectChat(chat)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChatRow({ chat, active, online, onClick }: { chat: ChatItem; active: boolean; online: boolean; onClick: () => void }) {
  const name = chat.contact?.name ?? 'Unknown';
  const time = chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', cursor: 'pointer',
        background: active ? 'rgba(108,99,255,0.12)' : 'transparent',
        borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 6 }}>{time}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
          🔒 Encrypted
        </p>
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
