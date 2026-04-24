import { NextResponse } from 'next/server';
import { supabase as admin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = new Date(today.getTime() - 6 * DAY_MS);

  const { data, error } = await admin
    .from('audit_events')
    .select('event_type, success, created_at')
    .eq('issuer_id', user.id)
    .gte('created_at', since.toISOString())
    .in('event_type', ['token.issued', 'token.verified', 'token.rejected']);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const buckets = new Map<string, { date: string; issued: number; verified: number; rejected: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(since.getTime() + i * DAY_MS);
    const key = dayKey(d);
    buckets.set(key, { date: key, issued: 0, verified: 0, rejected: 0 });
  }

  for (const ev of data ?? []) {
    const key = dayKey(new Date(ev.created_at));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (ev.event_type === 'token.issued') bucket.issued++;
    else if (ev.event_type === 'token.verified' && ev.success) bucket.verified++;
    else if (ev.event_type === 'token.rejected') bucket.rejected++;
  }

  return NextResponse.json(Array.from(buckets.values()));
}
