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
    const { tenantId, customName, displayOrder } = body;

    if (!tenantId || !customName) {
      return NextResponse.json({ error: 'tenantId and customName are required' }, { status: 400 });
    }

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
