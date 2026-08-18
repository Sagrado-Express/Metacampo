import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { getTenantMembers, setMemberManager } from '@/lib/services/TenantMembersService';
import { buildItLookup, calcVpm } from '@/lib/services/VpmService';
import { getErrorMessage } from '@/lib/utils';
import { rateLimitResponse } from '@/lib/rateLimiter';

interface ClassificacaoRow {
  custom_name: string;
}

interface ItConfigRow {
  crop_name: string;
  segment_name: string;
  value_per_hectare: number;
}

interface ClienteRow {
  id: string;
  ctv_id: string;
}

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json({ error: 'FORBIDDEN', message: 'Só administradores podem ver os membros do tenant.' }, { status: 403 });

/**
 * Lista os membros (usuários já registrados, não convites pendentes) do
 * tenant atual — usado pra resolver "e-mail do CTV" numa linha de CSV pra
 * um userId real na importação de clientes, e para a árvore comercial
 * (CTV → gerente → diretor) em Configurações → Usuários.
 *
 * Inclui vpmPotencialCentavos: soma do VPM potencial dos clientes cujo
 * ctv_id é este membro — carteira própria, sem somar a de quem reporta
 * para ele (esse roll-up é feito no front, que já tem a árvore montada).
 */
export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;

  try {
    const members = await getTenantMembers(ctx.tenantId);

    const [{ data: areas }, { data: indices }, { data: segmentosAtivos }] = await Promise.all([
      ctx.supabase.from('customer_crop_areas').select('customer_id, crop_name, area_ha'),
      ctx.supabase.from('it_se_configurations').select('*'),
      ctx.supabase
        .from('tenant_config_classificacoes')
        .select('custom_name')
        .eq('is_active', true)
        .is('parent_key', null),
    ]);

    const { data: clientes } = await ctx.supabase.from('clientes').select('id, ctv_id');

    const segNames: string[] = (segmentosAtivos as ClassificacaoRow[] || []).map((s) => s.custom_name);
    const itLookup = buildItLookup(
      (indices as ItConfigRow[] || []).map((ind) => ({
        cultivo: ind.crop_name,
        segmento: ind.segment_name,
        valorPorHectareCentavos: Number(ind.value_per_hectare),
      }))
    );

    const ctvIdPorCliente = new Map((clientes as ClienteRow[] || []).map((c) => [c.id, c.ctv_id]));
    const vpmPorCtv = new Map<string, number>();
    for (const area of areas || []) {
      const ctvId = ctvIdPorCliente.get(area.customer_id);
      if (!ctvId) continue;
      let vpm = 0;
      for (const seg of segNames) {
        vpm += calcVpm({
          hectares: Number(area.area_ha),
          cropName: area.crop_name,
          segmentName: seg,
          itLookup,
        });
      }
      vpmPorCtv.set(ctvId, (vpmPorCtv.get(ctvId) || 0) + vpm);
    }

    const withVpm = members.map((m) => ({
      ...m,
      vpmPotencialCentavos: vpmPorCtv.get(m.userId) || 0,
    }));

    return NextResponse.json(withVpm);
  } catch (error) {
    console.error('[api/tenant/members][GET]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível carregar os membros do tenant.' },
      { status: 503 }
    );
  }
}

const MANAGER_ERROR_MESSAGES: Record<string, string> = {
  SELF_MANAGER: 'Um membro não pode ser gerente de si mesmo.',
  NOT_FOUND: 'Membro não encontrado neste tenant.',
  MANAGER_NOT_IN_TENANT: 'O gerente selecionado não pertence a este tenant.',
  CYCLE: 'Essa atribuição criaria um ciclo na árvore comercial (A reporta para quem reporta para A).',
};

/**
 * Atribui (ou remove, com managerId: null) o gerente de um membro —
 * árvore comercial CTV → gerente → diretor regional, pedida pelo Marco
 * Polo em 11/08/2026.
 */
export async function PATCH(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;
  const limited = rateLimitResponse(ctx.userId, 30);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { userId, managerId } = body;
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    await setMemberManager(ctx.tenantId, userId, managerId ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorCode = getErrorMessage(error);
    const message = MANAGER_ERROR_MESSAGES[errorCode];
    if (message) {
      return NextResponse.json({ error: errorCode, message }, { status: 400 });
    }
    console.error('[api/tenant/members][PATCH]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível atualizar o gerente.' },
      { status: 503 }
    );
  }
}
