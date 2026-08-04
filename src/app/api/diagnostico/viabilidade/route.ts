import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { buildItLookup, calcClientVpmTotal } from '@/lib/services/VpmService';
import type { SupabaseClient } from '@supabase/supabase-js';

const SAFRA_PADRAO = '25/26';

/**
 * Monta o retorno de viabilidade: meta individual do CTV (se configurada),
 * apetite total já comprometido no planejamento, e potencial bruto da
 * carteira do tenant inteiro (contexto — não é a carteira exclusiva deste
 * CTV, já que clientes não têm dono exclusivo no modelo atual).
 */
async function computeViabilidade(supabase: SupabaseClient, userId: string) {
  const [
    { data: metaRow, error: metaError },
    { data: planejamentoRows, error: planejamentoError },
    { data: areas, error: areasError },
    { data: itRows, error: itError },
    { data: segmentos, error: segmentosError },
  ] = await Promise.all([
    supabase.from('ctv_metas').select('*').eq('ctv_id', userId).eq('safra', SAFRA_PADRAO).maybeSingle(),
    supabase.from('planejamento_cliente_segmento').select('valor_planejado_centavos').eq('ctv_id', userId),
    supabase.from('customer_crop_areas').select('*'),
    supabase.from('it_se_configurations').select('*'),
    supabase.from('tenant_config_classificacoes').select('*').eq('is_active', true).is('parent_key', null),
  ]);

  const firstError = metaError || planejamentoError || areasError || itError || segmentosError;
  if (firstError) throw firstError;

  // Apetite = o que ESTE CTV planejou (ctv_id = quem gravou a linha), não o
  // que os clientes dele valem. Linhas antigas com ctv_id nulo ficam de fora
  // por design — não contam pra ninguém.
  const apetiteTotalCentavos = (planejamentoRows || []).reduce(
    (acc: number, row: { valor_planejado_centavos: number }) => acc + Number(row.valor_planejado_centavos ?? 0),
    0
  );

  const itLookup = buildItLookup(
    (itRows || []).map((ind: any) => ({
      cultivo: ind.crop_name,
      segmento: ind.segment_name,
      valorPorHectareCentavos: Number(ind.value_per_hectare),
    }))
  );

  const { vpmTotal: vpmPotencialCarteiraCentavos } = calcClientVpmTotal({
    areas: (areas || []).map((a: any) => ({ cropName: a.crop_name, areaHa: Number(a.area_ha) })),
    segments: (segmentos || []).map((s: any) => s.custom_name),
    itLookup,
  });

  const metaVendasCentavos = metaRow ? Number(metaRow.meta_vendas_centavos) : null;
  const shareEstimado = metaRow ? Number(metaRow.share_estimado) : null;
  const vpmNecessario =
    metaVendasCentavos != null && shareEstimado ? Math.round(metaVendasCentavos / shareEstimado) : null;
  const viavel = vpmNecessario != null ? apetiteTotalCentavos >= vpmNecessario : null;
  const deficit = vpmNecessario != null ? Math.max(0, vpmNecessario - apetiteTotalCentavos) : 0;

  return {
    safra: SAFRA_PADRAO,
    metaVendasCentavos,
    shareEstimado,
    vpmNecessario,
    apetiteTotalCentavos,
    vpmPotencialCarteiraCentavos,
    viavel,
    deficit,
  };
}

export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const result = await computeViabilidade(ctx.supabase, ctx.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[api/diagnostico/viabilidade][GET]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível carregar a viabilidade.' },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await request.json();
    const { metaVendasCentavos, shareEstimado } = body;

    if (metaVendasCentavos === undefined || metaVendasCentavos === null) {
      return NextResponse.json(
        { error: 'META_OBRIGATORIA', message: 'metaVendasCentavos é obrigatório' },
        { status: 400 }
      );
    }

    // Bloqueado no back, não só no front: shareEstimado <= 0 causaria
    // divisão por zero no cálculo de vpmNecessario.
    if (!shareEstimado || Number(shareEstimado) <= 0 || Number(shareEstimado) > 1) {
      return NextResponse.json(
        {
          error: 'SHARE_INVALIDO',
          message: 'shareEstimado deve ser maior que 0 e no máximo 1 (ex.: 0.05 = 5%)',
        },
        { status: 400 }
      );
    }

    const { error: upsertError } = await ctx.supabase.from('ctv_metas').upsert(
      {
        tenant_id: ctx.tenantId,
        ctv_id: ctx.userId,
        safra: SAFRA_PADRAO,
        meta_vendas_centavos: Math.round(Number(metaVendasCentavos)),
        share_estimado: Number(shareEstimado),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,ctv_id,safra' }
    );

    if (upsertError) throw upsertError;

    const result = await computeViabilidade(ctx.supabase, ctx.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[api/diagnostico/viabilidade][POST]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível salvar a meta.' },
      { status: 503 }
    );
  }
}
