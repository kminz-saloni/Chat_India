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
}

export default function MessageArea({
  chat, messages, decryptedCache, currentUserId,
  isOnline, isTyping, loading, hasMore,
  onLoadMore, onSend, onTypingStart, onTypingStop,
}: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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
      await onSend(text);
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
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
          🔒 E2EE
        </div>
      </div>

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
          messages.map((msg, i) => {
            const isMine = msg.senderId === currentUserId;
            const text = decryptedCache[msg._id];
            const showDate = i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt);
            return (
              <div key={msg._id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '12px 0 4px' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: 10 }}>
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble msg={msg} isMine={isMine} text={text} />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
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

function MessageBubble({ msg, isMine, text }: { msg: Message; isMine: boolean; text?: string }) {
  const isOpt = msg._id.startsWith('opt-');
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
      <div style={{
        maxWidth: '70%',
        background: isMine
          ? 'linear-gradient(135deg, rgba(108,99,255,0.8), rgba(155,93,229,0.8))'
          : 'rgba(255,255,255,0.07)',
        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px',
        backdropFilter: 'blur(8px)',
        border: isMine ? 'none' : '1px solid var(--border)',
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
          {msg.edited && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>edited</span>}
        </div>
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
