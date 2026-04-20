import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const issuer_id = searchParams.get('issuer_id');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const event_type = searchParams.get('event_type');

  if (!issuer_id) {
    return NextResponse.json({ error: 'issuer_id is required' }, { status: 400 });
  }

  let query = supabase
    .from('audit_events')
    .select('*', { count: 'exact' })
    .eq('issuer_id', issuer_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (event_type) {
    query = query.eq('event_type', event_type);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data, count });
}
