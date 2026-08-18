import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem criar grupos econômicos.' },
  { status: 403 }
);

function unavailable(acao: string) {
  return NextResponse.json(
    {
      error: 'DATA_SOURCE_UNAVAILABLE',
      message: `Não foi possível ${acao} os dados no banco. Tente novamente em instantes.`,
    },
    { status: 503 }
  );
}

export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const { data, error } = await ctx.supabase
      .from('grupos_economicos')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[grupos-economicos API] Supabase error (GET):', error);
    return unavailable('carregar');
  }
}

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  // Auditoria 11/08/2026: criar grupo econômico livre para qualquer CTV
  // gerava duplicidade por erro de digitação ("Família Lima" x "familia
  // lima 2") — restrito a admin, igual a cultures/classifications.
  if (ctx.role !== 'admin') return FORBIDDEN;

  try {
    const body = await request.json();
    const nome = String(body.nome || '').trim();

    if (!nome) {
      return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });
    }

    // Get-or-create case-insensitive: evita "Família Silva" e "familia
    // silva" virarem dois grupos por diferença de digitação.
    const { data: existente } = await ctx.supabase
      .from('grupos_economicos')
      .select('id, nome')
      .ilike('nome', nome)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(existente);
    }

    const { data, error } = await ctx.supabase
      .from('grupos_economicos')
      .insert({ tenant_id: ctx.tenantId, nome })
      .select('id, nome')
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[grupos-economicos API] Supabase error (POST):', error);
    return unavailable('salvar');
  }
}

export async function PATCH(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const { id, nome } = body;
    const nomeTrim = String(nome || '').trim();

    if (!id || !nomeTrim) {
      return NextResponse.json({ error: 'id e nome são obrigatórios' }, { status: 400 });
    }

    // .single() sem match (grupo de outro tenant, bloqueado pelo RLS, ou id
    // inexistente) lança erro do PostgREST — tratado abaixo como 404, não
    // como falha de banco.
    const { data, error } = await ctx.supabase
      .from('grupos_economicos')
      .update({ nome: nomeTrim, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, nome')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[grupos-economicos API] Supabase error (PATCH):', error);
    return unavailable('renomear');
  }
}

export async function DELETE(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  try {
    // As fazendas do grupo não são apagadas — grupo_economico_id vira NULL
    // via ON DELETE SET NULL na FK. Apagar configuração nunca apaga dado
    // de cliente como efeito colateral.
    const { error } = await ctx.supabase.from('grupos_economicos').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[grupos-economicos API] Supabase error (DELETE):', error);
    return unavailable('excluir');
  }
}
