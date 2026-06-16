// src/middleware/rateLimit.ts

/**
 * Simple in‑memory rate limiter for Next.js API routes.
 * Uses a Map to store request timestamps per IP address.
 * Adjust `WINDOW_MS` and `MAX_REQUESTS` as needed.
 */
import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // default threshold

// Store timestamps of requests per IP
const ipRecords = new Map<string, number[]>();

export function rateLimit(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();

  const timestamps = ipRecords.get(ip) ?? [];
  // Remove timestamps older than window
  const recent = timestamps.filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  ipRecords.set(ip, recent);

  if (recent.length > MAX_REQUESTS) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // No response means request can continue
  return null;
}
