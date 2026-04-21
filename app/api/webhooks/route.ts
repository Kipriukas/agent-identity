import { NextResponse } from 'next/server';
import { supabase as admin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

const ALLOWED_EVENTS = ['token.rejected', 'token.revoked'] as const;

async function authUserId(): Promise<string | null> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await authUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await admin
    .from('webhooks')
    .select('id, url, events, active, created_at')
    .eq('issuer_id', userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(req: Request) {
  const userId = await authUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { url, events, secret } = body as { url?: string; events?: string[]; secret?: string };

  if (!url || !secret || !events?.length) {
    return NextResponse.json({ error: 'url, secret, and events are required' }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('bad protocol');
    }
  } catch {
    return NextResponse.json({ error: 'url must be a valid http(s) URL' }, { status: 400 });
  }

  const invalid = events.filter((e) => !(ALLOWED_EVENTS as readonly string[]).includes(e));
  if (invalid.length) {
    return NextResponse.json({ error: `unsupported events: ${invalid.join(', ')}` }, { status: 400 });
  }

  const { data, error } = await admin
    .from('webhooks')
    .insert({ issuer_id: userId, url, secret, events })
    .select('id, url, events, active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook: data });
}

export async function DELETE(req: Request) {
  const userId = await authUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { error } = await admin
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('issuer_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
