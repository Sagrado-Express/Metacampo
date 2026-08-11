import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

type AuthResult =
  | { error: NextResponse; supabase: null; tenantId: null; role: null }
  | { error: null; supabase: SupabaseClient; tenantId: string; role: string };

const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem configurar o Índice Tecnológico do tenant.' },
  { status: 403 }
);

// Client autenticado: o RLS filtra por tenant, o tenantId vem da claim assinada.
async function checkAuth(): Promise<AuthResult> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }), supabase: null, tenantId: null, role: null };
  }
  return { error: null, supabase: ctx.supabase, tenantId: ctx.tenantId, role: ctx.role };
}

export async function GET(request: Request) {
  const { error, supabase, tenantId } = await checkAuth();
  if (error) return error;

  try {
    // O client carrega o JWT do usuário: o RLS filtra por tenant no Postgres.
    // O .eq(tenant_id) abaixo é redundante e fica apenas como defesa em profundidade.
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
  const { error, supabase, tenantId, role } = await checkAuth();
  if (error) return error;
  if (role !== 'admin') return FORBIDDEN;

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
  const { error, supabase, tenantId, role } = await checkAuth();
  if (error) return error;
  if (role !== 'admin') return FORBIDDEN;

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
  const { error, supabase, tenantId, role } = await checkAuth();
  if (error) return error;
  if (role !== 'admin') return FORBIDDEN;
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
