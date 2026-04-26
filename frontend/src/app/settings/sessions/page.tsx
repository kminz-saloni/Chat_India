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
  const { token, logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function fetchSessions() {
    try {
      const res = await apiRequest<{ sessions: SessionItem[] }>('/auth/sessions', { token: token ?? undefined });
      setSessions(res.sessions);
    } catch {
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSessions(); }, []); // eslint-disable-line

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
      await fetchSessions();
    } catch { /* noop */ } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="auth-bg" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="glass auth-card fade-in" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Active Sessions</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Manage devices with access to your account</p>
          </div>
          <button
            onClick={() => { logout(); router.push('/auth/login'); }}
            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '8px 14px', color: 'var(--error)', fontSize: 13, cursor: 'pointer' }}
          >
            Log out
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sessions.map((s) => (
                <div key={s._id} className="glass" style={{ borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
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
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}
                  >
                    {revoking === s._id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Revoke'}
                  </button>
                </div>
              ))}
            </div>

            {sessions.length > 1 && (
              <button
                onClick={revokeAll}
                disabled={revoking === 'all'}
                style={{ marginTop: 16, width: '100%', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px', color: 'var(--error)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {revoking === 'all' ? <span className="spinner" /> : 'Revoke All Other Sessions'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
