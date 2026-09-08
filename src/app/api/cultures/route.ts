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
    const { customName, displayOrder, id, isActive, aliases, ibgeProduto, ibgeTipo, addProdutoIbge, substituirPor } = body;

    // Substituição em massa: repointa clientes/Índice Tecnológico/planejamento
    // da cultura `id` pra `substituirPor` — corpo { id, substituirPor }.
    // Pedido do Marco Polo, 03/09/2026 (ver segmentDictionary.service.ts).
    if (id && substituirPor) {
      const resultado = await SegmentDictionaryService.substituirCultura(
        ctx.supabase,
        ctx.tenantId,
        id,
        substituirPor
      );
      return NextResponse.json(resultado);
    }

    // Associar mais um produto IBGE a uma cultura já existente (de-para,
    // 31/08/2026) — corpo { id, addProdutoIbge: { produto, tipo } }.
    if (id && addProdutoIbge) {
      await SegmentDictionaryService.addProdutoIbge(
        ctx.supabase,
        ctx.tenantId,
        id,
        addProdutoIbge.produto,
        addProdutoIbge.tipo ?? null
      );
      const atualizada = await SegmentDictionaryService.getCultura(ctx.supabase, ctx.tenantId, id);
      return NextResponse.json(atualizada);
    }

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

    // Wire fica no formato singular (ibgeProduto/ibgeTipo) pro caso comum de
    // habilitar 1 produto do catálogo — internamente já é uma lista de 1.
    const newCult = await SegmentDictionaryService.createCultura(ctx.supabase, ctx.tenantId, {
      customName,
      displayOrder,
      aliases,
      ibgeProdutos: ibgeProduto ? [{ produto: ibgeProduto, tipo: ibgeTipo ?? null }] : undefined,
    });

    return NextResponse.json(newCult);
  } catch (error) {
    console.error('[Cultures API] Supabase error (POST):', error);
    const message = getErrorMessage(error);
    if (
      message.includes('já existe') ||
      message.includes('já está associado') ||
      message.includes('substituir uma cultura por ela mesma') ||
      message.includes('cultura desabilitada')
    ) {
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
  const removeProduto = searchParams.get('removeProduto');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    // Remove só uma associação do de-para (?id=<culturaId>&removeProduto=X) —
    // a cultura em si continua existindo, mesmo padrão da rota POST/addProdutoIbge.
    if (removeProduto) {
      await SegmentDictionaryService.removeProdutoIbge(ctx.supabase, ctx.tenantId, id, removeProduto);
      const atualizada = await SegmentDictionaryService.getCultura(ctx.supabase, ctx.tenantId, id);
      return NextResponse.json(atualizada);
    }

    await SegmentDictionaryService.deleteCultura(ctx.supabase, ctx.tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (getErrorMessage(error) === 'CULTURA_EM_USO') {
      return NextResponse.json(
        {
          error: 'CULTURA_EM_USO',
          message: 'Essa cultura já tem dado de cliente, Índice Tecnológico ou planejamento associado — não pode ser excluída. Desabilite em vez de excluir.',
        },
        { status: 409 }
      );
    }
    console.error('[Cultures API] Supabase error (DELETE):', error);
    return unavailable('excluir');
  }
}
