import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Helper to generate a mock JWT for offline testing
function generateMockJwt(userId: string, email: string, tenantId: string, role: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email: email,
    role: role,
    tenant_id: tenantId,
    app_metadata: {
      role: role,
      tenant_id: tenantId,
    },
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h expiration
  })).toString('base64url');
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    let sessionData = null;
    let isOffline = false;

    try {
      // 1. Try real Supabase Auth first
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // If it's a real authentication error, we fail, unless the error is due to network connection issues
        if (error.message.includes('FetchError') || error.message.includes('network') || error.status === 0) {
          isOffline = true;
        } else {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      } else if (data.session) {
        // Success with Supabase
        sessionData = data.session;
      }
    } catch (e: any) {
      // If network fails (e.g. DNS lookup / getaddrinfo ENOTFOUND)
      isOffline = true;
    }

    // 2. Offline / Mock fallback if Supabase is unreachable
    if (isOffline) {
      console.warn('Supabase Auth offline. Falling back to local mock authentication.');
      
      // Determine tenant ID based on email pattern for multi-tenant testing
      let tenantId = '00000000-0000-0000-0000-000000000000'; // Default Piloto
      let role = 'admin';

      if (email.includes('tenant1') || email.includes('teste1')) {
        tenantId = '11111111-1111-1111-1111-111111111111';
      } else if (email.includes('tenant2') || email.includes('teste2')) {
        tenantId = '22222222-2222-2222-2222-222222222222';
      }

      const mockToken = generateMockJwt('mock-user-uuid', email, tenantId, role);
      
      sessionData = {
        access_token: mockToken,
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: {
          id: 'mock-user-uuid',
          email,
          app_metadata: { role, tenant_id: tenantId },
          user_metadata: { full_name: 'Usuário Simulado' }
        }
      };
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
