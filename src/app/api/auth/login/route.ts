import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { checkRateLimit, getRetryAfter } from '@/lib/rateLimiter';

/** Helper: extrai IP real mesmo atrás de CDN — mesmo padrão de auth/register. */
function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
  // Achado em auditoria (11/08/2026): login nunca teve rate limit, ao
  // contrário de register — permitia brute-force/credential-stuffing sem
  // limite contra qualquer conta real.
  const ip = getClientIp(request);
  const allowed = checkRateLimit(ip, 10, 60_000);
  if (!allowed) {
    const retryAfter = getRetryAfter(ip, 60_000);
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde e tente novamente.' },
      { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Autenticação real no Supabase. Não existe fallback mock:
    // um JWT falso é rejeitado pelo Supabase na validação de assinatura,
    // o que produzia uma sessão "logada" mas sem acesso a nenhum dado (RLS).
    let sessionData = null;

    try {
      const supabase = createAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      sessionData = data.session;
    } catch (e: any) {
      console.error('[auth/login] Supabase inalcançável:', e?.message);
      return NextResponse.json(
        {
          error: 'AUTH_SOURCE_UNAVAILABLE',
          message: 'Não foi possível contatar o serviço de autenticação. Tente novamente em instantes.',
        },
        { status: 503 }
      );
    }

    if (!sessionData) {
      return NextResponse.json({ error: 'Falha na autenticação' }, { status: 401 });
    }

    // 3. Set cookies for server-side route authentication
    const cookieStore = await cookies();
    cookieStore.set('sb-access-token', sessionData.access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: sessionData.expires_in,
    });
    cookieStore.set('sb-refresh-token', sessionData.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true, user: sessionData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
