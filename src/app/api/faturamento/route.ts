import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'src/data/faturamento_snapshots.json');

function getFallbackFaturamento(): any[] {
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Billing API] Failed to read fallback file:', err);
  }
  return [];
}

function saveFallbackFaturamento(data: any[]) {
  try {
    const dir = path.dirname(FALLBACK_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Billing API] Failed to write fallback file:', err);
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";

  try {
    const { data, error } = await supabase
      .from('faturamento_snapshots')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.warn('[Billing API] Supabase fetch failed, falling back to local file. Error:', err.message);
    const localData = getFallbackFaturamento().filter(d => d.tenant_id === tenantId);
    return NextResponse.json(localData);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";

  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    const records = items.map(item => ({
      tenant_id: tenantId,
      mes: item.mes || item.month || '05',
      id_ctv: item.id_ctv || item.ctvId || 'CTV01',
      segmento: item.segmento || item.segmentId || 'OUTROS',
      valor_realizado_centavos: Math.round(Number(item.valor_realizado_centavos || item.realizedValue || 0) * 100),
      valor_meta_centavos: Math.round(Number(item.valor_meta_centavos || item.targetValue || 0) * 100),
    }));

    try {
      const { data, error } = await supabase
        .from('faturamento_snapshots')
        .insert(records)
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } catch (dbErr: any) {
      console.warn('[Billing API] Supabase insert failed, saving to local fallback file. Error:', dbErr.message);
      const localData = getFallbackFaturamento();
      const newRecords = records.map(r => ({
        id: crypto.randomUUID(),
        ...r,
        created_at: new Date().toISOString()
      }));
      localData.push(...newRecords);
      saveFallbackFaturamento(localData);
      return NextResponse.json({ success: true, local: true, data: newRecords });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
