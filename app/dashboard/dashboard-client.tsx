'use client';

import { useEffect, useState } from 'react';
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

type Webhook = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
};

type ActivityPoint = {
  date: string;
  issued: number;
  verified: number;
  rejected: number;
};

const WEBHOOK_EVENT_OPTIONS = ['token.rejected', 'token.revoked'] as const;

type Props = {
  email: string;
  issuerId: string;
  publicKey: string | null;
  stats: { issued: number; verified: number; revoked: number; active: number };
  events: AuditEvent[];
  webhooks: Webhook[];
};

export default function DashboardClient({ email, issuerId, publicKey, stats, events, webhooks: initialWebhooks }: Props) {
  const router = useRouter();
  const [newPrivateKey, setNewPrivateKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [newUrl, setNewUrl] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([...WEBHOOK_EVENT_OPTIONS]);
  const [webhookBusy, setWebhookBusy] = useState<string | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/analytics')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setActivity(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault();
    setWebhookMessage(null);
    if (newEvents.length === 0) {
      setWebhookMessage({ kind: 'error', text: 'Select at least one event.' });
      return;
    }
    setWebhookBusy('add');
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, secret: newSecret, events: newEvents }),
    });
    const data = await res.json();
    setWebhookBusy(null);
    if (!res.ok) {
      setWebhookMessage({ kind: 'error', text: data.error ?? 'Could not add webhook' });
      return;
    }
    setWebhooks([data.webhook, ...webhooks]);
    setNewUrl('');
    setNewSecret('');
    setNewEvents([...WEBHOOK_EVENT_OPTIONS]);
    setWebhookMessage({ kind: 'ok', text: 'Webhook added.' });
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Delete this webhook?')) return;
    setWebhookBusy(id);
    setWebhookMessage(null);
    const res = await fetch(`/api/webhooks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setWebhookBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setWebhookMessage({ kind: 'error', text: data.error ?? 'Could not delete webhook' });
      return;
    }
    setWebhooks(webhooks.filter((w) => w.id !== id));
  }

  async function testWebhook(id: string) {
    setWebhookBusy(`test:${id}`);
    setWebhookMessage(null);
    const res = await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_id: id }),
    });
    const data = await res.json().catch(() => ({}));
    setWebhookBusy(null);
    if (data.delivered) {
      const parts = [`Test delivered (HTTP ${data.status}`];
      if (typeof data.elapsed_ms === 'number') parts.push(`${data.elapsed_ms}ms`);
      const head = `${parts.join(', ')}).`;
      const tail = data.response_snippet ? ` Response: ${data.response_snippet}` : '';
      setWebhookMessage({ kind: 'ok', text: head + tail });
    } else {
      const bits: string[] = [];
      if (typeof data.status === 'number') bits.push(`HTTP ${data.status}`);
      if (typeof data.elapsed_ms === 'number') bits.push(`${data.elapsed_ms}ms`);
      if (data.error) bits.push(data.error);
      if (data.url) bits.push(`→ ${data.url}`);
      setWebhookMessage({ kind: 'error', text: bits.length ? `Test failed: ${bits.join(' — ')}` : 'Test failed' });
    }
  }

  function toggleEvent(ev: string) {
    setNewEvents(newEvents.includes(ev) ? newEvents.filter((e) => e !== ev) : [...newEvents, ev]);
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

        {/* SECTION 2a — Activity */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ ...label, marginBottom: '1rem' }}>Activity</div>
          <div style={card}>
            {activity === null ? (
              <div style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                Loading…
              </div>
            ) : (
              <ActivityChart data={activity} />
            )}
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

        {/* SECTION 4 — Webhooks */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ ...label, marginBottom: '1rem' }}>Webhooks</div>

          <div style={{ ...card, marginBottom: '1rem' }}>
            {webhooks.length === 0 ? (
              <div style={{ color: '#666', fontSize: '0.85rem' }}>
                No webhooks yet. Add one below to get notified when tokens are rejected or revoked.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {webhooks.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #1a1a1a',
                      borderRadius: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#e0e0e0', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                        {w.url}
                      </div>
                      <div style={{ color: '#888', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                        {w.events.join(', ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => testWebhook(w.id)}
                        disabled={webhookBusy === `test:${w.id}`}
                        style={webhookBusy === `test:${w.id}` ? { ...btn, opacity: 0.5 } : btn}
                      >
                        {webhookBusy === `test:${w.id}` ? 'Testing…' : 'Test'}
                      </button>
                      <button
                        onClick={() => deleteWebhook(w.id)}
                        disabled={webhookBusy === w.id}
                        style={
                          webhookBusy === w.id
                            ? { ...btn, opacity: 0.5 }
                            : { ...btn, color: '#f87171' }
                        }
                      >
                        {webhookBusy === w.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={addWebhook} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ color: '#888', fontSize: '0.75rem' }}>Add a webhook</div>
            <input
              type="url"
              required
              placeholder="https://your-server.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              style={{
                backgroundColor: '#151515',
                color: '#e0e0e0',
                border: '1px solid #222',
                borderRadius: '4px',
                padding: '0.5rem 0.75rem',
                fontFamily: 'inherit',
                fontSize: '0.8rem',
              }}
            />
            <input
              type="text"
              required
              placeholder="shared secret (we use this to sign each payload)"
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              style={{
                backgroundColor: '#151515',
                color: '#e0e0e0',
                border: '1px solid #222',
                borderRadius: '4px',
                padding: '0.5rem 0.75rem',
                fontFamily: 'inherit',
                fontSize: '0.8rem',
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                <label
                  key={ev}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#ccc',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                  <code style={{ color: '#facc15', fontSize: '0.8rem' }}>{ev}</code>
                </label>
              ))}
            </div>
            <div>
              <button
                type="submit"
                disabled={webhookBusy === 'add'}
                style={webhookBusy === 'add' ? { ...btn, opacity: 0.5 } : btn}
              >
                {webhookBusy === 'add' ? 'Adding…' : 'Add webhook'}
              </button>
            </div>
            {webhookMessage && (
              <div
                style={{
                  color: webhookMessage.kind === 'ok' ? '#4ade80' : '#f87171',
                  fontSize: '0.8rem',
                }}
              >
                {webhookMessage.text}
              </div>
            )}
          </form>
        </section>

        {/* SECTION 5 — Quick start */}
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

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const width = 880;
  const height = 240;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const n = data.length;
  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.issued, d.verified, d.rejected]),
  );

  const x = (i: number) => padLeft + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => padTop + plotH - (v / maxVal) * plotH;

  const pathFor = (key: 'issued' | 'verified' | 'rejected') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[key])}`).join(' ');

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  const fmtDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const series: { key: 'issued' | 'verified' | 'rejected'; label: string; color: string }[] = [
    { key: 'issued', label: 'Tokens issued', color: '#60a5fa' },
    { key: 'verified', label: 'Verifications', color: '#4ade80' },
    { key: 'rejected', label: 'Rejections', color: '#f87171' },
  ];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Activity over the last 7 days"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y(t)}
              y2={y(t)}
              stroke="#1f1f1f"
              strokeWidth={1}
            />
            <text
              x={padLeft - 8}
              y={y(t) + 4}
              textAnchor="end"
              fill="#666"
              fontSize={10}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            >
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => (
          <text
            key={d.date}
            x={x(i)}
            y={height - 8}
            textAnchor="middle"
            fill="#666"
            fontSize={10}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          >
            {fmtDate(d.date)}
          </text>
        ))}

        {series.map((s) => (
          <g key={s.key}>
            <path d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={1.5} />
            {data.map((d, i) => (
              <circle
                key={`${s.key}-${i}`}
                cx={x(i)}
                cy={y(d[s.key])}
                r={2.5}
                fill={s.color}
              />
            ))}
          </g>
        ))}
      </svg>

      <div
        style={{
          display: 'flex',
          gap: '1.25rem',
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          color: '#aaa',
          flexWrap: 'wrap',
        }}
      >
        {series.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 2,
                backgroundColor: s.color,
              }}
            />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
