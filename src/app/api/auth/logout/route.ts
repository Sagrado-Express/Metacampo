import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getErrorMessage } from '@/lib/utils';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
