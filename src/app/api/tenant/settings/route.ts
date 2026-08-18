import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem configurar o tenant.' },
  { status: 403 }
);

/**
 * GET/PATCH do próprio tenant (linha única, id = claim do JWT via RLS).
 * Hoje só expõe label_grupo_produto — apelido opcional que o tenant dá
 * pro conceito "Grupo de Produtos" (ex.: "Segmento"), pedido do Marco
 * Polo em 13/08/2026. Qualquer usuário lê (precisa saber que rótulo
 * mostrar); só admin escreve.
 */
export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const { data, error } = await ctx.supabase
      .from('tenants')
      .select('label_grupo_produto')
      .eq('id', ctx.tenantId)
      .single();

    if (error) throw error;
    return NextResponse.json({ labelGrupoProduto: data?.label_grupo_produto ?? null });
  } catch (error: any) {
    console.error('[Tenant Settings API] Supabase error (GET):', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível carregar as configurações do tenant.' },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;

  try {
    const body = await request.json();
    const { labelGrupoProduto } = body;

    if (labelGrupoProduto !== null && typeof labelGrupoProduto !== 'string') {
      return NextResponse.json({ error: 'labelGrupoProduto deve ser string ou null' }, { status: 400 });
    }

    const trimmed = typeof labelGrupoProduto === 'string' ? labelGrupoProduto.trim() : null;

    const { data, error } = await ctx.supabase
      .from('tenants')
      .update({ label_grupo_produto: trimmed || null })
      .eq('id', ctx.tenantId)
      .select('label_grupo_produto')
      .single();

    if (error) throw error;
    return NextResponse.json({ labelGrupoProduto: data?.label_grupo_produto ?? null });
  } catch (error: any) {
    console.error('[Tenant Settings API] Supabase error (PATCH):', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível salvar as configurações do tenant.' },
      { status: 503 }
    );
  }
}
