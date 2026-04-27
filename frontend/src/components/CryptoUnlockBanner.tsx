'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Shown when the user has a valid auth session but the private key
 * is not yet in memory (e.g. after a page refresh).
 * The user must re-enter their password to decrypt their private key locally.
 */
export default function CryptoUnlockBanner() {
  const { cryptoReady, cryptoError, unlockCrypto, user } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Don't show if crypto is already ready or user has no key
  if (cryptoReady || !user?.encryptedPrivateKey) return null;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    try {
      await unlockCrypto(password);
      setPassword('');
    } catch {
      setLocalError('Incorrect password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      background: 'rgba(15,17,24,0.96)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(108,99,255,0.45)',
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 18 }}>🔒</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', marginBottom: 2 }}>
          Messages are encrypted
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Re-enter your password to decrypt your private key
        </p>
        {(cryptoError || localError) && (
          <p style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{cryptoError || localError}</p>
        )}
      </div>
      <form onSubmit={handleUnlock} style={{ display: 'flex', gap: 8 }}>
        <input
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            background: 'rgba(243,245,251,0.12)',
            border: '1px solid rgba(243,245,251,0.3)',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--foreground)',
            fontSize: 13,
            outline: 'none',
            width: 180,
          }}
        />
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            background: 'linear-gradient(135deg, #6c63ff, #9b5de5)',
            border: 'none', borderRadius: 8,
            padding: '8px 16px',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? '…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
