import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { getTenantMembers } from '@/lib/services/TenantMembersService';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json({ error: 'FORBIDDEN', message: 'Só administradores podem ver os membros do tenant.' }, { status: 403 });

/**
 * Lista os membros (usuários já registrados, não convites pendentes) do
 * tenant atual — usado pra resolver "e-mail do CTV" numa linha de CSV pra
 * um userId real na importação de clientes.
 */
export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;

  try {
    const members = await getTenantMembers(ctx.tenantId);
    return NextResponse.json(members);
  } catch (error: any) {
    console.error('[api/tenant/members][GET]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível carregar os membros do tenant.' },
      { status: 503 }
    );
  }
}
