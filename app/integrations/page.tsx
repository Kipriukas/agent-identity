import Link from 'next/link';

const sectionLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#666',
  marginBottom: '1rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const sectionHeading: React.CSSProperties = {
  fontSize: '1.5rem',
  color: '#fff',
  marginTop: 0,
  marginBottom: '0.5rem',
  letterSpacing: '-0.01em',
};

const sectionIntro: React.CSSProperties = {
  color: '#aaa',
  margin: 0,
  marginBottom: '1rem',
  lineHeight: 1.6,
  fontSize: '0.95rem',
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

const inlineCode: React.CSSProperties = {
  backgroundColor: '#1a1a1a',
  color: '#facc15',
  padding: '0.1rem 0.35rem',
  borderRadius: '3px',
  fontSize: '0.85em',
};

const claudeSnippet = `import Anthropic from '@anthropic-ai/sdk'
import { issueToken, loadPrivateKey } from 'agent-identity-sdk'

const anthropic = new Anthropic()
const privateKey = await loadPrivateKey(process.env.AGENT_PRIVATE_KEY!)

// Issue one token the agent will present on every downstream call
const token = await issueToken({
  privateKey,
  issuer_id: process.env.ISSUER_ID!,
  human_principal: 'user@example.com',
  delegation_scope: ['tickets:create'],
  agent_config: {
    model: 'claude-sonnet-4-6',
    system_prompt: 'You open support tickets on behalf of users.'
  }
})

// Plan the action with Claude
const plan = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Open a ticket for the payment bug.' }]
})

// Present the identity token to the downstream service that will act on it
await fetch('https://api.example.com/tickets', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${token.jwt}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ summary: extractSummary(plan) })
})`;

const langchainSnippet = `import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { issueToken, loadPrivateKey } from 'agent-identity-sdk'

class AgentIdentityHandler extends BaseCallbackHandler {
  name = 'AgentIdentityHandler'
  token: string | null = null

  constructor(private userId: string) {
    super()
  }

  async handleChainStart() {
    const privateKey = await loadPrivateKey(process.env.AGENT_PRIVATE_KEY!)
    const issued = await issueToken({
      privateKey,
      issuer_id: process.env.ISSUER_ID!,
      human_principal: this.userId,
      delegation_scope: ['search:query'],
      agent_config: { model: 'gpt-4', system_prompt: '...' }
    })
    this.token = issued.jwt
    console.log('Agent token issued:', issued.claims.agent_id)
  }
}

// Issue a token for this user's chain run, then present it on tool calls
const handler = new AgentIdentityHandler('alice@example.com')
const chain = prompt.pipe(llm)
await chain.invoke({ input }, { callbacks: [handler] })

await fetch('https://api.example.com/search', {
  headers: { Authorization: \`Bearer \${handler.token}\` }
})`;

const aiSdkSnippet = `import { streamText, tool } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { issueToken, loadPrivateKey } from 'agent-identity-sdk'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages, userId } = await req.json()
  const privateKey = await loadPrivateKey(process.env.AGENT_PRIVATE_KEY!)

  const token = await issueToken({
    privateKey,
    issuer_id: process.env.ISSUER_ID!,
    human_principal: userId,
    delegation_scope: ['tickets:create'],
    agent_config: {
      model: 'claude-sonnet-4-6',
      system_prompt: 'You are a support assistant.'
    }
  })

  // Tool calls the model makes during the stream present the identity token
  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    messages,
    tools: {
      createTicket: tool({
        description: 'Open a support ticket',
        parameters: z.object({ summary: z.string() }),
        execute: async ({ summary }) => {
          const res = await fetch('https://api.example.com/tickets', {
            method: 'POST',
            headers: {
              Authorization: \`Bearer \${token.jwt}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ summary })
          })
          return res.json()
        }
      })
    }
  })

  return result.toDataStreamResponse()
}`;

export default function Integrations() {
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
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '3rem',
            fontSize: '0.875rem',
          }}
        >
          <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>
            Agent Identity
          </Link>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/docs" style={{ color: '#aaa', textDecoration: 'none' }}>
              Docs
            </Link>
            <Link href="/integrations" style={{ color: '#fff', textDecoration: 'none' }}>
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

        <section style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
            Integrations
          </h1>
          <p style={{ color: '#aaa', fontSize: '1.1rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
            Add Agent Identity to your agent framework in 5 minutes
          </p>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <p style={{ color: '#ccc', margin: 0, lineHeight: 1.7 }}>
            Every integration follows the same two-step flow: your agent{' '}
            <strong style={{ color: '#fff' }}>issues</strong> a short-lived identity token bound to
            the human it&apos;s acting for, then <strong style={{ color: '#fff' }}>presents</strong>{' '}
            that token on every downstream call. The receiving service verifies the signature and
            scopes with one line — see{' '}
            <Link href="/docs#verify-a-token" style={{ color: '#4ade80', textDecoration: 'none' }}>
              Verify a token
            </Link>{' '}
            in the docs.
          </p>
        </section>

        {/* CLAUDE */}
        <section id="claude" style={{ marginBottom: '3.5rem' }}>
          <div style={sectionLabel}>1. Claude (Anthropic)</div>
          <h2 style={sectionHeading}>Wrap a Claude agent</h2>
          <p style={sectionIntro}>
            Issue one token per agent run, plan the action with{' '}
            <code style={inlineCode}>anthropic.messages.create</code>, then attach the token as a
            bearer credential when your agent calls the downstream service.
          </p>
          <pre style={codeBlock}>{claudeSnippet}</pre>
        </section>

        {/* LANGCHAIN */}
        <section id="langchain" style={{ marginBottom: '3.5rem' }}>
          <div style={sectionLabel}>2. LangChain</div>
          <h2 style={sectionHeading}>Callback handler</h2>
          <p style={sectionIntro}>
            A <code style={inlineCode}>BaseCallbackHandler</code> issues the token in{' '}
            <code style={inlineCode}>handleChainStart</code> and exposes it to tool code via{' '}
            <code style={inlineCode}>handler.token</code>. The user identity is passed into the
            handler&apos;s constructor — never leave <code style={inlineCode}>human_principal</code>{' '}
            undefined.
          </p>
          <pre style={codeBlock}>{langchainSnippet}</pre>
        </section>

        {/* VERCEL AI SDK */}
        <section id="vercel-ai-sdk" style={{ marginBottom: '3.5rem' }}>
          <div style={sectionLabel}>3. Vercel AI SDK</div>
          <h2 style={sectionHeading}>Streaming route with tool calls</h2>
          <p style={sectionIntro}>
            Issue the token once inside your route handler, then have the model&apos;s tool calls
            forward it as <code style={inlineCode}>Authorization: Bearer …</code> to whichever
            service actually acts on the user&apos;s behalf.
          </p>
          <pre style={codeBlock}>{aiSdkSnippet}</pre>
        </section>

        <footer
          style={{
            borderTop: '1px solid #1f1f1f',
            paddingTop: '1.5rem',
            marginTop: '2rem',
            color: '#666',
            fontSize: '0.875rem',
          }}
        >
          Don&apos;t see your framework?{' '}
          <a
            href="https://github.com/Kipriukas/agent-identity/issues"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#4ade80', textDecoration: 'none' }}
          >
            Open an issue
          </a>
          .
        </footer>
      </div>
    </main>
  );
}
