import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { decodeJwt } from 'jose';
import { supabase } from '@/lib/supabase';
import { loadPublicKey, verifyToken } from '@/token';
import { sendWebhook } from '@/lib/webhook';
import { checkRateLimit, getClientIp, verifyLimiter } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  const rl = await checkRateLimit(verifyLimiter, getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    await logAudit(agentId, 'token.rejected', false, 'Missing or invalid Authorization header');
    return NextResponse.json({ valid: false, error: 'Missing Bearer token' }, { status: 401 });
  }

  const jwt = authHeader.slice(7);

  try {
    const publicKey = await loadPublicKey(process.env.AGENT_PUBLIC_KEY!);
    const verified = await verifyToken({ jwt, publicKey });

    const { data: revocation } = await supabase
      .from('revocations')
      .select('reason, issuer_id')
      .eq('agent_id', agentId)
      .single();

    if (revocation) {
      await logAudit(agentId, 'token.rejected', false, revocation.reason);
      fireRejectionWebhook(jwt, agentId, revocation.reason, revocation.issuer_id);
      return NextResponse.json({ valid: false, reason: revocation.reason }, { status: 401 });
    }

    await logAudit(agentId, 'token.verified', true);
    return NextResponse.json({
      valid: true,
      claims: verified.claims,
      expires_at: verified.expires_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    await logAudit(agentId, 'token.rejected', false, message);
    fireRejectionWebhook(jwt, agentId, message);
    return NextResponse.json({ valid: false, error: message }, { status: 401 });
  }
}

async function logAudit(agentId: string, eventType: string, success: boolean, details?: string) {
  await supabase.from('audit_events').insert({
    agent_id: agentId,
    event_type: eventType,
    success,
    details,
  });
}

function fireRejectionWebhook(
  rawJwt: string,
  agentId: string,
  reason: string,
  knownIssuerId?: string,
) {
  after(async () => {
    let issuerId = knownIssuerId;
    let humanPrincipal = '';
    try {
      const claims = decodeJwt(rawJwt) as { issuer_id?: string; human_principal?: string };
      if (!issuerId) issuerId = claims.issuer_id;
      humanPrincipal = claims.human_principal ?? '';
    } catch {
      // Malformed JWT; if we also don't have a known issuer_id, we can't route the webhook.
    }
    if (!issuerId) return;
    await sendWebhook({
      event: 'token.rejected',
      issuer_id: issuerId,
      agent_id: agentId,
      human_principal: humanPrincipal,
      reason,
    }).catch(() => {});
  });
}
