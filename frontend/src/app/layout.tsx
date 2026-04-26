import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Chat-India — Secure Conversations. Hidden Control. Trusted Privacy.',
  description:
    'A privacy-first secure chat platform with end-to-end encryption, hidden vaults, and panic lock protection.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: 'var(--surface-2)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
