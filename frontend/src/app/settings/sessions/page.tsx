'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

interface SessionItem {
  _id: string;
  deviceName: string;
  browser: string;
  lastActive: string;
  trusted: boolean;
}

export default function SessionsPage() {
  const { token, logout, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function fetchSessions() {
    if (!token) {
      setSessionLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ sessions: SessionItem[] }>('/auth/sessions', { token });
      setSessions(res.sessions);
    } catch {
      router.push('/auth/login');
    } finally {
      setSessionLoading(false);
    }
  }

  // Fetch sessions when token is available
  useEffect(() => {
    if (loading) return; // Still loading auth state
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchSessions();
  }, [token, loading, router]);

  async function revokeSession(id: string) {
    setRevoking(id);
    try {
      await apiRequest(`/auth/sessions/${id}`, { method: 'DELETE', token: token ?? undefined });
      setSessions((prev) => prev.filter((s) => s._id !== id));
    } catch { /* noop */ } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setRevoking('all');
    try {
      await apiRequest('/auth/sessions', { method: 'DELETE', token: token ?? undefined });
      // After revoking all sessions, logout the user
      await logout();
      router.push('/auth/login');
    } catch { /* noop */ } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="auth-bg" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="glass auth-card fade-in" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Active Sessions</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Manage devices with access to your account</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push('/chat')}
              style={{
                background: 'linear-gradient(135deg, #4a9eff, #2563eb)',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: '0 4px 12px rgba(74, 158, 255, 0.3)',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(74, 158, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 158, 255, 0.3)';
              }}
              title="Return to Chat"
            >
              ← BACK
            </button>
            <button
              onClick={() => { logout(); router.push('/auth/login'); }}
              style={{
                background: 'linear-gradient(135deg, #ff5555, #cc0000)',
                border: '2px solid #ff3333',
                borderRadius: 8,
                padding: '12px 24px',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
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
              title="Log out from this device - You will need to login again"
            >
              🚪 LOGOUT
            </button>
          </div>
        </div>

        {sessionLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sessions.map((s) => (
                <div key={s._id} className="glass" style={{ borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 18 }}>{s.deviceName === 'Mobile' ? '📱' : '💻'}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{s.browser} · {s.deviceName}</span>
                      {s.trusted && (
                        <span style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--success)', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                          TRUSTED
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Last active: {new Date(s.lastActive).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeSession(s._id)}
                    disabled={revoking === s._id}
                    style={{
                      background: 'rgba(248,113,113,0.15)',
                      border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: 8,
                      padding: '8px 14px',
                      color: 'var(--error)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(248,113,113,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(248,113,113,0.15)';
                    }}
                  >
                    {revoking === s._id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🚫 Revoke'}
                  </button>
                </div>
              ))}
            </div>

            {sessions.length > 1 && (
              <button
                onClick={revokeAll}
                disabled={revoking === 'all'}
                style={{
                  marginTop: 16,
                  width: '100%',
                  background: 'linear-gradient(135deg, #ff6b6b, #ff4444)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 68, 68, 0.3)';
                }}
              >
                {revoking === 'all' ? <span className="spinner" /> : '🚪 Revoke All Other Sessions'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
