import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase as admin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { webhook_id } = (await req.json().catch(() => ({}))) as { webhook_id?: string };
  if (!webhook_id) return NextResponse.json({ error: 'webhook_id required' }, { status: 400 });

  const { data: hook } = await admin
    .from('webhooks')
    .select('url, secret')
    .eq('id', webhook_id)
    .eq('issuer_id', user.id)
    .single();

  if (!hook) return NextResponse.json({ error: 'webhook not found' }, { status: 404 });

  const body = JSON.stringify({
    event: 'token.rejected',
    timestamp: new Date().toISOString(),
    agent_id: 'test_agent_abc123',
    issuer_id: user.id,
    human_principal: 'test@example.com',
    reason: 'This is a test event dispatched from your dashboard.',
  });
  const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

  try {
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-identity-signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json({ delivered: res.ok, status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ delivered: false, error: message }, { status: 502 });
  }
}
