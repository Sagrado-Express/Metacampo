import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';

export async function GET(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { supabase, tenantId } = ctx;

  try {
    const { data, error } = await supabase
      .from('planejamento_cliente_segmento')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    
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
  } catch (err: any) {
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
  } catch (dbErr: any) {
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

