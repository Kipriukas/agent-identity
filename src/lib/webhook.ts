import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabase';

export type WebhookEvent = 'token.rejected' | 'token.revoked';

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  agent_id: string;
  issuer_id: string;
  human_principal: string;
  reason: string;
};

type SendWebhookArgs = {
  event: WebhookEvent;
  issuer_id: string;
  agent_id: string;
  human_principal: string;
  reason: string;
};

export async function sendWebhook(args: SendWebhookArgs): Promise<void> {
  const payload: WebhookPayload = {
    event: args.event,
    timestamp: new Date().toISOString(),
    agent_id: args.agent_id,
    issuer_id: args.issuer_id,
    human_principal: args.human_principal,
    reason: args.reason,
  };

  const { data: webhooks, error: lookupErr } = await supabase
    .from('webhooks')
    .select('id, url, secret')
    .eq('issuer_id', args.issuer_id)
    .eq('active', true)
    .contains('events', [args.event]);

  if (lookupErr) {
    console.log('[webhook-send] lookup error', { event: args.event, issuer_id: args.issuer_id, err: lookupErr.message });
    return;
  }

  if (!webhooks?.length) {
    console.log('[webhook-send] no active subscribers', { event: args.event, issuer_id: args.issuer_id });
    return;
  }

  const body = JSON.stringify(payload);
  console.log('[webhook-send] dispatching', { event: args.event, count: webhooks.length, bytes: body.length });

  await Promise.all(
    webhooks.map(async (hook) => {
      const signature = createHmac('sha256', hook.secret).update(body).digest('hex');
      const started = Date.now();
      try {
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
        console.log('[webhook-send] response', { url: hook.url, status: res.status, ok: res.ok, elapsed_ms });
        await supabase.from('audit_events').insert({
          issuer_id: args.issuer_id,
          agent_id: args.agent_id,
          event_type: res.ok ? 'webhook.delivered' : 'webhook.failed',
          success: res.ok,
          details: `${hook.url} → HTTP ${res.status} (${elapsed_ms}ms)`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        const name = err instanceof Error ? err.name : 'Error';
        const elapsed_ms = Date.now() - started;
        console.log('[webhook-send] fetch threw', { url: hook.url, name, message, elapsed_ms });
        await supabase.from('audit_events').insert({
          issuer_id: args.issuer_id,
          agent_id: args.agent_id,
          event_type: 'webhook.failed',
          success: false,
          details: `${hook.url} → ${name}: ${message}`,
        });
      }
    })
  );
}
