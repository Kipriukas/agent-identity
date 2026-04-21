import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase as admin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    console.log('[webhook-test] no session');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { webhook_id } = (await req.json().catch(() => ({}))) as { webhook_id?: string };
  if (!webhook_id) {
    console.log('[webhook-test] no webhook_id in body');
    return NextResponse.json({ error: 'webhook_id required' }, { status: 400 });
  }

  const { data: hook, error: lookupErr } = await admin
    .from('webhooks')
    .select('url, secret')
    .eq('id', webhook_id)
    .eq('issuer_id', user.id)
    .single();

  if (lookupErr || !hook) {
    console.log('[webhook-test] lookup failed', { webhook_id, user: user.id, err: lookupErr?.message });
    return NextResponse.json({ error: 'webhook not found', details: lookupErr?.message ?? null }, { status: 404 });
  }

  const body = JSON.stringify({
    event: 'token.rejected',
    timestamp: new Date().toISOString(),
    agent_id: 'test_agent_abc123',
    issuer_id: user.id,
    human_principal: 'test@example.com',
    reason: 'This is a test event dispatched from your dashboard.',
  });
  const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

  console.log('[webhook-test] POSTing', { url: hook.url, bytes: body.length });

  try {
    const started = Date.now();
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'agent-identity-webhook/1.0',
        'x-agent-identity-signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const elapsed_ms = Date.now() - started;

    const responseText = await res.text().catch(() => '');
    const responseSnippet = responseText.slice(0, 200);

    console.log('[webhook-test] response', { url: hook.url, status: res.status, ok: res.ok, elapsed_ms });

    return NextResponse.json({
      delivered: res.ok,
      status: res.status,
      elapsed_ms,
      url: hook.url,
      response_snippet: responseSnippet,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    const name = err instanceof Error ? err.name : 'Error';
    console.log('[webhook-test] fetch threw', { url: hook.url, name, message });
    return NextResponse.json(
      { delivered: false, url: hook.url, error: `${name}: ${message}` },
      { status: 502 },
    );
  }
}
