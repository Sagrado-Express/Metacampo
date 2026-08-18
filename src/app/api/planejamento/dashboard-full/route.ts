import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabaseClientWithSession } from '@/lib/supabase';
import { buildItLookup, calcVpm } from '@/lib/services/VpmService';
import { fetchAllRows } from '@/lib/db';

// Formato bruto das linhas do Supabase (snake_case), refletindo as colunas
// reais das tabelas envolvidas em docs/schema_completo_supabase.sql. Só os
// campos que esta rota efetivamente lê.
interface ClienteRow {
  id: string;
  name: string;
}

interface CropAreaRow {
  customer_id: string;
  crop_name: string;
  area_ha: number;
}

interface ItConfigRow {
  crop_name: string;
  segment_name: string;
  value_per_hectare: number;
}

interface CulturaRow {
  custom_name: string;
}

interface ClassificacaoRow {
  custom_name: string;
}

interface PlanejamentoRow {
  id: string;
}

interface PorCultivoAcc {
  cultivo: string;
  areaTotalHa: number;
  vpmPotencialCentavos: number;
  _hectaresAdded?: Set<string>;
}

interface PorSegmentoAcc {
  segmento: string;
  potencialCentavos: number;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const supabase = await getSupabaseClientWithSession();

    // fetchAllRows em vez de .select('*') puro: o PostgREST trunca em ~1000
    // linhas sem erro nenhum, o que sub-contaria potencial/planejado de
    // silêncio assim que o tenant crescer — achado em auditoria 11/08/2026.
    const [clientes, areas, itRows, culturas, segmentos, planejamentoRows] = await Promise.all([
      fetchAllRows<ClienteRow>((from, to) => supabase.from('clientes').select('*').range(from, to)),
      fetchAllRows<CropAreaRow>((from, to) => supabase.from('customer_crop_areas').select('*').range(from, to)),
      fetchAllRows<ItConfigRow>((from, to) => supabase.from('it_se_configurations').select('*').range(from, to)),
      fetchAllRows<CulturaRow>((from, to) =>
        supabase.from('tenant_config_culturas').select('*').eq('is_active', true).range(from, to)
      ),
      fetchAllRows<ClassificacaoRow>((from, to) =>
        supabase
          .from('tenant_config_classificacoes')
          .select('*')
          .eq('is_active', true)
          .is('parent_key', null)
          .range(from, to)
      ),
      fetchAllRows<PlanejamentoRow>((from, to) => supabase.from('planejamento_cliente_segmento').select('*').range(from, to)),
    ]);

    const itLookup = buildItLookup(
      (itRows || []).map((ind) => ({
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
      carteira.reduce((acc: Record<string, PorCultivoAcc>, linha) => {
        acc[linha.cultura] ??= { cultivo: linha.cultura, areaTotalHa: 0, vpmPotencialCentavos: 0 };
        if (!acc[linha.cultura]._hectaresAdded) {
          acc[linha.cultura]._hectaresAdded = new Set();
        }

        const uniqueAreaKey = `${linha.clienteId}-${linha.cultura}`;
        if (!acc[linha.cultura]._hectaresAdded!.has(uniqueAreaKey)) {
          acc[linha.cultura].areaTotalHa += linha.hectares;
          acc[linha.cultura]._hectaresAdded!.add(uniqueAreaKey);
        }

        acc[linha.cultura].vpmPotencialCentavos += linha.vpmCentavos;
        return acc;
      }, {})
    ).map((item) => {
      delete item._hectaresAdded;
      return item;
    });

    const porSegmento = Object.values(
      carteira.reduce((acc: Record<string, PorSegmentoAcc>, linha) => {
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
  } catch (error) {
    console.error('[api/planejamento/dashboard-full] Error:', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível carregar o planejamento.' },
      { status: 503 }
    );
  }
}


