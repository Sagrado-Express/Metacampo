import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthedContext } from '@/lib/auth';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

/**
 * Lista os convites do tenant, mais recentes primeiro. A tela usa isso pra
 * mostrar quem já foi convidado e se o convite ainda está pendente.
 */
export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  const { data, error } = await ctx.supabase
    .from('tenant_invites')
    .select('id, email, token, role, used_at, expires_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/tenant/invites][GET]', error);
    return NextResponse.json({ error: 'DATA_SOURCE_UNAVAILABLE' }, { status: 503 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const { email, role: bodyRole } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
    }

    const role = bodyRole === 'admin' ? 'admin' : 'user';

    const token = randomBytes(24).toString('hex');

    const { data, error } = await ctx.supabase
      .from('tenant_invites')
      .insert({
        tenant_id: ctx.tenantId,
        email: email.toLowerCase(),
        token,
        role,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[api/tenant/invites][POST]', error);
      return NextResponse.json({ error: 'INVITE_CREATION_FAILED' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://metacampo.vercel.app'}/register?invite=${data.token}`,
      email: data.email,
      role: data.role,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    });
  } catch (err: any) {
    console.error('[api/tenant/invites][POST] Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
