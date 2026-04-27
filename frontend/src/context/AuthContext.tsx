'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import {
  generateAndEncryptKeyPair,
  decryptAndCachePrivateKey,
  decryptAndCachePrivateKeyWithDerivedKey,
  clearCachedPrivateKey,
  getStoredDerivedKey,
} from '@/lib/crypto';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  cryptoReady: boolean;
  cryptoError: string | null;
  /**
   * Full register flow: generates keypair → calls /auth/register with keys.
   */
  register: (phone: string, name: string, password: string) => Promise<void>;
  /**
   * Login flow: authenticates → decrypts cached private key.
   */
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Manually unlock crypto after login if password was unavailable.
   */
  unlockCrypto: (password: string) => Promise<void>;
  setAuth: (user: AuthUser, token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cryptoReady, setCryptoReady] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  // ─── Restore session from localStorage ─────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('ci_token');
    const storedUser = localStorage.getItem('ci_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      const user = JSON.parse(storedUser);
      setUser(user);
      
      // Try to auto-decrypt using stored derived key (survives page refresh)
      const derivedKey = getStoredDerivedKey();
      if (derivedKey && user.encryptedPrivateKey) {
        decryptAndCachePrivateKeyWithDerivedKey(user.encryptedPrivateKey, derivedKey)
          .then(() => {
            setCryptoReady(true);
          })
          .catch(() => {
            // Derived key failed, prompt for password
            setCryptoReady(false);
            setCryptoError('Session recovered, but please re-enter password to decrypt messages.');
          });
      } else {
        // No stored derived key — prompt for password
        setCryptoReady(false);
      }
    }
    setLoading(false);
  }, []);

  // ─── Persist session ────────────────────────────────────────────────────────
  function persistSession(newUser: AuthUser, newToken: string) {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('ci_token', newToken);
    localStorage.setItem('ci_user', JSON.stringify(newUser));
  }

  function setAuth(newUser: AuthUser, newToken: string) {
    persistSession(newUser, newToken);
  }

  // ─── Register ───────────────────────────────────────────────────────────────
  async function register(phone: string, name: string, password: string) {
    setCryptoError(null);

    // Step 1: Generate keypair and encrypt private key with password
    const { publicKey, encryptedPrivateKey } = await generateAndEncryptKeyPair(password);

    // Step 2: Register on server — keys sent at creation time per API.md
    const data = await apiRequest<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: { phone, name, password, publicKey, encryptedPrivateKey },
    });

    // Step 3: Persist session — crypto private key is already cached in memory
    persistSession({ ...data.user, publicKey, encryptedPrivateKey }, data.token);
    setCryptoReady(true);
  }

  // ─── Login ──────────────────────────────────────────────────────────────────
  async function login(phone: string, password: string) {
    setCryptoError(null);

    const data = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { phone, password },
    });

    persistSession(data.user, data.token);

    // Decrypt private key and cache in memory
    if (data.user.encryptedPrivateKey) {
      try {
        await decryptAndCachePrivateKey(data.user.encryptedPrivateKey, password);
        setCryptoReady(true);
      } catch {
        setCryptoError('Could not decrypt your private key. Your messages cannot be read until you re-enter your password.');
        setCryptoReady(false);
      }
    }
  }

  // ─── Unlock crypto (post-refresh or recovery) ───────────────────────────────
  async function unlockCrypto(password: string) {
    setCryptoError(null);
    if (!user?.encryptedPrivateKey) {
      setCryptoError('No encrypted key found for this account.');
      return;
    }
    try {
      await decryptAndCachePrivateKey(user.encryptedPrivateKey, password);
      setCryptoReady(true);
    } catch {
      setCryptoError('Incorrect password. Cannot unlock encryption.');
    }
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────
  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST', token: token ?? undefined });
    } catch {
      // best-effort
    }
    // Securely clear the private key from memory
    clearCachedPrivateKey();
    setCryptoReady(false);
    setCryptoError(null);
    setUser(null);
    setToken(null);
    localStorage.removeItem('ci_token');
    localStorage.removeItem('ci_user');
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, cryptoReady, cryptoError, register, login, logout, unlockCrypto, setAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
