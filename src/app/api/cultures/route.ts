import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { SegmentDictionaryService } from '@/domain/services/segmentDictionary.service';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

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
    const cultures = await SegmentDictionaryService.getActiveCulturas(ctx.supabase, ctx.tenantId);
    return NextResponse.json(cultures);
  } catch (error: any) {
    console.error('[Cultures API] Supabase error (GET):', error);
    return unavailable('carregar');
  }
}

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const { customName, displayOrder, id, isActive } = body;

    // Toggle de ativo/inativo em um registro existente
    if (id && isActive !== undefined) {
      if (isActive === false) {
        await SegmentDictionaryService.deactivateCultura(ctx.supabase, ctx.tenantId, id);
      } else {
        const { error: dbError } = await ctx.supabase
          .from('tenant_config_culturas')
          .update({ is_active: true })
          .eq('id', id);
        if (dbError) throw dbError;
      }
      return NextResponse.json({ success: true });
    }

    if (!customName) {
      return NextResponse.json({ error: 'customName is required' }, { status: 400 });
    }

    const newCult = await SegmentDictionaryService.createCultura(ctx.supabase, ctx.tenantId, {
      customName,
      displayOrder,
    });

    return NextResponse.json(newCult);
  } catch (error: any) {
    console.error('[Cultures API] Supabase error (POST):', error);
    // Erro de negócio (ex.: cultura duplicada) volta como 400, não 503
    if (typeof error?.message === 'string' && error.message.includes('já existe')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return unavailable('salvar');
  }
}

export async function DELETE(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await SegmentDictionaryService.deactivateCultura(ctx.supabase, ctx.tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Cultures API] Supabase error (DELETE):', error);
    return unavailable('excluir');
  }
}
