// src/lib/rateLimiter.ts
// Simple in‑memory rate limiter (development only).
// For production replace with Redis/Upstash or a dedicated WAF.

import { NextResponse } from 'next/server';

interface RateRecord {
  count: number;
  resetAt: number; // timestamp (ms) when the window resets
}

const store = new Map<string, RateRecord>();

/**
 * Checks whether the given key (e.g. IP address) is allowed to proceed.
 * @param key Unique identifier – usually the client IP.
 * @param limit Maximum number of requests allowed in the window.
 * @param intervalMs Window size in milliseconds.
 * @returns true if allowed, false otherwise.
 */
export function checkRateLimit(key: string, limit: number, intervalMs: number): boolean {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    // start a new window
    store.set(key, { count: 1, resetAt: now + intervalMs });
    return true;
  }

  if (record.count < limit) {
    record.count += 1;
    return true;
  }

  // limit reached
  return false;
}

/**
 * Returns the seconds remaining until the next window opens.
 */
export function getRetryAfter(key: string): number {
  const record = store.get(key);
  if (!record) return 0;
  const now = Date.now();
  return Math.max(0, Math.ceil((record.resetAt - now) / 1000));
}

/**
 * Aplica rate limit e já devolve a resposta 429 pronta, ou `null` se a
 * requisição pode seguir. Uso em rotas autenticadas: chave = userId (mais
 * preciso que IP quando a requisição já passou por auth), 60s de janela.
 *
 *   const limited = rateLimitResponse(ctx.userId, 30);
 *   if (limited) return limited;
 */
export function rateLimitResponse(key: string, limit: number, intervalMs = 60_000): NextResponse | null {
  if (checkRateLimit(key, limit, intervalMs)) return null;
  const retryAfter = getRetryAfter(key);
  return NextResponse.json(
    { error: 'RATE_LIMITED', message: 'Muitas requisições em pouco tempo. Aguarde e tente novamente.' },
    { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
  );
}
