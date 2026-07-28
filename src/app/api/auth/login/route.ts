import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
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
