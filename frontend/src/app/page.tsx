'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

// Skip static generation for this page since it requires auth context
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) router.push('/chat');
      else router.push('/auth/login');
    }
  }, [user, loading, router]);

  return (
    <div className="auth-bg">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <p className="gradient-text" style={{ fontSize: 20, fontWeight: 700 }}>Chat-India</p>
      </div>
    </div>
  );
}
