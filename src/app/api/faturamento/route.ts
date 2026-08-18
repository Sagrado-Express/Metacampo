import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimiter';

interface FaturamentoRow {
  id: string;
  tenant_id: string;
  mes: string;
  id_ctv: string;
  segmento: string;
  valor_realizado_centavos: number;
  valor_meta_centavos: number;
  created_at: string;
}

function mapFaturamentoRow(row: FaturamentoRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    mes: row.mes,
    ctvId: row.id_ctv,
    segmento: row.segmento,
    valorRealizadoCentavos: Number(row.valor_realizado_centavos),
    valorMetaCentavos: Number(row.valor_meta_centavos),
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { supabase, tenantId } = ctx;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 5000);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const { data, error, count } = await supabase
      .from('faturamento_snapshots')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const mapped = (data || []).map(mapFaturamentoRow);

    return NextResponse.json({
      data: mapped,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (err) {
    console.error('[Billing API] Supabase error (GET):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível carregar os dados do banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const limited = rateLimitResponse(ctx.userId, 30);
  if (limited) return limited;
  const { supabase, tenantId } = ctx;

  try {
    const body = await request.json();
    const payload = Array.isArray(body) ? body : [body];

    // Achado em auditoria (11/08/2026): esta rota gravava colunas que não
    // existem na tabela real (customer_id, faturado_centavos, safra_ref,
    // competencia_mes/ano, status) — todo POST falhava com erro cru do
    // Postgres ("column does not exist"). A tabela real tem
    // mes/id_ctv/segmento/valor_realizado_centavos/valor_meta_centavos
    // (docs/schema_completo_supabase.sql), confirmado direto contra o
    // banco de produção. Sem consumidor em src/ até aqui — nada dependia
    // do formato antigo.
    for (const item of payload) {
      if (!item.mes || !item.id_ctv || !item.segmento) {
        return NextResponse.json(
          { error: 'mes, id_ctv e segmento são obrigatórios em cada item' },
          { status: 400 }
        );
      }
    }

    const toInsert = payload.map((item) => ({
      tenant_id: tenantId,
      mes: item.mes,
      id_ctv: item.id_ctv,
      segmento: item.segmento,
      valor_realizado_centavos: Math.round(Number(item.valorRealizadoCentavos || item.valor_realizado_centavos || 0)),
      valor_meta_centavos: Math.round(Number(item.valorMetaCentavos || item.valor_meta_centavos || 0)),
    }));

    const { data, error } = await supabase.from('faturamento_snapshots').insert(toInsert).select();

    if (error) throw error;

    const mapped = (data || []).map(mapFaturamentoRow);

    return NextResponse.json(mapped);
  } catch (dbErr) {
    console.error('[Billing API] Supabase error (POST):', dbErr);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível salvar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}
