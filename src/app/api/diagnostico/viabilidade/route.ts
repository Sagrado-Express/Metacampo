import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { supabase } = ctx;

  try {
    const body = await request.json();
    const { metaVendasCentavos, shareEstimado } = body; // shareEstimado é decimal (ex.: 0.05 = 5%)

    if (metaVendasCentavos === undefined || !shareEstimado) {
      return NextResponse.json({ error: 'metaVendasCentavos e shareEstimado são obrigatórios' }, { status: 400 });
    }

    // 1. VPM Necessário = Meta / Share
    const vpmNecessario = Math.round(metaVendasCentavos / shareEstimado);

    // 2. Áreas e índices do tenant (RLS filtra por tenant automaticamente).
    //
    // Não há fallback com dados fictícios aqui. A versão anterior, quando o
    // banco falhava, calculava a viabilidade sobre uma carteira inventada
    // (~204 milhões de VPM) e devolvia o resultado como se fosse real —
    // um número de negócio fabricado indistinguível do verdadeiro.
    const { data: dbAreas, error: areasError } = await supabase
      .from('customer_crop_areas')
      .select('*');

    if (areasError) throw areasError;

    const { data: dbIndices, error: indicesError } = await supabase
      .from('it_se_configurations')
      .select('*');

    if (indicesError) throw indicesError;

    const areas = dbAreas || [];
    const indices = dbIndices || [];

    // 3. VPM Real da carteira
    let vpmRealTotal = 0;
    for (const area of areas) {
      const index = indices.find(
        (ind: any) => ind.crop_name?.toUpperCase() === area.crop_name?.toUpperCase()
      );
      const valuePerHectare = index ? Number(index.value_per_hectare) : 0;
      vpmRealTotal += Math.round(Number(area.area_ha) * valuePerHectare);
    }

    return NextResponse.json({
      metaVendasCentavos,
      shareEstimado,
      vpmNecessario,
      vpmReal: vpmRealTotal,
      viavel: vpmRealTotal >= vpmNecessario,
      deficit: Math.max(0, vpmNecessario - vpmRealTotal),
      // Deixa explícito sobre quantos registros o cálculo foi feito, para que
      // uma carteira vazia não seja confundida com "inviável".
      baseCalculo: { areas: areas.length, indices: indices.length },
    });
  } catch (error: any) {
    console.error('[api/diagnostico/viabilidade] Supabase error:', error);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível carregar os dados do banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}
