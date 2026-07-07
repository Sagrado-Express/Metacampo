import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Helper to check session and return session or response error
async function checkAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

const DICT_PATH = path.join(process.cwd(), 'src/data/local_dictionary.json');

// Default IT-SE values per crop (R$/ha in centavos)
const DEFAULT_IT_VALUES: Record<string, number> = {
  'Soja': 400000,
  'Milho': 300000,
  'Algodão': 500000,
  'Café': 1000000,
  'Cana': 250000,
  'HF': 800000,
};

function getLocalITFallback(tenantId: string): any[] {
  try {
    if (fs.existsSync(DICT_PATH)) {
      const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
      const cultures = (dict.cultures || []).filter((c: any) => c.tenantId === tenantId && c.isActive);
      const segments = (dict.classifications || []).filter((c: any) => c.tenantId === tenantId && c.isActive);

      const result: any[] = [];
      cultures.forEach((culture: any) => {
        segments.forEach((segment: any) => {
          result.push({
            id: `it-${culture.internalKey}-${segment.internalKey}`,
            tenantId: tenantId,
            safra: '2025/2026',
            cultivo: culture.customName,
            segmento: segment.customName,
            valorPorHectareCentavos: DEFAULT_IT_VALUES[culture.customName] || 350000,
            createdAt: new Date().toISOString(),
          });
        });
      });
      return result;
    }
  } catch (err) {
    console.warn('[IT API] Failed to read local dictionary:', err);
  }
  return [];
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
    // Fallback to local dictionary-derived IT values
    console.warn('[IT API] Supabase failed, using local fallback:', err.message);
    const fallback = getLocalITFallback(tenantId);
    return NextResponse.json(fallback);
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
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
