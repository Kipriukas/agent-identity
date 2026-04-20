'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type AuditEvent = {
  id?: string | number;
  event_type: string;
  agent_id: string | null;
  human_principal?: string | null;
  success: boolean | null;
  created_at: string;
  details?: string | null;
};

type Props = {
  email: string;
  issuerId: string;
  publicKey: string | null;
  stats: { issued: number; verified: number; revoked: number; active: number };
  events: AuditEvent[];
};

export default function DashboardClient({ email, issuerId, publicKey, stats, events }: Props) {
  const router = useRouter();
  const [newPrivateKey, setNewPrivateKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function generateNewKeys() {
    if (!confirm('Generate a new key pair? This will invalidate all tokens signed with your current private key.')) {
      return;
    }
    setGenerating(true);
    const res = await fetch('/api/keys/generate', { method: 'POST' });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) {
      setNewPrivateKey(data.private_key);
    } else {
      alert(data.error ?? 'Could not generate keys');
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  async function downloadCsv() {
    const res = await fetch(`/api/audit?issuer_id=${issuerId}&limit=10000`);
    const data = await res.json();
    const rows = data.events as AuditEvent[];
    const header = ['created_at', 'event_type', 'agent_id', 'human_principal', 'success', 'details'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.join(','),
      ...rows.map((e) => header.map((k) => escape((e as Record<string, unknown>)[k])).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-events-${issuerId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const card: React.CSSProperties = {
    padding: '1rem',
    backgroundColor: '#111',
    border: '1px solid #1f1f1f',
    borderRadius: '4px',
  };

  const label: React.CSSProperties = {
    fontSize: '0.7rem',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const btn: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    color: '#e0e0e0',
    border: '1px solid #333',
    padding: '0.5rem 0.85rem',
    fontFamily: 'inherit',
    fontSize: '0.8rem',
    cursor: 'pointer',
    borderRadius: '4px',
  };

  const colorForEvent = (e: AuditEvent) => {
    if (e.event_type === 'token.verified' && e.success) return '#4ade80';
    if (e.event_type === 'token.rejected' || e.event_type === 'token.revoked') return '#f87171';
    if (e.event_type === 'issuer.registered' || e.event_type === 'token.issued' || e.event_type === 'key.rotated') return '#60a5fa';
    return '#aaa';
  };

  const quickStart = `import { issueToken, loadPrivateKey } from 'agent-identity-sdk'

const token = await issueToken({
  privateKey: await loadPrivateKey(process.env.PRIVATE_KEY!),
  issuer_id: '${issuerId}',
  human_principal: 'user@example.com',
  delegation_scope: ['email:read'],
  agent_config: { model: 'claude-sonnet-4-6', system_prompt: '...' }
})`;

  return (
    <main
      style={{
        backgroundColor: '#0a0a0a',
        color: '#e0e0e0',
        minHeight: '100vh',
        padding: '3rem 2rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* NAV */}
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2.5rem',
            fontSize: '0.875rem',
          }}
        >
          <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>
            Agent Identity
          </Link>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <Link href="/docs" style={{ color: '#aaa', textDecoration: 'none' }}>Docs</Link>
            <span style={{ color: '#666' }}>{email}</span>
            <button onClick={signOut} style={btn}>Sign out</button>
          </div>
        </nav>

        <h1 style={{ color: '#fff', fontSize: '1.75rem', margin: 0, marginBottom: '2.5rem', letterSpacing: '-0.01em' }}>
          Dashboard
        </h1>

        {/* SECTION 1 — Credentials */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ ...label, marginBottom: '1rem' }}>Your credentials</div>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.25rem' }}>issuer_id</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ fontSize: '0.8rem', color: '#facc15', flex: 1, wordBreak: 'break-all' }}>{issuerId}</code>
                <button onClick={() => copy(issuerId, 'issuer')} style={btn}>
                  {copied === 'issuer' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.25rem' }}>public_key</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <code style={{ fontSize: '0.75rem', color: '#999', flex: 1, wordBreak: 'break-all' }}>
                  {publicKey ?? '—'}
                </code>
                {publicKey && (
                  <button onClick={() => copy(publicKey, 'pub')} style={btn}>
                    {copied === 'pub' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            <div>
              <button onClick={generateNewKeys} disabled={generating} style={generating ? { ...btn, opacity: 0.5 } : btn}>
                {generating ? 'Generating…' : 'Generate new key pair'}
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2 — Stats */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ ...label, marginBottom: '1rem' }}>Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {[
              ['Tokens issued', stats.issued],
              ['Verifications', stats.verified],
              ['Revocations', stats.revoked],
              ['Active agents', stats.active],
            ].map(([name, value]) => (
              <div key={name as string} style={card}>
                <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  {name}
                </div>
                <div style={{ color: '#fff', fontSize: '1.75rem' }}>{value as number}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3 — Recent events */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={label}>Recent events</div>
            <button onClick={downloadCsv} style={btn}>Download CSV</button>
          </div>
          <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
            {events.length === 0 ? (
              <div style={{ padding: '1.5rem', color: '#666', fontSize: '0.85rem', textAlign: 'center' }}>
                No events yet
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    {['Time', 'Event', 'Agent', 'Principal', 'Success'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          color: '#666',
                          fontWeight: 'normal',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #1f1f1f',
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          backgroundColor: '#0f0f0f',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.id ?? i}>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #161616', color: '#888' }}>
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #161616', color: colorForEvent(e) }}>
                        {e.event_type}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #161616', color: '#999' }}>
                        {e.agent_id ? `${e.agent_id.slice(0, 12)}…` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #161616', color: '#ccc' }}>
                        {e.human_principal ?? '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #161616', color: e.success === false ? '#f87171' : e.success ? '#4ade80' : '#666' }}>
                        {e.success === null ? '—' : e.success ? '✓' : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* SECTION 4 — Quick start */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={label}>Quick start for your account</div>
            <button onClick={() => copy(quickStart, 'snippet')} style={btn}>
              {copied === 'snippet' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre
            style={{
              backgroundColor: '#151515',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.8rem',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            {quickStart}
          </pre>
        </section>
      </div>

      {/* Key rotation modal */}
      {newPrivateKey && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #3a1a1a',
              borderRadius: '6px',
              padding: '1.5rem',
              maxWidth: '520px',
              width: '100%',
            }}
          >
            <h2 style={{ color: '#f87171', margin: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
              Save your new private key
            </h2>
            <p style={{ color: '#ccc', fontSize: '0.85rem', margin: 0, marginBottom: '1rem', lineHeight: 1.6 }}>
              Copy and save this now. It <strong>will not be shown again</strong>. Your old private key no
              longer works.
            </p>
            <textarea
              readOnly
              value={newPrivateKey}
              style={{
                width: '100%',
                height: '6rem',
                backgroundColor: '#151515',
                color: '#e0e0e0',
                border: '1px solid #222',
                borderRadius: '4px',
                padding: '0.75rem',
                fontFamily: 'inherit',
                fontSize: '0.75rem',
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: '0.75rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => copy(newPrivateKey, 'newkey')} style={btn}>
                {copied === 'newkey' ? 'Copied' : 'Copy private key'}
              </button>
              <button
                onClick={() => {
                  setNewPrivateKey(null);
                  router.refresh();
                }}
                style={{ ...btn, backgroundColor: '#0f1a0f', border: '1px solid #1a3a1a', color: '#4ade80' }}
              >
                I saved it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
