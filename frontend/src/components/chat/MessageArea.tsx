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
  onSend: (
    text: string,
    expirySeconds?: number,
    replyTo?: { messageId: string; previewText: string; senderId: string } | null,
  ) => Promise<void>;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onEdit: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string) => Promise<void>;
  onBack?: () => void;
  showVault?: boolean;
  onExitVault?: () => void;
}

export default function MessageArea({
  chat, messages, decryptedCache, currentUserId,
  isOnline, isTyping, loading, hasMore,
  onLoadMore, onSend, onTypingStart, onTypingStop,
  onEdit, onDelete, onReact, onBack, showVault, onExitVault,
}: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState<number>(0);
  const [customExpirySeconds, setCustomExpirySeconds] = useState<string>('');
  const [customExpiryUnit, setCustomExpiryUnit] = useState<'seconds' | 'minutes' | 'hours'>('seconds');
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ messageId: string; previewText: string; senderId: string } | null>(null);
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

  useEffect(() => {
    setReplyTo(null);
  }, [chat?._id]);

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

    const resolvedExpirySeconds = expirySeconds === -1
      ? Math.max(
          0,
          Math.floor(Number(customExpirySeconds)) *
            (customExpiryUnit === 'hours' ? 3600 : customExpiryUnit === 'minutes' ? 60 : 1),
        )
      : expirySeconds;

    if (expirySeconds === -1 && (!customExpirySeconds || resolvedExpirySeconds <= 0)) {
      return;
    }

    setInput('');
    onTypingStop();
    setSending(true);
    try {
      if (editMessageId) {
        await onEdit(editMessageId, text);
        setEditMessageId(null);
      } else {
        await onSend(text, resolvedExpirySeconds > 0 ? resolvedExpirySeconds : undefined, replyTo);
        setReplyTo(null);
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--muted)', background: 'var(--background)' }}>
        <div style={{ 
          fontSize: 64, 
          background: 'var(--surface-2)', 
          width: 120, height: 120, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          borderRadius: '50%', border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          marginBottom: 16
        }}>
          🔐
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Chat-India</h2>
        <p style={{ fontSize: 15, maxWidth: 300, textAlign: 'center', lineHeight: 1.5 }}>
          Select a conversation from the sidebar or start a new encrypted chat to begin messaging.
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--success)' }}>●</span> End-to-end Encrypted
        </p>
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
        padding: '16px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 10
      }}>
        {onBack && (
          <button 
            onClick={onBack}
            style={{ 
              background: 'none', border: 'none', color: 'var(--foreground)', 
              cursor: 'pointer', padding: '8px', marginRight: -4, marginLeft: -8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        )}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `hsl(${hue}, 60%, 40%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 600, color: '#fff'
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15 }}>{name}</p>
          <p style={{ fontSize: 12, color: isOnline ? 'var(--success)' : 'var(--muted)' }}>
            {isTyping ? '✍️ typing…' : isOnline ? '● Online' : 'Offline'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {onExitVault && (
            <button
              onClick={onExitVault}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 10 }}
              title="Back to chat list"
            >
              Back to Chats
            </button>
          )}
          <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }} title="Search chat">🔍</button>
          🔒 E2EE
        </div>
      </div>

      {showSearch && (
        <div style={{ padding: '8px 20px', background: 'rgba(243,245,251,0.08)', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: 'rgba(243,245,251,0.1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--foreground)', outline: 'none' }}
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
            style={{ alignSelf: 'center', background: 'rgba(243,245,251,0.14)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 16px', color: 'var(--foreground)', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}
          >
            {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Load earlier messages'}
          </button>
        )}

        {loading && messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start', opacity: 1 - i * 0.2 }}>
                <div style={{ width: 180 + (i * 30), height: 44, borderRadius: i % 2 === 0 ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: 'rgba(243,245,251,0.12)' }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              👋
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>Say Hello</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>This is the beginning of your secure chat with {name}.</p>
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
                    <span style={{ fontSize: 11, color: 'var(--foreground)', background: 'rgba(243,245,251,0.14)', padding: '2px 10px', borderRadius: 10 }}>
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
                  onReply={() => {
                    const previewText = text ?? '[Encrypted]';
                    setReplyTo({ messageId: msg._id, previewText, senderId: msg.senderId });
                  }}
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
      {replyTo && !editMessageId && (
        <div style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.08)', color: 'var(--muted)', fontSize: 13, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
          <span>Replying to: {replyTo.previewText.slice(0, 80)}</span>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>✕</button>
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
            background: 'rgba(243,245,251,0.12)',
            border: '1px solid rgba(243,245,251,0.24)',
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
        {!editMessageId && (
          <div style={{ position: 'relative' }}>
            <select
              value={expirySeconds}
              onChange={(e) => setExpirySeconds(Number(e.target.value))}
              title="Self-Destruct Timer"
              style={{
                background: expirySeconds > 0 ? 'var(--primary)' : 'rgba(243,245,251,0.14)',
                border: '1px solid rgba(243,245,251,0.24)',
                color: '#fff',
                height: 44,
                borderRadius: 22,
                padding: '0 12px',
                fontSize: 14,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              <option value={0}>⏳ Off</option>
              <option value={10}>⏳ 10s</option>
              <option value={60}>⏳ 1m</option>
              <option value={3600}>⏳ 1h</option>
              <option value={-1}>⏳ Custom</option>
            </select>
            <span style={{ position: 'absolute', right: 10, top: 14, pointerEvents: 'none', fontSize: 10 }}>▼</span>
            {expirySeconds === -1 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  placeholder="Amount"
                  value={customExpirySeconds}
                  onChange={(e) => setCustomExpirySeconds(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(243,245,251,0.14)',
                    border: '1px solid rgba(243,245,251,0.24)',
                    color: '#fff',
                    height: 36,
                    borderRadius: 10,
                    padding: '0 10px',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <select
                  value={customExpiryUnit}
                  onChange={(e) => setCustomExpiryUnit(e.target.value as 'seconds' | 'minutes' | 'hours')}
                  style={{
                    background: 'rgba(243,245,251,0.14)',
                    border: '1px solid rgba(243,245,251,0.24)',
                    color: '#fff',
                    height: 36,
                    borderRadius: 10,
                    padding: '0 10px',
                    fontSize: 12,
                    outline: 'none',
                  }}
                >
                  <option value="seconds">sec</option>
                  <option value="minutes">min</option>
                  <option value="hours">hr</option>
                </select>
              </div>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: input.trim() ? 'linear-gradient(135deg, #6c63ff, #9b5de5)' : 'rgba(243,245,251,0.16)',
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
  msg, isMine, text, currentUserId, onEdit, onDelete, onReact, onReply,
}: { 
  msg: Message; isMine: boolean; text?: string; currentUserId: string;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  const isOpt = msg._id.startsWith('opt-');
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [showActions, setShowActions] = useState(false);
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  const receiptState = msg.status === 'read' ? 'read' : msg.status === 'delivered' ? 'delivered' : 'sent';
  const receiptColor = receiptState === 'read' ? '#4ade80' : receiptState === 'delivered' ? '#7dd3fc' : 'var(--foreground)';
  const receiptLabel = receiptState === 'read' ? 'Read' : receiptState === 'delivered' ? 'Delivered' : 'Sent';

  // Calculate if message is expiring soon for visual cue
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!msg.selfDestructAt || msg.deleted) return;
    const interval = setInterval(() => {
      const remaining = new Date(msg.selfDestructAt!).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else if (remaining < 60000) {
        setTimeLeft(`${Math.ceil(remaining / 1000)}s`);
      } else {
        setTimeLeft(`${Math.ceil(remaining / 60000)}m`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [msg.selfDestructAt, msg.deleted]);

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
            : 'rgba(243,245,251,0.16)',
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
            <p style={{ 
              fontSize: 14, 
              lineHeight: 1.5, 
              wordBreak: 'break-word', 
              whiteSpace: 'pre-wrap',
              userSelect: msg.selfDestructAt ? 'none' : 'auto',
              WebkitUserSelect: msg.selfDestructAt ? 'none' : 'auto'
            }}>{text}</p>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
            {msg.selfDestructAt && !msg.deleted && (
              <span style={{ fontSize: 10, color: 'var(--danger)', opacity: 0.9, display: 'flex', alignItems: 'center', gap: 2 }}>
                ⏳ {timeLeft || '...'}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{time}</span>
            {isMine && (
              <span title={receiptLabel} style={{ fontSize: 12, fontWeight: 700, color: receiptColor, display: 'flex', gap: 3, alignItems: 'center' }}>
                {isOpt ? '○' : receiptState === 'read' ? '✓✓' : receiptState === 'delivered' ? '✓✓' : '✓'}
                <span style={{ fontSize: 10, color: receiptColor, opacity: 0.95 }}>{receiptLabel}</span>
              </span>
            )}
            {msg.edited && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>edited</span>}
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
