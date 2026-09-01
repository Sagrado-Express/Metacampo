import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimiter';
import { fetchAllRows } from '@/lib/db';

interface PlanejamentoRow {
  id: string;
  tenant_id: string;
  ctv_id: string;
  cliente_id: string;
  cultivo: string;
  segmento: string;
  valor_planejado_centavos: number;
  share_percentual: number;
  status: string;
}

export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { supabase, tenantId } = ctx;

  try {
    // fetchAllRows em vez de select('*') puro: é a tabela que mais cresce
    // do sistema (combinação cliente × cultivo × segmento), a primeira a
    // bater o truncamento silencioso de ~1000 linhas do PostgREST — achado
    // em auditoria de performance 31/08/2026.
    const data = await fetchAllRows<PlanejamentoRow>((from, to) =>
      supabase.from('planejamento_cliente_segmento').select('*').eq('tenant_id', tenantId).range(from, to)
    );

    // Map db structure back to model structure
    const mapped = data.map(item => ({
      id: item.id,
      tenantId: item.tenant_id,
      ctvId: item.ctv_id,
      clienteId: item.cliente_id,
      cultivo: item.cultivo,
      segmento: item.segmento,
      valorPlanejadoCentavos: Number(item.valor_planejado_centavos),
      sharePercentual: Number(item.share_percentual),
      status: item.status
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error('[api/planejamento/cliente-segmento] Supabase error (GET):', err);
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
  const { supabase, tenantId, userId: ctvId } = ctx;
  // Uma requisição por célula editada no Heatmap — sessão real de edição
  // pode disparar bem mais chamadas por minuto que uma rota de config comum.
  const limited = rateLimitResponse(ctvId, 120);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { cliente_id, cultivo, segmento, valor_planejado_centavos, share_percentual } = body;

    if (!cliente_id || !cultivo || !segmento) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const payload = {
      tenant_id: tenantId,
      ctv_id: ctvId,
      cliente_id: cliente_id.replace('customer-', ''), // Ensure standard UUID format
      cultivo,
      segmento,
      valor_planejado_centavos: Math.round(Number(valor_planejado_centavos || 0)),
      share_percentual: Number(share_percentual || 0),
      status: 'draft',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('planejamento_cliente_segmento')
      .upsert([payload], { onConflict: 'tenant_id,cliente_id,cultivo,segmento' })
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (dbErr) {
    console.error('[api/planejamento/cliente-segmento] Supabase error (POST):', dbErr);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível salvar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

