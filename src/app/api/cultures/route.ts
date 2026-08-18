import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { SegmentDictionaryService } from '@/domain/services/segmentDictionary.service';
import { getErrorMessage } from '@/lib/utils';
import { rateLimitResponse } from '@/lib/rateLimiter';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem configurar culturas do tenant.' },
  { status: 403 }
);

function unavailable(acao: string) {
  return NextResponse.json(
    {
      error: 'DATA_SOURCE_UNAVAILABLE',
      message: `Não foi possível ${acao} os dados no banco. Tente novamente em instantes.`,
    },
    { status: 503 }
  );
}

/**
 * GET /api/cultures            -> apenas as culturas ativas
 * GET /api/cultures?todas=true -> ativas e inativas
 *
 * A aba Culturas (catálogo IBGE) precisa das inativas para mostrar o que está
 * desligado; as telas de uso (cadastro de produtor, VPM) só querem as ativas.
 */
export async function GET(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  const { searchParams } = new URL(request.url);
  const todas = searchParams.get('todas') === 'true';

  try {
    const cultures = todas
      ? await SegmentDictionaryService.getAllCulturas(ctx.supabase, ctx.tenantId)
      : await SegmentDictionaryService.getActiveCulturas(ctx.supabase, ctx.tenantId);
    return NextResponse.json(cultures);
  } catch (error) {
    console.error('[Cultures API] Supabase error (GET):', error);
    return unavailable('carregar');
  }
}

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  // Auditoria 11/08/2026: configurar culturas é parametrização do tenant
  // inteiro (afeta VPM/Índice Tecnológico de todos os CTVs), não uma ação
  // rotineira de cadastro — igual classifications e indice-tecnologico.
  if (ctx.role !== 'admin') return FORBIDDEN;
  const limited = rateLimitResponse(ctx.userId, 30);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { customName, displayOrder, id, isActive, aliases, ibgeProduto, ibgeTipo } = body;

    // Atualização de um registro existente.
    // Antes, qualquer corpo com { id, isActive } caía no toggle e o customName
    // era descartado: renomear uma cultura respondia 200 { success: true } sem
    // alterar nada. Agora rename, apelidos e toggle vão na mesma atualização.
    if (id) {
      const atualizada = await SegmentDictionaryService.updateCultura(
        ctx.supabase,
        ctx.tenantId,
        id,
        { customName, displayOrder, isActive, aliases }
      );
      return NextResponse.json(atualizada);
    }

    if (!customName) {
      return NextResponse.json({ error: 'customName is required' }, { status: 400 });
    }

    const newCult = await SegmentDictionaryService.createCultura(ctx.supabase, ctx.tenantId, {
      customName,
      displayOrder,
      aliases,
      ibgeProduto,
      ibgeTipo,
    });

    return NextResponse.json(newCult);
  } catch (error) {
    console.error('[Cultures API] Supabase error (POST):', error);
    const message = getErrorMessage(error);
    if (message.includes('já existe')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return unavailable('salvar');
  }
}

export async function DELETE(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;
  const limited = rateLimitResponse(ctx.userId, 30);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await SegmentDictionaryService.deactivateCultura(ctx.supabase, ctx.tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cultures API] Supabase error (DELETE):', error);
    return unavailable('excluir');
  }
}
