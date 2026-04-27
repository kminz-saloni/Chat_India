'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Step = 'phone' | 'otp' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const fullPhone = `${countryCode}${phone}`;

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string; devOtp?: string }>('/auth/request-otp', {
        method: 'POST',
        body: { phone: fullPhone },
      });
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await apiRequest<{ isNewUser: boolean }>('/auth/verify-otp', {
        method: 'POST',
        body: { phone: fullPhone, code },
      });
      setIsNewUser(res.isNewUser);
      if (res.isNewUser) {
        router.push(`/auth/register?phone=${encodeURIComponent(fullPhone)}`);
      } else {
        setStep('password');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsLocked(false);
    try {
      // login() handles auth + crypto key decryption
      await login(fullPhone, password);
      router.push('/chat');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      if (msg.includes('locked')) {
        setIsLocked(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/auth/panic-unlock', {
        method: 'POST',
        body: { phone: fullPhone, password },
      });
      await login(fullPhone, password);
      router.push('/chat');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="glass auth-card fade-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🔐</div>
          <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800 }}>Chat-India</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>Secure Conversations. Hidden Control.</p>
        </div>

        {/* Phone step */}
        {step === 'phone' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Phone Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="input-field" style={{ width: 90 }}>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <input type="tel" id="phone" className="input-field" placeholder="10-digit number"
                  value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={15} required />
              </div>
            </div>
            {error && <div className="error-badge">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading || phone.length < 8}>
              {loading ? <span className="spinner" /> : 'Send OTP'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              New user? <Link href="/auth/register" className="text-link">Create account</Link>
            </p>
          </form>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                OTP sent to <strong style={{ color: 'var(--foreground)' }}>{fullPhone}</strong>
              </p>
              {devOtp && <p style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 12 }}>[Dev] OTP: {devOtp}</p>}
              <div className="otp-grid">
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" className="otp-input"
                    value={digit} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)} maxLength={1} />
                ))}
              </div>
            </div>
            {error && <div className="error-badge">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Verify OTP'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              <span className="text-link" onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); }}>← Change number</span>
            </p>
          </form>
        )}

        {/* Password step */}
        {step === 'password' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Password</label>
              <input type="password" id="password" className="input-field" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
            </div>
            <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
              🔐 Your password decrypts your private key locally. It never leaves your device.
            </div>
            {error && <div className="error-badge">{error}</div>}
            
            {isLocked ? (
              <button type="button" onClick={handleUnlock} className="btn-primary" style={{ backgroundColor: '#ef4444' }} disabled={loading || !password}>
                {loading ? <span className="spinner" /> : 'Unlock Account'}
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={loading || !password}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span className="spinner" /> Decrypting keys…
                  </span>
                ) : 'Sign In'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
