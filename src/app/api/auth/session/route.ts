import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getErrorMessage } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
