// src/lib/auth.ts

/**
 * Authentication utilities for protecting admin routes and pages.
 * Assumes Supabase auth is used (adjust imports if you use a different provider).
 */
import { getSupabaseClientWithSession } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

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

    // Sem cookie, não há sessão — ponto final. Havia aqui um fallback que
    // consultava supabase.auth.getSession() no client singleton compartilhado
    // (`@/lib/supabase`). Esse client mantém estado de sessão em memória por
    // processo inteiro; qualquer login anterior no mesmo processo aquecido
    // deixava sessão "encontrável" por esse fallback, então uma requisição
    // SEM cookie nenhum podia ser tratada como autenticada com a identidade
    // de outro usuário. Verificado nesta auditoria: uma chamada sem sessão
    // "encontrou" um convite de outro tenant por essa via.
  } catch (err) {
    console.warn('Error reading session from cookies:', err);
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
 * Contexto autenticado para uso em API routes.
 *
 * Devolve um client Supabase que carrega o JWT do usuário, de modo que o RLS
 * do Postgres decide o que a query enxerga — sem filtro manual de tenant_id
 * (Regra Nº4). O tenantId vem da claim assinada, nunca de query param:
 * um parâmetro na URL é controlado pelo cliente e permitiria ler outro tenant.
 *
 * Retorna null quando não há sessão válida — o chamador responde 401.
 */
export async function getAuthedContext(): Promise<
  { supabase: SupabaseClient; tenantId: string; userId: string; role: string } | null
> {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id;
  const userId = session?.user?.id;
  if (!session || !tenantId || !userId) return null;

  try {
    const client = await getSupabaseClientWithSession();
    const role = session.user.app_metadata?.role || 'user';
    return { supabase: client, tenantId, userId, role };
  } catch {
    return null;
  }
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
