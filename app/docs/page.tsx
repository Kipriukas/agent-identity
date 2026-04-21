import Link from 'next/link';

const nav = [
  ['overview', 'Overview'],
  ['quick-start', 'Quick start'],
  ['issue-a-token', 'Issue a token'],
  ['verify-a-token', 'Verify a token'],
  ['delegation', 'Delegation'],
  ['revocation', 'Revocation'],
  ['audit-log', 'Audit log'],
  ['webhooks', 'Webhooks'],
  ['api-reference', 'API reference'],
];

const sectionHeading: React.CSSProperties = {
  fontSize: '1.5rem',
  color: '#fff',
  marginTop: 0,
  marginBottom: '1rem',
  letterSpacing: '-0.01em',
  scrollMarginTop: '2rem',
};

const stepHeading: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginTop: '1.5rem',
  marginBottom: '0.5rem',
};

const paragraph: React.CSSProperties = {
  color: '#ccc',
  lineHeight: 1.7,
  margin: 0,
  marginBottom: '1rem',
};

const codeBlock: React.CSSProperties = {
  backgroundColor: '#151515',
  padding: '1rem',
  borderRadius: '4px',
  overflow: 'auto',
  fontSize: '0.8rem',
  lineHeight: '1.6',
  margin: 0,
  marginBottom: '1rem',
};

const inlineCode: React.CSSProperties = {
  backgroundColor: '#1a1a1a',
  color: '#facc15',
  padding: '0.1rem 0.35rem',
  borderRadius: '3px',
  fontSize: '0.85em',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8rem',
  marginBottom: '1rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  color: '#666',
  fontWeight: 'normal',
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid #1f1f1f',
  backgroundColor: '#0f0f0f',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontSize: '0.7rem',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderBottom: '1px solid #161616',
  color: '#ccc',
  verticalAlign: 'top',
};

const endpointCard: React.CSSProperties = {
  padding: '1rem',
  backgroundColor: '#111',
  border: '1px solid #1f1f1f',
  borderRadius: '4px',
  marginBottom: '1rem',
};

const errorRow: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  padding: '0.5rem 0',
  borderBottom: '1px solid #161616',
};

export default function Docs() {
  return (
    <main
      style={{
        backgroundColor: '#0a0a0a',
        color: '#e0e0e0',
        minHeight: '100vh',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
    >
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '220px',
          height: '100vh',
          padding: '2rem 1.5rem',
          borderRight: '1px solid #1a1a1a',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <Link
          href="/"
          style={{
            color: '#fff',
            textDecoration: 'none',
            fontSize: '1rem',
            display: 'block',
            marginBottom: '2rem',
            letterSpacing: '-0.01em',
          }}
        >
          Agent Identity
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {nav.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              style={{
                color: '#888',
                textDecoration: 'none',
                fontSize: '0.875rem',
                padding: '0.25rem 0',
              }}
            >
              {label}
            </a>
          ))}
          <Link
            href="/integrations"
            style={{
              color: '#888',
              textDecoration: 'none',
              fontSize: '0.875rem',
              padding: '0.25rem 0',
              marginTop: '0.75rem',
              borderTop: '1px solid #1a1a1a',
              paddingTop: '0.75rem',
            }}
          >
            Integrations →
          </Link>
        </nav>
      </aside>

      <div
        style={{
          marginLeft: '220px',
          padding: '4rem 3rem',
          maxWidth: '760px',
        }}
      >
        {/* OVERVIEW */}
        <section id="overview" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Overview</h2>
          <p style={paragraph}>
            Agent Identity gives every AI agent a signed, scoped, revocable identity token. Any
            service can verify who an agent is and what it&apos;s allowed to do in one HTTPS call.
          </p>
        </section>

        {/* QUICK START */}
        <section id="quick-start" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Quick start</h2>

          <div style={stepHeading}>Step 1 — Install</div>
          <pre style={codeBlock}>npm install agent-identity-sdk</pre>

          <div style={stepHeading}>Step 2 — Register your issuer</div>
          <p style={paragraph}>Get your API key from the dashboard, then register:</p>
          <pre style={codeBlock}>
{`curl -X POST https://agent-identity-blush.vercel.app/api/register \\
  -H "Content-Type: application/json" \\
  -d '{"issuer_id": "your-company", "public_key": "YOUR_PUBLIC_KEY", "name": "Your Company"}'`}
          </pre>

          <div style={stepHeading}>Step 3 — Issue a token (in your agent)</div>
          <pre style={codeBlock}>
{`import { issueToken, loadPrivateKey } from 'agent-identity-sdk'

const token = await issueToken({
  privateKey: await loadPrivateKey(process.env.PRIVATE_KEY!),
  issuer_id: 'your-company',
  human_principal: 'user@example.com',
  delegation_scope: ['email:read', 'tickets:create'],
  agent_config: {
    model: 'claude-sonnet-4-6',
    system_prompt: 'You are a helpful assistant'
  }
})`}
          </pre>

          <div style={stepHeading}>Step 4 — Verify a token (in your API)</div>
          <pre style={codeBlock}>
{`import { verifyToken, loadPublicKey } from 'agent-identity-sdk'

const result = await verifyToken({
  jwt: request.headers.authorization.replace('Bearer ', ''),
  publicKey: await loadPublicKey(process.env.PUBLIC_KEY!)
})

if (result.claims.delegation_scope.includes('email:read')) {
  // authorized — proceed
}`}
          </pre>
        </section>

        {/* ISSUE A TOKEN */}
        <section id="issue-a-token" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Issue a token</h2>
          <p style={paragraph}>
            <code style={inlineCode}>issueToken(config)</code> signs a new Ed25519 JWT with the
            claims below. Every field in <code style={inlineCode}>IssueTokenConfig</code>:
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Required</th>
                  <th style={thStyle}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['agent_id', 'string', 'no', 'Auto-derived from model + system_prompt + issuer_id'],
                  ['issuer_id', 'string', 'yes', 'Your registered issuer ID'],
                  ['human_principal', 'string', 'yes', 'The user this agent acts on behalf of'],
                  ['delegation_scope', 'string[]', 'yes', 'What this agent is allowed to do'],
                  ['ttl_seconds', 'number', 'no', 'How long the token is valid (default: 900)'],
                  ['metadata', 'object', 'no', 'Free-form key/value pairs for debugging'],
                ].map(([f, t, r, d]) => (
                  <tr key={f}>
                    <td style={{ ...tdStyle, color: '#facc15' }}>{f}</td>
                    <td style={{ ...tdStyle, color: '#999' }}>{t}</td>
                    <td style={{ ...tdStyle, color: r === 'yes' ? '#4ade80' : '#888' }}>{r}</td>
                    <td style={tdStyle}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* VERIFY A TOKEN */}
        <section id="verify-a-token" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Verify a token</h2>
          <p style={paragraph}>
            <code style={inlineCode}>verifyToken(config)</code> checks the signature, expiry, and
            (optionally) required scope or principal. It throws with a descriptive message when
            verification fails. Possible errors:
          </p>

          <div style={{ marginBottom: '1rem' }}>
            {[
              ['Token expired', '"Token has expired"'],
              ['Tampered token', '"Token signature is invalid"'],
              ['Missing scope', '"Token does not have required scope X"'],
              ['Revoked agent', '"Agent has been revoked: [reason]"'],
            ].map(([cause, msg]) => (
              <div key={cause} style={errorRow}>
                <div style={{ color: '#f87171', fontSize: '0.875rem', width: '10rem', flexShrink: 0 }}>
                  {cause}
                </div>
                <div style={{ color: '#ccc', fontSize: '0.875rem' }}>{msg}</div>
              </div>
            ))}
          </div>
        </section>

        {/* DELEGATION */}
        <section id="delegation" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Delegation</h2>
          <p style={paragraph}>
            Delegation lets one agent issue a token to another. The scope attenuation rule is
            enforced cryptographically: a child agent can only receive scopes the parent already
            has. No agent can escalate its permissions.
          </p>

          <pre style={codeBlock}>
{`// Agent A has ['email:read', 'calendar:write']
const childToken = await delegateToken(agentAVerified, {
  privateKey,
  issuer_id: 'your-company',
  grant_scopes: ['email:read'],  // only email:read — subset of parent
  agent_config: { model: 'claude-haiku-4-5', system_prompt: '...' }
})

// Agent B tries to delegate calendar:write
await delegateToken(agentBVerified, {
  privateKey,
  issuer_id: 'your-company',
  grant_scopes: ['calendar:write'],  // REJECTED — not in parent's scopes
  agent_config: { ... }
})
// → throws: Cannot grant scopes not in parent token: [calendar:write]`}
          </pre>
        </section>

        {/* REVOCATION */}
        <section id="revocation" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Revocation</h2>
          <p style={paragraph}>
            Revoke an agent by ID. Every subsequent verification for that agent will fail, even if
            the JWT itself is still within its TTL.
          </p>
          <pre style={codeBlock}>
{`curl -X POST https://agent-identity-blush.vercel.app/api/revoke \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "YOUR_AGENT_ID", "issuer_id": "your-company", "reason": "Compromised"}'`}
          </pre>
        </section>

        {/* AUDIT LOG */}
        <section id="audit-log" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Audit log</h2>
          <p style={paragraph}>
            Every registration, verification, and revocation is recorded. Query by issuer and
            optionally filter by event type.
          </p>
          <pre style={codeBlock}>
curl https://agent-identity-blush.vercel.app/api/audit?issuer_id=your-company
          </pre>

          <div style={stepHeading}>Example response</div>
          <pre style={codeBlock}>
{`{
  "count": 3,
  "events": [
    {
      "event_type": "token.verified",
      "agent_id": "47a655c047ea9c01aab4db47cf77712647e9e9c9a431ba2c3d6d8611755a8086",
      "issuer_id": "your-company",
      "success": true,
      "created_at": "2026-04-19T10:14:22Z"
    },
    {
      "event_type": "token.revoked",
      "agent_id": "47a655c047ea9c01aab4db47cf77712647e9e9c9a431ba2c3d6d8611755a8086",
      "issuer_id": "your-company",
      "success": true,
      "details": "Compromised",
      "created_at": "2026-04-19T10:15:01Z"
    },
    {
      "event_type": "token.rejected",
      "agent_id": "47a655c047ea9c01aab4db47cf77712647e9e9c9a431ba2c3d6d8611755a8086",
      "issuer_id": "your-company",
      "success": false,
      "details": "Compromised",
      "created_at": "2026-04-19T10:15:04Z"
    }
  ]
}`}
          </pre>
        </section>

        {/* WEBHOOKS */}
        <section id="webhooks" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>Webhooks</h2>
          <p style={paragraph}>
            Register a webhook URL and get notified in real time when a token is rejected or
            revoked. Every request is signed with your shared secret so your server can verify it
            came from Agent Identity.
          </p>

          <div style={stepHeading}>Register a webhook</div>
          <p style={paragraph}>
            Open the <Link href="/dashboard" style={{ color: '#4ade80', textDecoration: 'none' }}>dashboard</Link>,
            paste your endpoint URL, pick the events you care about, and supply a shared secret. Or
            register programmatically:
          </p>
          <pre style={codeBlock}>
{`curl -X POST https://agent-identity-blush.vercel.app/api/webhooks \\
  -H "Content-Type: application/json" \\
  --cookie "sb-access-token=..." \\
  -d '{
    "url": "https://your-server.com/webhook",
    "secret": "a-long-random-string",
    "events": ["token.rejected", "token.revoked"]
  }'`}
          </pre>

          <div style={stepHeading}>Payload format</div>
          <pre style={codeBlock}>
{`POST https://your-server.com/webhook
Content-Type: application/json
x-agent-identity-signature: sha256=<hex>

{
  "event": "token.rejected",
  "timestamp": "2026-04-21T09:42:00.000Z",
  "agent_id": "47a655c047ea9c01...",
  "issuer_id": "5d7f...",
  "human_principal": "alice@example.com",
  "reason": "Token has expired"
}`}
          </pre>

          <div style={stepHeading}>Verify the signature</div>
          <p style={paragraph}>
            Compute <code style={inlineCode}>HMAC-SHA256</code> over the raw request body using your
            shared secret, then constant-time compare with the hex in the header. <em>Always use
            the raw bytes — re-stringifying the parsed JSON will change the signature.</em>
          </p>
          <pre style={codeBlock}>
{`import { createHmac, timingSafeEqual } from 'crypto'

export async function POST(req: Request) {
  const signature = req.headers.get('x-agent-identity-signature') ?? ''
  const provided = signature.replace(/^sha256=/, '')
  const rawBody = await req.text()

  const expected = createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  const ok =
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))

  if (!ok) return new Response('Invalid signature', { status: 401 })

  const event = JSON.parse(rawBody)
  // event.event, event.agent_id, event.reason, ...
  return new Response('ok')
}`}
          </pre>

          <div style={stepHeading}>Delivery guarantees</div>
          <p style={paragraph}>
            Delivery is fire-and-forget after the triggering response is sent — failed deliveries do
            not block or retry. Each attempt is recorded in the audit log as{' '}
            <code style={inlineCode}>webhook.delivered</code> or{' '}
            <code style={inlineCode}>webhook.failed</code>, with the URL and HTTP status in{' '}
            <code style={inlineCode}>details</code>. Configure your endpoint to respond within 10
            seconds.
          </p>
        </section>

        {/* API REFERENCE */}
        <section id="api-reference" style={{ marginBottom: '4rem' }}>
          <h2 style={sectionHeading}>API reference</h2>

          <div style={endpointCard}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#facc15', marginRight: '0.75rem' }}>POST</span>
              <code style={{ color: '#fff' }}>/api/register</code>
            </div>
            <p style={{ ...paragraph, fontSize: '0.875rem' }}>
              Register a new issuer. Returns 409 if the ID already exists.
            </p>
            <div style={stepHeading}>Request body</div>
            <pre style={codeBlock}>{`{ "issuer_id": string, "public_key": string, "name": string }`}</pre>
            <div style={stepHeading}>Response body</div>
            <pre style={codeBlock}>{`{ "issuer_id": string, "created_at": string }`}</pre>
          </div>

          <div style={endpointCard}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#4ade80', marginRight: '0.75rem' }}>GET</span>
              <code style={{ color: '#fff' }}>/api/verify/[agentId]</code>
            </div>
            <p style={{ ...paragraph, fontSize: '0.875rem' }}>
              Verify a JWT. Send the token as <code style={inlineCode}>Authorization: Bearer …</code>.
              Returns 401 if invalid or revoked.
            </p>
            <div style={stepHeading}>Response body (success)</div>
            <pre style={codeBlock}>{`{ "valid": true, "claims": { ... }, "expires_at": string }`}</pre>
            <div style={stepHeading}>Response body (failure)</div>
            <pre style={codeBlock}>{`{ "valid": false, "error"?: string, "reason"?: string }`}</pre>
          </div>

          <div style={endpointCard}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#facc15', marginRight: '0.75rem' }}>POST</span>
              <code style={{ color: '#fff' }}>/api/revoke</code>
            </div>
            <p style={{ ...paragraph, fontSize: '0.875rem' }}>
              Revoke an agent. All future verifications for this agent_id will fail.
            </p>
            <div style={stepHeading}>Request body</div>
            <pre style={codeBlock}>{`{ "agent_id": string, "issuer_id": string, "reason": string }`}</pre>
            <div style={stepHeading}>Response body</div>
            <pre style={codeBlock}>{`{ "revoked": true, "agent_id": string }`}</pre>
          </div>

          <div style={endpointCard}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#4ade80', marginRight: '0.75rem' }}>GET</span>
              <code style={{ color: '#fff' }}>/api/audit</code>
            </div>
            <p style={{ ...paragraph, fontSize: '0.875rem' }}>
              Query audit events by issuer. Optional filters: <code style={inlineCode}>event_type</code>,{' '}
              <code style={inlineCode}>limit</code> (default 50).
            </p>
            <div style={stepHeading}>Query params</div>
            <pre style={codeBlock}>{`?issuer_id=string&event_type=string&limit=number`}</pre>
            <div style={stepHeading}>Response body</div>
            <pre style={codeBlock}>{`{ "events": [...], "count": number }`}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}
