import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { agent_id, issuer_id, reason } = await request.json();

  const { error } = await supabase
    .from('revocations')
    .insert({ agent_id, issuer_id, reason });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_events').insert({
    agent_id,
    issuer_id,
    event_type: 'token.revoked',
    success: true,
  });

  return NextResponse.json({ revoked: true, agent_id });
}
