import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";
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
    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (err: any) {
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
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";

  try {
    const body = await request.json();
    const payload = Array.isArray(body) ? body : [body];

    const toInsert = payload.map(item => ({
      tenant_id: tenantId,
      customer_id: item.customer_id,
      customer_name: item.customer_name,
      segment_name: item.segment_name,
      faturado_centavos: Math.round(Number(item.faturado_centavos || 0)),
      safra_ref: item.safra_ref,
      competencia_mes: item.competencia_mes,
      competencia_ano: item.competencia_ano,
      status: 'active'
    }));

    const { data, error } = await supabase
      .from('faturamento_snapshots')
      .insert(toInsert)
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (dbErr: any) {
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
