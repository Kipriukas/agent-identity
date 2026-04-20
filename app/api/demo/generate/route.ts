import { NextResponse } from 'next/server';
import { issueToken, loadPrivateKey, deriveAgentId } from '@/token';

const ISSUER_ID = 'my-registry';

export async function POST() {
  const privateKey = await loadPrivateKey(process.env.AGENT_PRIVATE_KEY!);
  const agent_config = {
    model: 'claude-sonnet-4-6',
    system_prompt: `demo-${Date.now()}-${Math.random()}`,
  };
  const agent_id = await deriveAgentId(agent_config.model, agent_config.system_prompt, ISSUER_ID);

  const token = await issueToken({
    privateKey,
    issuer_id: ISSUER_ID,
    human_principal: 'demo@example.com',
    delegation_scope: ['email:read'],
    agent_config,
  });

  return NextResponse.json({
    jwt: token.jwt,
    agent_id,
    expires_at: token.expires_at,
  });
}
