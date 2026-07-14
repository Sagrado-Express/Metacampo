import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SegmentDictionaryService } from '@/domain/services/segmentDictionary.service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  try {
    const cultures = await SegmentDictionaryService.getActiveCulturas(supabase, tenantId);
    return NextResponse.json(cultures);
  } catch (error: any) {
    console.error('[Cultures API] Supabase error (GET):', error);
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
  try {
    const body = await request.json();
    const { tenantId, customName, displayOrder, id, isActive } = body;

    if (!tenantId || !customName) {
      return NextResponse.json({ error: 'tenantId and customName are required' }, { status: 400 });
    }

    // If id is present, this is a toggle/update, not a create
    if (id && isActive !== undefined) {
      if (isActive === false) {
        await SegmentDictionaryService.deactivateCultura(supabase, tenantId, id);
      } else {
        // Reactivate: update is_active back to true
        try {
          const { error: dbError } = await supabase
            .from('tenant_config_culturas')
            .update({ is_active: true })
            .eq('id', id)
            .eq('tenant_id', tenantId);
          if (dbError) throw dbError;
        } catch (err: any) {
          console.error('[Cultures API] Supabase reactivate failed:', err);
          return NextResponse.json(
            {
              error: 'DATA_SOURCE_UNAVAILABLE',
              message: 'Não foi possível atualizar os dados no banco. Tente novamente em instantes.',
            },
            { status: 503 }
          );
        }
      }
      return NextResponse.json({ success: true });
    }

    // Create new cultura
    const newCult = await SegmentDictionaryService.createCultura(supabase, tenantId, {
      customName,
      displayOrder,
    });

    return NextResponse.json(newCult);
  } catch (error: any) {
    console.error('[Cultures API] Supabase error (POST):', error);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível salvar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const id = searchParams.get('id');

  if (!tenantId || !id) {
    return NextResponse.json({ error: 'tenantId and id are required' }, { status: 400 });
  }

  try {
    await SegmentDictionaryService.deactivateCultura(supabase, tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Cultures API] Supabase error (DELETE):', error);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível excluir os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}
