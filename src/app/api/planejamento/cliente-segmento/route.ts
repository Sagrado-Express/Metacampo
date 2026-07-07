import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'src/data/local_planejamento.json');

function getLocalPlanejamento(): any[] {
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Planejamento API] Failed to read fallback file:', err);
  }
  return [];
}

function saveLocalPlanejamento(data: any[]) {
  try {
    const dir = path.dirname(FALLBACK_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Planejamento API] Failed to write fallback file:', err);
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";

  try {
    const { data, error } = await supabase
      .from('planejamento_cliente_segmento')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    
    // Map db structure back to model structure
    const mapped = data.map(item => ({
      id: item.id,
      tenantId: item.tenant_id,
      ctvId: item.ctv_id,
      clienteId: item.cliente_id,
      cultivo: item.cultivo,
      segmento: item.segmento,
      valorPlanejadoCentavos: Number(item.valor_planejado_centavos),
      sharePercentual: Number(item.share_percentual),
      status: item.status
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.warn('[Planejamento API] Supabase fetch failed, falling back to local file. Error:', err.message);
    const localData = getLocalPlanejamento().filter(p => p.tenant_id === tenantId || p.tenantId === tenantId);
    return NextResponse.json(localData);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";
  const ctvId = session?.user?.id || 'mock-ctv-uuid-001';

  try {
    const body = await request.json();
    const { cliente_id, cultivo, segmento, valor_planejado_centavos, share_percentual } = body;

    if (!cliente_id || !cultivo || !segmento) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const payload = {
      tenant_id: tenantId,
      ctv_id: ctvId,
      cliente_id: cliente_id.replace('customer-', ''), // Ensure standard UUID format
      cultivo,
      segmento,
      valor_planejado_centavos: Math.round(Number(valor_planejado_centavos || 0)),
      share_percentual: Number(share_percentual || 0),
      status: 'draft',
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('planejamento_cliente_segmento')
        .upsert([payload], { onConflict: 'tenant_id,cliente_id,cultivo,segmento' })
        .select();

      if (error) throw error;
      return NextResponse.json(data);
    } catch (dbErr: any) {
      console.warn('[Planejamento API] Supabase upsert failed, saving to local fallback file. Error:', dbErr.message);
      const localData = getLocalPlanejamento();
      const existingIdx = localData.findIndex(
        p => (p.tenant_id === tenantId || p.tenantId === tenantId) &&
             (p.cliente_id === cliente_id || p.clienteId === cliente_id) &&
             p.cultivo === cultivo &&
             p.segmento === segmento
      );

      const localItem = {
        id: existingIdx !== -1 ? localData[existingIdx].id : `plan-${cliente_id}-${cultivo}-${segmento}`,
        tenantId: tenantId,
        tenant_id: tenantId,
        ctvId: ctvId,
        ctv_id: ctvId,
        clienteId: cliente_id,
        cliente_id: cliente_id,
        cultivo,
        segmento,
        valorPlanejadoCentavos: payload.valor_planejado_centavos,
        valor_planejado_centavos: payload.valor_planejado_centavos,
        sharePercentual: payload.share_percentual,
        share_percentual: payload.share_percentual,
        status: 'draft',
        updated_at: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        localData[existingIdx] = { ...localData[existingIdx], ...localItem };
      } else {
        localData.push(localItem);
      }

      saveLocalPlanejamento(localData);
      return NextResponse.json(localItem);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
