import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { supabase as admin } from '@/lib/supabase';
import DashboardClient from './dashboard-client';

export default async function Dashboard() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: issuer } = await admin
    .from('issuers')
    .select('id, public_key, name, created_at')
    .eq('id', user.id)
    .single();

  const { data: events } = await admin
    .from('audit_events')
    .select('*')
    .eq('issuer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: allForCounts } = await admin
    .from('audit_events')
    .select('event_type, agent_id, success')
    .eq('issuer_id', user.id);

  const { data: revocations } = await admin
    .from('revocations')
    .select('agent_id')
    .eq('issuer_id', user.id);

  const eventList = allForCounts ?? [];
  const agentIds = new Set(eventList.map((e) => e.agent_id).filter(Boolean));
  const revokedIds = new Set((revocations ?? []).map((r) => r.agent_id));

  const stats = {
    issued: agentIds.size,
    verified: eventList.filter((e) => e.event_type === 'token.verified' && e.success).length,
    revoked: eventList.filter((e) => e.event_type === 'token.revoked').length,
    active: [...agentIds].filter((id) => !revokedIds.has(id)).length,
  };

  return (
    <DashboardClient
      email={user.email ?? ''}
      issuerId={user.id}
      publicKey={issuer?.public_key ?? null}
      stats={stats}
      events={events ?? []}
    />
  );
}
