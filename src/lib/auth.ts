// src/lib/auth.ts

/**
 * Authentication utilities for protecting admin routes and pages.
 * Assumes Supabase auth is used (adjust imports if you use a different provider).
 */
import { createServerComponentSupabaseClient } from '@/utils/supabase-browser';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Retrieves the current Supabase session (server‑side).
 */
export async function getSession() {
  const supabase = createServerComponentSupabaseClient({ cookies });
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }
  return data.session;
}

/**
 * Middleware that ensures the request is made by an admin user.
 * Throws a 403 response if the user is not authorized.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    // Not logged in – redirect to sign‑in page.
    redirect('/login');
  }
  // Assuming you store a custom claim "role" in the JWT metadata.
  const isAdmin = (session.user?.app_metadata?.role ?? '') === 'admin';
  if (!isAdmin) {
    // Not an admin – show forbidden.
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
