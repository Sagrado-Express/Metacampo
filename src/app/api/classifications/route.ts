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

export async function GET(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  const { searchParams } = new URL(request.url);

  try {
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const classifications = activeOnly
      ? await SegmentDictionaryService.getActiveClassificacoes(ctx.supabase, ctx.tenantId)
      : await SegmentDictionaryService.getAllClassificacoes(ctx.supabase, ctx.tenantId);

    return NextResponse.json(classifications);
  } catch (error: any) {
    console.error('[Classifications API] Supabase error (GET):', error);
    return unavailable('carregar');
  }
}

export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const { customName, parentKey, aliases, color, displayOrder } = body;

    if (!customName) {
      return NextResponse.json({ error: 'customName is required' }, { status: 400 });
    }

    const newCls = await SegmentDictionaryService.createClassificacao(ctx.supabase, ctx.tenantId, {
      customName,
      parentKey,
      aliases,
      color,
      displayOrder,
    });

    return NextResponse.json(newCls);
  } catch (error: any) {
    console.error('[Classifications API] Supabase error (POST):', error);
    if (typeof error?.message === 'string' && (error.message.includes('já existe') || error.message.includes('não encontrada'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return unavailable('salvar');
  }
}

export async function PATCH(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const { id, customName, aliases, isActive, displayOrder, color, newAlias } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const result =
      newAlias !== undefined
        ? await SegmentDictionaryService.addAlias(ctx.supabase, ctx.tenantId, id, newAlias)
        : await SegmentDictionaryService.updateClassificacao(ctx.supabase, ctx.tenantId, id, {
            customName,
            aliases,
            isActive,
            displayOrder,
            color,
          });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Classifications API] Supabase error (PATCH):', error);
    return unavailable('atualizar');
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
    await SegmentDictionaryService.deactivateClassificacao(ctx.supabase, ctx.tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Classifications API] Supabase error (DELETE):', error);
    return unavailable('excluir');
  }
}
