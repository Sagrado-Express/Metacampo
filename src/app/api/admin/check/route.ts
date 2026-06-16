// src/app/api/admin/check/route.ts

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { rateLimit } from '@/middleware/rateLimit';

export async function GET() {
  // Apply rate limiting first
  const limitResult = rateLimit({ ip: "" } as any);
  if (limitResult) return limitResult;

  // Verify admin session – throws redirect if not admin
  await requireAdmin();
  return NextResponse.json({ authorized: true });
}
