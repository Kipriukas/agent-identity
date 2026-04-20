import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadPublicKey, verifyToken } from '@/token';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
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
      .select('reason')
      .eq('agent_id', agentId)
      .single();

    if (revocation) {
      await logAudit(agentId, 'token.rejected', false, revocation.reason);
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
