'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ kind: 'error', text: error.message });
        setLoading(false);
        return;
      }

      if (!data.session) {
        setMessage({
          kind: 'info',
          text: 'Check your email to confirm your account, then log in.',
        });
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/after-signup', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        setMessage({ kind: 'error', text: payload.error || 'Could not register issuer' });
        setLoading(false);
        return;
      }

      setPrivateKey(payload.private_key);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ kind: 'error', text: error.message });
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  const input: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#151515',
    color: '#e0e0e0',
    border: '1px solid #222',
    borderRadius: '4px',
    padding: '0.75rem',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    marginBottom: '0.75rem',
  };

  const btn: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: '1px solid #333',
    padding: '0.75rem',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    cursor: 'pointer',
    borderRadius: '4px',
  };

  return (
    <main
      style={{
        backgroundColor: '#0a0a0a',
        color: '#e0e0e0',
        minHeight: '100vh',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '380px', width: '100%' }}>
        <Link
          href="/"
          style={{ color: '#888', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '2rem', display: 'block' }}
        >
          ← Agent Identity
        </Link>

        <h1 style={{ color: '#fff', fontSize: '1.5rem', margin: 0, marginBottom: '1.5rem' }}>
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </h1>

        {privateKey ? (
          <div>
            <div
              style={{
                backgroundColor: '#1a0f0f',
                border: '1px solid #3a1a1a',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem',
              }}
            >
              <div style={{ color: '#f87171', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Save this now
              </div>
              <p style={{ color: '#ccc', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
                This is your private key. It will <strong>not be shown again</strong>. Store it
                somewhere safe — you&apos;ll need it to sign tokens.
              </p>
            </div>
            <textarea
              readOnly
              value={privateKey}
              style={{ ...input, height: '6rem', resize: 'vertical', fontSize: '0.75rem' }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(privateKey);
              }}
              style={{ ...btn, marginBottom: '0.5rem' }}
            >
              Copy private key
            </button>
            <button
              onClick={() => {
                router.push('/dashboard');
                router.refresh();
              }}
              style={{ ...btn, backgroundColor: '#0f1a0f', border: '1px solid #1a3a1a', color: '#4ade80' }}
            >
              I saved it — go to dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={input}
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={input}
            />
            <button type="submit" disabled={loading} style={loading ? { ...btn, opacity: 0.5, cursor: 'not-allowed' } : btn}>
              {loading ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
            </button>

            {message && (
              <p
                style={{
                  color: message.kind === 'error' ? '#f87171' : '#4ade80',
                  fontSize: '0.8rem',
                  marginTop: '0.75rem',
                }}
              >
                {message.text}
              </p>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
              {mode === 'login' ? (
                <>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have one?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
