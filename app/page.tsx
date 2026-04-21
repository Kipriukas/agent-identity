'use client';

import { useState } from 'react';
import Link from 'next/link';

type VerifyResult = { valid: boolean; claims?: unknown; reason?: string; error?: string };

export default function Home() {
  const [jwt, setJwt] = useState('');
  const [agentId, setAgentId] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function generate() {
    setLoading('generate');
    setVerifyResult(null);
    const res = await fetch('/api/demo/generate', { method: 'POST' });
    const data = await res.json();
    setJwt(data.jwt);
    setAgentId(data.agent_id);
    setLoading(null);
  }

  async function verify() {
    setLoading('verify');
    const res = await fetch(`/api/verify/${agentId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    setVerifyResult(await res.json());
    setLoading(null);
  }

  async function revoke() {
    setLoading('revoke');
    await fetch('/api/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, issuer_id: 'my-registry', reason: 'Demo revocation' }),
    });
    const res = await fetch(`/api/verify/${agentId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    setVerifyResult(await res.json());
    setLoading(null);
  }

  const btnStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    color: '#e0e0e0',
    border: '1px solid #333',
    padding: '0.5rem 1rem',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    cursor: 'pointer',
    borderRadius: '4px',
  };
  const disabledBtn: React.CSSProperties = { ...btnStyle, opacity: 0.4, cursor: 'not-allowed' };

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#666',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const codeBlock: React.CSSProperties = {
    backgroundColor: '#151515',
    padding: '1rem',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '0.8rem',
    lineHeight: '1.6',
    margin: 0,
  };

  return (
    <main
      style={{
        backgroundColor: '#0a0a0a',
        color: '#e0e0e0',
        minHeight: '100vh',
        padding: '4rem 2rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* NAV */}
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '3rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ color: '#fff' }}>Agent Identity</div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/docs" style={{ color: '#aaa', textDecoration: 'none' }}>
              Docs
            </Link>
            <Link href="/integrations" style={{ color: '#aaa', textDecoration: 'none' }}>
              Integrations
            </Link>
            <Link href="/dashboard" style={{ color: '#aaa', textDecoration: 'none' }}>
              Dashboard
            </Link>
            <a
              href="https://www.npmjs.com/package/agent-identity-sdk"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#aaa', textDecoration: 'none' }}
            >
              npm
            </a>
            <a
              href="https://github.com/Kipriukas/agent-identity"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#aaa', textDecoration: 'none' }}
            >
              GitHub
            </a>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
            Agent Identity
          </h1>
          <p style={{ color: '#aaa', fontSize: '1.1rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
            Verify which AI agent is calling your API — and what it&apos;s allowed to do
          </p>
        </section>

        {/* THE PROBLEM */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={sectionLabel}>The problem</div>
          <p style={{ color: '#ccc', lineHeight: 1.7, margin: 0 }}>
            AI agents are calling APIs, booking things, sending emails, and making decisions on
            behalf of users. But there&apos;s no standard way to verify: is this agent real? Did
            the human actually authorize this? What is it allowed to do? Right now developers
            either skip this entirely or hand-roll bespoke logic per project.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={sectionLabel}>How it works</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              ['1', 'Issue', "Your agent gets a signed token: who it is, who authorized it, what it can do"],
              ['2', 'Present', 'Agent includes the token in every API call it makes'],
              ['3', 'Verify', 'Receiving service calls verifyToken() — one line, instant answer'],
            ].map(([num, title, desc]) => (
              <div
                key={num}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: '#111',
                  border: '1px solid #1f1f1f',
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{
                    color: '#4ade80',
                    fontSize: '0.875rem',
                    width: '2rem',
                    flexShrink: 0,
                    paddingTop: '0.125rem',
                  }}
                >
                  0{num}
                </div>
                <div>
                  <div style={{ color: '#fff', marginBottom: '0.25rem' }}>{title}</div>
                  <div style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* REAL EXAMPLE */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={sectionLabel}>Real example</div>
          <p style={{ color: '#ccc', lineHeight: 1.7, marginTop: 0, marginBottom: '1.5rem' }}>
            You&apos;re building a customer service agent that reads emails and creates support
            tickets.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#1a0f0f',
                border: '1px solid #3a1a1a',
                borderRadius: '4px',
              }}
            >
              <div style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Without Agent Identity
              </div>
              <p style={{ color: '#ccc', margin: 0, lineHeight: 1.6, fontSize: '0.9rem' }}>
                Your backend has no idea if the request is from your authorized agent or a random
                bot. You just hope for the best.
              </p>
            </div>

            <div
              style={{
                padding: '1rem',
                backgroundColor: '#0f1a0f',
                border: '1px solid #1a3a1a',
                borderRadius: '4px',
              }}
            >
              <div style={{ color: '#4ade80', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                With Agent Identity
              </div>
              <p style={{ color: '#ccc', margin: 0, lineHeight: 1.6, fontSize: '0.9rem' }}>
                Every call your agent makes carries a signed token proving it was authorized by
                the user, scoped to only <code style={{ color: '#facc15' }}>email:read</code> and{' '}
                <code style={{ color: '#facc15' }}>tickets:create</code>. Your backend verifies in
                one line. If the agent is compromised or exceeds its scope — the call is rejected
                automatically.
              </p>
            </div>
          </div>
        </section>

        {/* QUICK START */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={sectionLabel}>Quick start</div>
          <pre style={codeBlock}>
{`npm install agent-identity-sdk

import { issueToken, verifyToken, loadPrivateKey, loadPublicKey } from 'agent-identity-sdk'

// On the agent side — stamp your agent with an identity
const token = await issueToken({
  privateKey,
  issuer_id: 'my-company',
  human_principal: 'alice@example.com',
  delegation_scope: ['email:read', 'tickets:create'],
  agent_config: { model: 'claude-sonnet-4-6', system_prompt: '...' }
})

// On the receiving API — verify in one line
const result = await verifyToken({ jwt: token.jwt, publicKey })
// result.claims.human_principal → 'alice@example.com'
// result.claims.delegation_scope → ['email:read', 'tickets:create']`}
          </pre>
        </section>

        {/* LIVE DEMO */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={sectionLabel}>Live demo</div>
          <p style={{ color: '#aaa', marginTop: 0, marginBottom: '1rem' }}>
            Try it yourself — no signup needed
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={generate} disabled={loading !== null} style={loading !== null ? disabledBtn : btnStyle}>
              {loading === 'generate' ? 'Generating…' : '1. Generate test token'}
            </button>
            <button onClick={verify} disabled={loading !== null || !jwt} style={loading !== null || !jwt ? disabledBtn : btnStyle}>
              {loading === 'verify' ? 'Verifying…' : '2. Verify'}
            </button>
            <button onClick={revoke} disabled={loading !== null || !jwt} style={loading !== null || !jwt ? disabledBtn : btnStyle}>
              {loading === 'revoke' ? 'Revoking…' : '3. Revoke & re-verify'}
            </button>
          </div>

          {jwt && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.25rem' }}>JWT</div>
              <textarea
                readOnly
                value={jwt}
                style={{
                  width: '100%',
                  height: '5rem',
                  backgroundColor: '#151515',
                  color: '#e0e0e0',
                  border: '1px solid #222',
                  borderRadius: '4px',
                  padding: '0.75rem',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                agent_id: <span style={{ color: '#999' }}>{agentId}</span>
              </div>
            </div>
          )}

          {verifyResult && (
            <div>
              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Result</div>
              <pre
                style={{
                  backgroundColor: '#151515',
                  border: `1px solid ${verifyResult.valid ? '#1a3a1a' : '#3a1a1a'}`,
                  padding: '0.75rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                  margin: 0,
                  color: verifyResult.valid ? '#4ade80' : '#f87171',
                }}
              >
                {JSON.stringify(verifyResult, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* USE CASES */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={sectionLabel}>Use cases</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              ['Multi-agent pipelines', 'Verify every agent in a chain has legitimate delegated authority'],
              ['Compliance audit logs', 'Tamper-evident record of every agent action and who authorized it'],
              ['Scope enforcement', 'Sub-agents cryptographically cannot exceed parent permissions'],
            ].map(([title, desc]) => (
              <div
                key={title}
                style={{
                  padding: '1rem',
                  backgroundColor: '#111',
                  border: '1px solid #1f1f1f',
                  borderRadius: '4px',
                }}
              >
                <div style={{ color: '#fff', marginBottom: '0.25rem' }}>{title}</div>
                <div style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            borderTop: '1px solid #1f1f1f',
            paddingTop: '1.5rem',
            marginTop: '2rem',
            color: '#666',
            fontSize: '0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div>
            npm:{' '}
            <a
              href="https://www.npmjs.com/package/agent-identity-sdk"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#4ade80', textDecoration: 'none' }}
            >
              npmjs.com/package/agent-identity-sdk
            </a>
          </div>
          <div>
            Questions:{' '}
            <a
              href="mailto:kiprasbusinees@gmail.com"
              style={{ color: '#4ade80', textDecoration: 'none' }}
            >
              kiprasbusinees@gmail.com
            </a>
          </div>
          <div>
            GitHub:{' '}
            <a
              href="https://github.com/Kipriukas/agent-identity"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#4ade80', textDecoration: 'none' }}
            >
              github.com/Kipriukas/agent-identity
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
