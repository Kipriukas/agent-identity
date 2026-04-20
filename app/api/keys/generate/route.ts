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

  const keys = await generateKeyPair();

  const { error } = await supabase
    .from('issuers')
    .update({ public_key: keys.publicKeyBase64 })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_events').insert({
    issuer_id: user.id,
    event_type: 'key.rotated',
    success: true,
  });

  return NextResponse.json({ private_key: keys.privateKeyBase64, public_key: keys.publicKeyBase64 });
}
