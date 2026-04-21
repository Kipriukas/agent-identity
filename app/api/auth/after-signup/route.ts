import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import { generateKeyPair } from '@/token';

export async function POST() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from('issuers')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Issuer already registered', already_registered: true }, { status: 409 });
  }

  const keys = await generateKeyPair();

  const { error } = await supabase.from('issuers').insert({
    id: user.id,
    public_key: keys.publicKeyBase64,
    name: user.email ?? user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_events').insert({
    issuer_id: user.id,
    event_type: 'issuer.registered',
    success: true,
  });

  return NextResponse.json({
    private_key: keys.privateKeyBase64,
    public_key: keys.publicKeyBase64,
    issuer_id: user.id,
  });
}
