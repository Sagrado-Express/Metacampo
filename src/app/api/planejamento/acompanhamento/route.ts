import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { fetchAllRows } from '@/lib/db';
import { computeMetaPorCtvSegmento, type ClienteCtvRow, type PlanejamentoValorRow } from '@/lib/services/PlanejamentoMetaService';

interface FaturamentoRow {
  id_ctv: string;
  segmento: string;
  mes: string;
  valor_realizado_centavos: number;
}

interface PorCtvSegmento {
  ctvUserId: string;
  segmento: string;
  metaCentavos: number;
  realizadoCentavos: number;
}

interface PorCtv {
  ctvUserId: string;
  metaCentavos: number;
  realizadoCentavos: number;
  saldoToGoCentavos: number;
  mesesComDado: string[];
}

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

/**
 * Completa o Passo 5 do GTMGC (docs/PRD.md §16.1): a metade "calibrar o %"
 * já existe (planejamento_cliente_segmento, editado no Heatmap); esta rota
 * é a metade que faltava — meta (planejado) vs realizado (importado via
 * /api/faturamento/import) ao longo da safra, por CTV e por CTV×segmento,
 * com Saldo TO-GO = meta - realizado.
 *
 * Meta é recalculada na hora a partir de planejamento_cliente_segmento
 * (não lida do valor_meta_centavos congelado no último CSV importado) —
 * recalibrar o Heatmap reflete aqui sem precisar de novo upload.
 *
 * Visibilidade: não-admin só vê a própria linha (mesmo nível de
 * sensibilidade que /api/tenant/members, hoje 100% admin-only, já trata
 * pra dado de colega). Admin vê todo mundo.
 */
export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const [clientes, planejamentoRows, faturamentoRows] = await Promise.all([
      fetchAllRows<ClienteCtvRow>((from, to) => ctx.supabase.from('clientes').select('id, ctv_id').range(from, to)),
      fetchAllRows<PlanejamentoValorRow>((from, to) =>
        ctx.supabase
          .from('planejamento_cliente_segmento')
          .select('cliente_id, segmento, valor_planejado_centavos')
          .range(from, to)
      ),
      fetchAllRows<FaturamentoRow>((from, to) =>
        ctx.supabase.from('faturamento_snapshots').select('id_ctv, segmento, mes, valor_realizado_centavos').range(from, to)
      ),
    ]);

    const metaPorCtvSegmento = computeMetaPorCtvSegmento(clientes, planejamentoRows);

    const realizadoPorCtvSegmento = new Map<string, number>();
    const mesesPorCtv = new Map<string, Set<string>>();
    for (const f of faturamentoRows) {
      const key = `${f.id_ctv}|${f.segmento}`;
      realizadoPorCtvSegmento.set(key, (realizadoPorCtvSegmento.get(key) || 0) + Number(f.valor_realizado_centavos || 0));
      if (!mesesPorCtv.has(f.id_ctv)) mesesPorCtv.set(f.id_ctv, new Set());
      mesesPorCtv.get(f.id_ctv)!.add(f.mes);
    }

    // União das chaves ctv|segmento que aparecem em meta OU em realizado —
    // um segmento vendido sem planejamento é um dado real (Marco Polo,
    // 15/09/2026), não deve sumir da tela só por não ter meta.
    const todasChaves = new Set([...metaPorCtvSegmento.keys(), ...realizadoPorCtvSegmento.keys()]);
    const porCtvSegmento: PorCtvSegmento[] = Array.from(todasChaves).map((key) => {
      const [ctvUserId, segmento] = key.split('|');
      return {
        ctvUserId,
        segmento,
        metaCentavos: metaPorCtvSegmento.get(key) || 0,
        realizadoCentavos: realizadoPorCtvSegmento.get(key) || 0,
      };
    });

    const porCtvMap = new Map<string, PorCtv>();
    for (const linha of porCtvSegmento) {
      const atual = porCtvMap.get(linha.ctvUserId) ?? {
        ctvUserId: linha.ctvUserId,
        metaCentavos: 0,
        realizadoCentavos: 0,
        saldoToGoCentavos: 0,
        mesesComDado: Array.from(mesesPorCtv.get(linha.ctvUserId) || []).sort(),
      };
      atual.metaCentavos += linha.metaCentavos;
      atual.realizadoCentavos += linha.realizadoCentavos;
      atual.saldoToGoCentavos = Math.max(0, atual.metaCentavos - atual.realizadoCentavos);
      porCtvMap.set(linha.ctvUserId, atual);
    }
    let porCtv = Array.from(porCtvMap.values());

    let visiblePorCtvSegmento = porCtvSegmento;
    if (ctx.role !== 'admin') {
      porCtv = porCtv.filter((c) => c.ctvUserId === ctx.userId);
      visiblePorCtvSegmento = porCtvSegmento.filter((c) => c.ctvUserId === ctx.userId);
    }

    return NextResponse.json({ role: ctx.role, porCtv, porCtvSegmento: visiblePorCtvSegmento });
  } catch (error) {
    console.error('[api/planejamento/acompanhamento][GET]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível carregar o acompanhamento.' },
      { status: 503 }
    );
  }
}
