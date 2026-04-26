'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Step = 'phone' | 'otp' | 'details';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const prefillPhone = searchParams.get('phone') || '';

  const [step, setStep] = useState<Step>(prefillPhone ? 'details' : 'phone');
  const [phone, setPhone] = useState(prefillPhone.replace(/^\+\d{1,3}/, ''));
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [cryptoStatus, setCryptoStatus] = useState('');

  const fullPhone = prefillPhone || `${countryCode}${phone}`;

  useEffect(() => {
    if (prefillPhone) setStep('details');
  }, [prefillPhone]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ devOtp?: string }>('/auth/request-otp', {
        method: 'POST',
        body: { phone: `${countryCode}${phone}` },
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
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the complete 6-digit code'); return; }
    setLoading(true);
    try {
      await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: `${countryCode}${phone}`, code },
      });
      setStep('details');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setCryptoStatus('🔐 Generating encryption keys…');
    try {
      // register() handles key generation + server call in one step
      await register(fullPhone, name, password);
      setCryptoStatus('✅ Keys generated & encrypted');
      router.push('/chat');
    } catch (err: unknown) {
      setCryptoStatus('');
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const strengthColor = password.length === 0 ? 'transparent'
    : password.length < 8 ? '#f87171'
    : password.length < 12 ? '#facc15'
    : '#4ade80';

  const strengthLabel = password.length === 0 ? ''
    : password.length < 8 ? 'Too short'
    : password.length < 12 ? 'Fair'
    : password.length < 16 ? 'Strong'
    : 'Very strong';

  return (
    <div className="auth-bg">
      <div className="glass auth-card fade-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>✨</div>
          <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>Join Chat-India — privacy by default</p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {(['phone', 'otp', 'details'] as Step[]).map((s, i) => (
            <div key={s} style={{
              width: step === s ? 24 : 8, height: 8, borderRadius: 4,
              background: (['phone', 'otp', 'details'] as Step[]).indexOf(step) >= i ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s',
            }} />
          ))}
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
                <input type="tel" className="input-field" placeholder="10-digit number" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={15} required />
              </div>
            </div>
            {error && <div className="error-badge">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading || phone.length < 8}>
              {loading ? <span className="spinner" /> : 'Send OTP'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Already have an account? <Link href="/auth/login" className="text-link">Sign in</Link>
            </p>
          </form>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                Code sent to <strong style={{ color: 'var(--foreground)' }}>{countryCode}{phone}</strong>
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
              <span className="text-link" onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); }}>← Back</span>
            </p>
          </form>
        )}

        {/* Details step */}
        {step === 'details' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Full Name</label>
              <input type="text" className="input-field" placeholder="Your display name" value={name}
                onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Password</label>
              <input type="password" className="input-field" placeholder="At least 8 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, (password.length / 16) * 100)}%`, background: strengthColor, transition: 'width 0.3s, background 0.3s' }} />
              </div>
              {strengthLabel && <p style={{ fontSize: 11, color: strengthColor, marginTop: 4 }}>{strengthLabel}</p>}
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Confirm Password</label>
              <input type="password" className="input-field" placeholder="Repeat password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            {/* Crypto info notice */}
            <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
              🔐 <strong style={{ color: 'var(--foreground)' }}>End-to-end encrypted.</strong> Your password is used to protect your private key. Chat-India cannot read your messages.
            </div>

            {cryptoStatus && (
              <div style={{ fontSize: 12, color: 'var(--success)', textAlign: 'center' }}>{cryptoStatus}</div>
            )}
            {error && <div className="error-badge">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading || !name || !password}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="spinner" /> {cryptoStatus ? 'Encrypting keys…' : 'Creating account…'}
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-bg"><div className="spinner" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
