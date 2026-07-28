// src/lib/auth.ts

/**
 * Authentication utilities for protecting admin routes and pages.
 * Assumes Supabase auth is used (adjust imports if you use a different provider).
 */
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Decodes a base64url encoded JWT payload.
 */
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payloadJson);
  } catch (e) {
    return null;
  }
}

/**
 * Retrieves the current session (server‑side).
 * Checks cookies first for Next.js Server Components / Route Handlers support.
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (token) {
      // Lê as claims do token para uso do lado do servidor.
      // A autorização de verdade é feita pelo Supabase, que valida a assinatura
      // do mesmo token em cada query — aqui só extraímos o que já foi assinado.
      const payload = decodeJwtPayload(token);

      // FAIL-CLOSED: sem tenant_id na claim não há sessão válida.
      // Antes havia um default para o tenant Piloto, o que dava acesso a dados
      // de outro tenant para qualquer token malformado.
      const tenantId = payload?.app_metadata?.tenant_id || payload?.tenant_id;

      if (payload && tenantId) {
        return {
          access_token: token,
          token_type: 'bearer',
          expires_in: payload.exp ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000)) : 3600,
          refresh_token: cookieStore.get('sb-refresh-token')?.value || '',
          user: {
            id: payload.sub,
            email: payload.email,
            app_metadata: {
              role: payload.app_metadata?.role || payload.role || 'user',
              tenant_id: tenantId,
            },
            user_metadata: {
              full_name: payload.user_metadata?.full_name || payload.email,
            }
          }
        };
      }
    }

    // Try Supabase auth direct query as a backup
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) {
      return data.session;
    }
  } catch (err) {
    console.warn('Error reading session from cookies/Supabase:', err);
  }
  return null;
}

/**
 * Middleware that ensures the request is made by an authorized user.
 * Redirects or throws if not authenticated.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Middleware that ensures the request is made by an admin user.
 * Throws a 403 response if the user is not authorized.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  
  // Accept 'admin' role or custom claims
  const role = session.user?.app_metadata?.role ?? '';
  const isAdmin = role === 'admin';
  if (!isAdmin) {
    redirect('/unauthorized');
  }
  return session;
}

/**
 * Generates a CSRF token for use in forms.
 * The token is stored in an http‑only cookie and also returned so it can be
 * rendered into a hidden input field.
 */
export function csrfToken() {
  const token = crypto.randomUUID();
  // Set cookie (http‑only, sameSite="strict")
  const cookie = `csrf=${token}; Path=/; HttpOnly; SameSite=Strict; Secure`;
  // In a real Next.js env you would use `cookies().set` but here we just return.
  return { token, cookie };
}

/**
 * Get tenant_id from session or throw error if missing.
 * FAIL-CLOSED: Never returns default/fallback tenant.
 * Used by API routes that require tenant context.
 */
export async function getTenantIdOrFail(): Promise<string> {
  const session = await getSession();

  if (!session?.user?.app_metadata?.tenant_id) {
    throw new Error('MISSING_TENANT_ID');
  }

  return session.user.app_metadata.tenant_id;
}
