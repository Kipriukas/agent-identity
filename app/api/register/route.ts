import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { issuer_id, public_key, name } = await request.json();

  const { data, error } = await supabase
    .from('issuers')
    .insert({ id: issuer_id, public_key, name })
    .select('id, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Issuer already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_events').insert({
    issuer_id,
    event_type: 'issuer.registered',
    success: true,
  });

  return NextResponse.json({ issuer_id: data.id, created_at: data.created_at });
}
