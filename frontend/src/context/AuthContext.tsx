'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/api';

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
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: AuthUser, token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('ci_token');
    const storedUser = localStorage.getItem('ci_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  function setAuth(newUser: AuthUser, newToken: string) {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('ci_token', newToken);
    localStorage.setItem('ci_user', JSON.stringify(newUser));
  }

  async function login(phone: string, password: string) {
    const data = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { phone, password },
    });
    setAuth(data.user, data.token);
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST', token: token ?? undefined });
    } catch {
      // best-effort
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('ci_token');
    localStorage.removeItem('ci_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
