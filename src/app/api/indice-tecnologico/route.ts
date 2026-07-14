import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// Helper to check session and return session or response error
async function checkAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function GET(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id;

  try {
    // If the database client runs in the context of the user session, RLS will filter it automatically.
    // However, since we might be offline or using standard API credentials, we explicitly filter by tenant_id.
    const { data, error: dbError } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    if (dbError) throw dbError;

    // Map DB fields to user-friendly "Índice Tecnológico" terminology
    const mapped = (data || []).map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      safra: row.safra,
      cultivo: row.crop_name,
      segmento: row.segment_name,
      valorPorHectareCentavos: row.value_per_hectare,
      createdAt: row.created_at
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error('[IT API] Supabase failed (GET):', err);
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
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id;

  try {
    const body = await request.json();
    const { safra, cultivo, segmento, valorPorHectareCentavos } = body;

    if (!safra || !cultivo || !segmento || valorPorHectareCentavos === undefined) {
      return NextResponse.json({ error: 'safra, cultivo, segmento e valorPorHectareCentavos são obrigatórios' }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from('it_se_configurations')
      .insert({
        tenant_id: tenantId,
        safra,
        crop_name: cultivo,
        segment_name: segmento,
        value_per_hectare: valorPorHectareCentavos
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      id: data.id,
      tenantId: data.tenant_id,
      safra: data.safra,
      cultivo: data.crop_name,
      segmento: data.segment_name,
      valorPorHectareCentavos: data.value_per_hectare,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[IT API] Supabase failed (POST):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível salvar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id;

  try {
    const body = await request.json();
    const { id, safra, cultivo, segmento, valorPorHectareCentavos } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (safra !== undefined) updatePayload.safra = safra;
    if (cultivo !== undefined) updatePayload.crop_name = cultivo;
    if (segmento !== undefined) updatePayload.segment_name = segmento;
    if (valorPorHectareCentavos !== undefined) updatePayload.value_per_hectare = valorPorHectareCentavos;

    const { data, error: dbError } = await supabase
      .from('it_se_configurations')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      id: data.id,
      tenantId: data.tenant_id,
      safra: data.safra,
      cultivo: data.crop_name,
      segmento: data.segment_name,
      valorPorHectareCentavos: data.value_per_hectare,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[IT API] Supabase failed (PATCH):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível atualizar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  try {
    const { error: dbError } = await supabase
      .from('it_se_configurations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[IT API] Supabase failed (DELETE):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível excluir os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}
