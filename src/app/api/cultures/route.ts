import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SegmentDictionaryService } from '@/domain/services/segmentDictionary.service';
import fs from 'fs';
import path from 'path';

const DICT_PATH = path.join(process.cwd(), 'src/data/local_dictionary.json');

function getLocalDictionary(): any {
  try {
    if (fs.existsSync(DICT_PATH)) {
      return JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Cultures API] Failed to read local dictionary:', err);
  }
  return { classifications: [], cultures: [] };
}

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
    // Fallback to local dictionary
    console.warn('[Cultures API] Supabase failed, using local fallback:', error.message);
    const dict = getLocalDictionary();
    const filtered = (dict.cultures || []).filter(
      (c: any) => c.tenantId === tenantId && c.isActive
    );
    return NextResponse.json(filtered);
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
          // Fallback: update local dictionary
          console.warn('[Cultures API] Supabase reactivate failed, using fallback:', err.message);
          const dict = getLocalDictionary();
          const culture = (dict.cultures || []).find((c: any) => c.id === id);
          if (culture) {
            culture.isActive = true;
            saveDictionary(dict);
          }
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function saveDictionary(dict: any) {
  try {
    fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Cultures API] Failed to save local dictionary:', err);
  }
}
