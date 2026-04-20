import { issueToken, loadPrivateKey, deriveAgentId } from './packages/sdk/src/token';

const BASE_URL = 'http://localhost:3000';
const ISSUER_ID = 'my-registry';

async function main() {
  let agentId: string;
  let jwt: string;

  // 1. Register issuer
  console.log('\n1. Register issuer...');
  try {
    const res = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issuer_id: ISSUER_ID,
        public_key: process.env.AGENT_PUBLIC_KEY,
        name: 'My Registry',
      }),
    });
    const data = await res.json();
    if (res.status === 409) {
      console.log('   PASS (already exists)');
    } else if (res.ok) {
      console.log('   PASS:', data);
    } else {
      console.log('   FAIL:', data);
      return;
    }
  } catch (e) {
    console.log('   FAIL:', e);
    return;
  }

  // 2. Issue token
  console.log('\n2. Issue token...');
  try {
    const privateKey = await loadPrivateKey(process.env.AGENT_PRIVATE_KEY!);
    const agentConfig = {
      model: 'claude-sonnet-4-6',
      system_prompt: 'You are a helpful assistant',
    };
    agentId = await deriveAgentId(agentConfig.model, agentConfig.system_prompt, ISSUER_ID);

    const token = await issueToken({
      privateKey,
      issuer_id: ISSUER_ID,
      human_principal: 'alice@example.com',
      delegation_scope: ['email:read'],
      agent_config: agentConfig,
    });
    jwt = token.jwt;
    console.log('   PASS: agent_id =', agentId);
    console.log('   expires_at =', token.expires_at);
  } catch (e) {
    console.log('   FAIL:', e);
    return;
  }

  // 3. Verify token
  console.log('\n3. Verify token...');
  try {
    const res = await fetch(`${BASE_URL}/api/verify/${agentId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json();
    if (data.valid === true) {
      console.log('   PASS:', { valid: data.valid, principal: data.claims?.human_principal });
    } else {
      console.log('   FAIL:', data);
      return;
    }
  } catch (e) {
    console.log('   FAIL:', e);
    return;
  }

  // 4. Revoke token
  console.log('\n4. Revoke token...');
  try {
    const res = await fetch(`${BASE_URL}/api/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: agentId,
        issuer_id: ISSUER_ID,
        reason: 'Demo revocation',
      }),
    });
    const data = await res.json();
    if (data.revoked === true) {
      console.log('   PASS:', data);
    } else {
      console.log('   FAIL:', data);
      return;
    }
  } catch (e) {
    console.log('   FAIL:', e);
    return;
  }

  // 5. Verify again (should fail)
  console.log('\n5. Verify after revocation...');
  try {
    const res = await fetch(`${BASE_URL}/api/verify/${agentId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json();
    if (data.valid === false) {
      console.log('   PASS:', data);
    } else {
      console.log('   FAIL: expected valid=false, got:', data);
      return;
    }
  } catch (e) {
    console.log('   FAIL:', e);
    return;
  }

  // 6. Check audit log
  console.log('\n6. Check audit log...');
  try {
    const res = await fetch(`${BASE_URL}/api/audit?issuer_id=${ISSUER_ID}`);
    const data = await res.json();
    console.log('   PASS: found', data.count, 'events');
    for (const event of data.events.slice(0, 5)) {
      console.log('   -', event.event_type, event.success ? '✓' : '✗');
    }
  } catch (e) {
    console.log('   FAIL:', e);
    return;
  }

  console.log('\n✓ All steps passed!\n');
}

main().catch(console.error);
