import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { email, issuer_id } = body as { email?: string; issuer_id?: string };

  if (!email || !issuer_id) {
    return NextResponse.json({ error: 'email and issuer_id are required' }, { status: 400 });
  }

  if (email !== user.email || issuer_id !== user.id) {
    return NextResponse.json({ error: 'email or issuer_id does not match authenticated user' }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  const resend = new Resend(apiKey);

  const text = [
    'Welcome to Agent Identity.',
    '',
    `Your issuer_id: ${issuer_id}`,
    '',
    'Quick start:',
    '1. Go to your dashboard to generate your key pair:',
    '   https://agent-identity-blush.vercel.app/dashboard',
    '',
    '2. Install the SDK:',
    '   npm install agent-identity-sdk',
    '',
    '3. Read the docs:',
    '   https://agent-identity-blush.vercel.app/docs',
    '',
    '4. See integration examples:',
    '   https://agent-identity-blush.vercel.app/integrations',
    '',
    'Reply to this email with any questions.',
    '',
    '— Agent Identity',
  ].join('\n');

  const { error } = await resend.emails.send({
    from: 'Agent Identity <onboarding@resend.dev>',
    to: email,
    subject: 'Your Agent Identity credentials',
    text,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
