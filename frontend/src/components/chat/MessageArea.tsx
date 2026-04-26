'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message, Contact } from '@/app/chat/page';

interface Props {
  chat: { _id: string; contact: Contact } | null;
  messages: Message[];
  decryptedCache: Record<string, string>;
  currentUserId: string;
  isOnline: boolean;
  isTyping: boolean;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSend: (text: string) => Promise<void>;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onEdit: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string) => Promise<void>;
}

export default function MessageArea({
  chat, messages, decryptedCache, currentUserId,
  isOnline, isTyping, loading, hasMore,
  onLoadMore, onSend, onTypingStart, onTypingStop,
  onEdit, onDelete, onReact,
}: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const handleInput = useCallback((val: string) => {
    setInput(val);
    onTypingStart();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTypingStop(), 1500);
  }, [onTypingStart, onTypingStop]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    onTypingStop();
    setSending(true);
    try {
      if (editMessageId) {
        await onEdit(editMessageId, text);
        setEditMessageId(null);
      } else {
        await onSend(text);
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  if (!chat) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
        <div style={{ fontSize: 56 }}>🔐</div>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)' }}>Chat-India</p>
        <p style={{ fontSize: 14 }}>Select a chat or search for a contact to get started</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>All messages are end-to-end encrypted</p>
      </div>
    );
  }

  const name = chat.contact?.name ?? 'Unknown';
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `hsl(${hue},60%,40%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, color: '#fff',
        }}>
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15 }}>{name}</p>
          <p style={{ fontSize: 12, color: isOnline ? 'var(--success)' : 'var(--muted)' }}>
            {isTyping ? '✍️ typing…' : isOnline ? '● Online' : 'Offline'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }} title="Search chat">🔍</button>
          🔒 E2EE
        </div>
      </div>

      {showSearch && (
        <div style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--foreground)', outline: 'none' }}
          />
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loading}
            style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 16px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}
          >
            {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Load earlier messages'}
          </button>
        )}

        {loading && messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 13 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>👋</p>
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.filter(msg => {
            if (!searchQuery) return true;
            const text = decryptedCache[msg._id];
            return text && text.toLowerCase().includes(searchQuery.toLowerCase());
          }).map((msg, i, arr) => {
            const isMine = msg.senderId === currentUserId;
            const text = decryptedCache[msg._id];
            const showDate = i === 0 || !isSameDay(arr[i - 1].createdAt, msg.createdAt);
            return (
              <div key={msg._id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '12px 0 4px' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: 10 }}>
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble 
                  msg={msg} 
                  isMine={isMine} 
                  text={text} 
                  currentUserId={currentUserId}
                  onEdit={(text) => { setEditMessageId(msg._id); setInput(text); }}
                  onDelete={() => onDelete(msg._id)}
                  onReact={(emoji) => onReact(msg._id, emoji)}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {editMessageId && (
        <div style={{ padding: '8px 16px', background: 'rgba(108,99,255,0.1)', color: 'var(--muted)', fontSize: 13, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
          <span>Editing message</span>
          <button onClick={() => { setEditMessageId(null); setInput(''); }} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          padding: '12px 16px',
          borderTop: editMessageId ? 'none' : '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '12px 14px',
            color: 'var(--foreground)',
            fontSize: 14,
            outline: 'none',
            resize: 'none',
            maxHeight: 120,
            overflowY: 'auto',
            lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: input.trim() ? 'linear-gradient(135deg, #6c63ff, #9b5de5)' : 'rgba(255,255,255,0.08)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'all 0.2s', flexShrink: 0,
            boxShadow: input.trim() ? '0 4px 16px rgba(108,99,255,0.4)' : 'none',
          }}
        >
          {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '➤'}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ 
  msg, isMine, text, currentUserId, onEdit, onDelete, onReact 
}: { 
  msg: Message; isMine: boolean; text?: string; currentUserId: string;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  const isOpt = msg._id.startsWith('opt-');
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [showActions, setShowActions] = useState(false);
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  // Aggregate reactions
  const reactionCounts: Record<string, number> = {};
  msg.reactions?.forEach(r => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });
  const myReaction = msg.reactions?.find(r => r.userId === currentUserId)?.emoji;

  return (
    <div 
      style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 2 }}
      onMouseEnter={() => !msg.deleted && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, maxWidth: '85%' }}>
        
        {/* Message Bubble */}
        <div style={{
          background: isMine
            ? 'linear-gradient(135deg, rgba(108,99,255,0.8), rgba(155,93,229,0.8))'
            : 'rgba(255,255,255,0.07)',
          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '10px 14px',
          backdropFilter: 'blur(8px)',
          border: isMine ? 'none' : '1px solid var(--border)',
          position: 'relative',
        }}>
          {msg.deleted ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Message deleted</p>
          ) : text === undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="spinner" style={{ width: 10, height: 10 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Decrypting…</span>
            </div>
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{text}</p>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{time}</span>
            {isMine && (
              <span style={{ fontSize: 11, color: msg.status === 'read' ? '#6c63ff' : 'rgba(255,255,255,0.4)' }}>
                {isOpt ? '○' : msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
              </span>
            )}
            {msg.edited && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>edited</span>}
          </div>

          {/* Reactions Display */}
          {!msg.deleted && msg.reactions && msg.reactions.length > 0 && (
            <div style={{
              display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap',
              position: 'absolute', bottom: -12, [isMine ? 'right' : 'left']: 16,
              background: 'var(--surface)', padding: '2px 6px', borderRadius: 10, border: '1px solid var(--border)'
            }}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <span 
                  key={emoji} 
                  style={{ fontSize: 11, cursor: 'pointer', opacity: myReaction === emoji ? 1 : 0.7 }}
                  onClick={() => onReact(myReaction === emoji ? '' : emoji)} // toggle
                >
                  {emoji} {count > 1 ? count : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Menu */}
        {showActions && !isOpt && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: '4px 8px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 14 }}>
            {emojis.map(e => (
              <span 
                key={e} 
                style={{ cursor: 'pointer', padding: '0 2px', filter: myReaction === e ? 'none' : 'grayscale(100%)', opacity: myReaction === e ? 1 : 0.6 }}
                onClick={() => { onReact(myReaction === e ? '' : e); setShowActions(false); }}
                title="React"
              >{e}</span>
            ))}
            {isMine && text !== undefined && (
              <>
                <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
                <button onClick={() => { onEdit(text); setShowActions(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0 4px' }} title="Edit">✏️</button>
                <button onClick={() => { if(confirm('Delete for everyone?')) { onDelete(); setShowActions(false); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4f', padding: '0 4px' }} title="Delete">🗑️</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function isSameDay(a: string, b: string) {
  const da = new Date(a); const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getDate() - d.getDate();
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
