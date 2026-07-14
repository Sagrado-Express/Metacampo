import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { buildItLookup, calcVpm } from '@/lib/services/VpmService';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const tenantId = session?.user?.app_metadata?.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
  }

  const [
    { data: clientes, error: eClientes },
    { data: areas, error: eAreas },
    { data: itRows, error: eIt },
    { data: culturas, error: eCulturas },
    { data: segmentos, error: eSegmentos },
    { data: planejamentoRows, error: ePlanejamento },
  ] = await Promise.all([
    supabase.from('clientes').select('*').eq('tenant_id', tenantId),
    supabase.from('customer_crop_areas').select('*').eq('tenant_id', tenantId),
    supabase.from('it_se_configurations').select('*').eq('tenant_id', tenantId),
    supabase.from('tenant_config_culturas').select('*').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('tenant_config_classificacoes').select('*').eq('tenant_id', tenantId).eq('is_active', true).is('parent_key', null),
    supabase.from('planejamento_cliente_segmento').select('*').eq('tenant_id', tenantId),
  ]);

  const firstError = eClientes || eAreas || eIt || eCulturas || eSegmentos || ePlanejamento;
  if (firstError) {
    console.error('[api/planejamento/dashboard-full] Supabase error:', firstError);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível carregar o planejamento.' },
      { status: 503 }
    );
  }

  const itLookup = buildItLookup(
    (itRows || []).map((ind: any) => ({
      cultivo: ind.crop_name,
      segmento: ind.segment_name,
      valorPorHectareCentavos: Number(ind.value_per_hectare),
    }))
  );

  const carteira = (clientes || []).map((cliente) => {
    const areasDoCliente = (areas || []).filter((a) => a.customer_id === cliente.id);
    const linhas = areasDoCliente.flatMap((area) =>
      (segmentos || []).map((segmento) => ({
        clienteId: cliente.id,
        clienteNome: cliente.name,
        cultura: area.crop_name,
        segmento: segmento.custom_name,
        hectares: area.area_ha,
        vpmCentavos: calcVpm({
          hectares: area.area_ha,
          cropName: area.crop_name,
          segmentName: segmento.custom_name,
          itLookup,
        }),
      }))
    );
    return linhas;
  }).flat();

  const porCultivo = Object.values(
    carteira.reduce((acc: Record<string, any>, linha) => {
      acc[linha.cultura] ??= { cultivo: linha.cultura, areaTotalHa: 0, vpmPotencialCentavos: 0 };
      if (!acc[linha.cultura].hasOwnProperty('_hectaresAdded')) {
        acc[linha.cultura]._hectaresAdded = new Set();
      }
      
      const uniqueAreaKey = `${linha.clienteId}-${linha.cultura}`;
      if (!acc[linha.cultura]._hectaresAdded.has(uniqueAreaKey)) {
        acc[linha.cultura].areaTotalHa += linha.hectares;
        acc[linha.cultura]._hectaresAdded.add(uniqueAreaKey);
      }
      
      acc[linha.cultura].vpmPotencialCentavos += linha.vpmCentavos;
      return acc;
    }, {})
  ).map((item: any) => {
    delete item._hectaresAdded;
    return item;
  });

  const porSegmento = Object.values(
    carteira.reduce((acc: Record<string, any>, linha) => {
      acc[linha.segmento] ??= { segmento: linha.segmento, potencialCentavos: 0 };
      acc[linha.segmento].potencialCentavos += linha.vpmCentavos;
      return acc;
    }, {})
  );

  return NextResponse.json({
    clientes,
    carteira,
    porCultivo,
    porSegmento,
    planejamentoRows,
    culturas,
    segmentos,
  });
}
