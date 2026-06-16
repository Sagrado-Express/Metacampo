// src/lib/csrf.ts

/**
 * Simple CSRF protection utilities.
 * Generates a token stored in an http‑only cookie and validates it on incoming requests.
 */
import { cookies } from 'next/headers';

/** Generate a new CSRF token and set it as an http‑only cookie. */
export function generateCsrfToken(): string {
  const token = crypto.randomUUID();
  // Set cookie – Next.js provides a mutable cookies() API on server components
  cookies().set('csrf', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: true,
    maxAge: 60 * 60, // 1 hour
  });
  return token;
}

/** Validate the token sent from a request (e.g., from form body or header). */
export function validateCsrfToken(token: string | undefined): boolean {
  if (!token) return false;
  const stored = cookies().get('csrf')?.value;
  return stored === token;
}
