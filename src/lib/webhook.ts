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

  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('id, url, secret')
    .eq('issuer_id', args.issuer_id)
    .eq('active', true)
    .contains('events', [args.event]);

  if (!webhooks?.length) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    webhooks.map(async (hook) => {
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
        await supabase.from('audit_events').insert({
          issuer_id: args.issuer_id,
          agent_id: args.agent_id,
          event_type: res.ok ? 'webhook.delivered' : 'webhook.failed',
          success: res.ok,
          details: `${hook.url} → HTTP ${res.status}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        await supabase.from('audit_events').insert({
          issuer_id: args.issuer_id,
          agent_id: args.agent_id,
          event_type: 'webhook.failed',
          success: false,
          details: `${hook.url} → ${message}`,
        });
      }
    })
  );
}
