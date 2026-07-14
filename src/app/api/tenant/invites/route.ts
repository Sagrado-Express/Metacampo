import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { getTenantIdOrFail } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // FAIL-CLOSED: Must have valid tenant_id in session
    const tenantId = await getTenantIdOrFail();

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    // Validate email format (basic)
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL_FORMAT' },
        { status: 400 }
      );
    }

    const token = randomBytes(24).toString('hex');

    const { data, error } = await supabaseAdmin
      .from('tenant_invites')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        token,
        created_by: null, // Could add user_id from session if needed
      })
      .select()
      .single();

    if (error) {
      console.error('[api/tenant/invites][POST]', error);
      return NextResponse.json(
        { error: 'INVITE_CREATION_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://metacampo.vercel.app'}/register?invite=${data.token}`,
      email: data.email,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    });
  } catch (err: any) {
    if (err.message === 'MISSING_TENANT_ID') {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Tenant context required' },
        { status: 403 }
      );
    }
    console.error('[api/tenant/invites][POST] Error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
