import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { buildItLookup, calcVpm } from '@/lib/services/VpmService';

async function checkAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function GET(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id;

  try {
    // 1. Fetch customers
    const { data: customers, error: custError } = await supabase
      .from('clientes')
      .select('*')
      .eq('tenant_id', tenantId);

    if (custError) throw custError;

    // 2. Fetch all crop areas for this tenant
    const { data: cropAreas, error: areasError } = await supabase
      .from('customer_crop_areas')
      .select('*')
      .eq('tenant_id', tenantId);

    if (areasError) throw areasError;

    // 3. Fetch all IT configurations and build lookup
    const { data: indices } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    // 4. Fetch active segments for VPM calculation
    const { data: segments } = await supabase
      .from('tenant_config_classificacoes')
      .select('custom_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('parent_key', null);

    const activeSegmentNames = (segments || []).map((s: any) => s.custom_name);
    // Fallback segment names if DB returns empty
    const segNames = activeSegmentNames.length > 0 
      ? activeSegmentNames 
      : ['Sementes', 'Fertilizantes', 'Defensivos'];

    const itLookup = buildItLookup(
      (indices || []).map((ind: any) => ({
        cultivo: ind.crop_name,
        segmento: ind.segment_name,
        valorPorHectareCentavos: Number(ind.value_per_hectare),
      }))
    );

    // 5. Map customers and calculate VPM on-read
    const result = (customers || []).map(cust => {
      const areas = (cropAreas || []).filter(area => area.customer_id === cust.id);
      
      let vpmTotalCentavos = 0;
      const mappedAreas = areas.map(area => {
        const areaHa = Number(area.area_ha);
        let areaVpm = 0;

        // Calculate VPM across all segments for this crop area
        for (const seg of segNames) {
          areaVpm += calcVpm({
            hectares: areaHa,
            cropName: area.crop_name,
            segmentName: seg,
            itLookup,
          });
        }
        vpmTotalCentavos += areaVpm;

        // Check if ANY IT is defined for this crop
        const hasIt = segNames.some(seg => {
          const key = `${area.crop_name.toUpperCase()}::${seg.toUpperCase()}`;
          return itLookup[key] != null && itLookup[key] > 0;
        });

        return {
          id: area.id,
          cropName: area.crop_name,
          areaHa: areaHa,
          vpmCentavos: areaVpm,
          indiceTecnologicoDefinido: hasIt
        };
      });

      // Root level cultivo mapping for Sprint 0.5 view compatibility
      const mainArea = mappedAreas[0];

      return {
        id: cust.id,
        tenantId: cust.tenant_id,
        ctvId: cust.ctv_id,
        name: cust.name,
        document: cust.document || '',
        city: cust.city,
        state: cust.state,
        region: cust.region,
        cultivo: mainArea ? mainArea.cropName : '-',
        area_hectares: mainArea ? mainArea.areaHa : 0,
        areas: mappedAreas,
        vpmTotalCentavos,
        vpm_total_centavos: vpmTotalCentavos
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[api/clientes] Supabase error (GET):', err);
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
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";
  const ctvId = session?.user?.id || 'mock-ctv-uuid-001';

  try {
    const body = await request.json();
    const { name, city, state, cultivo, area_hectares } = body;

    // Hardcode IT for demo mock (should ideally be retrieved)
    const IT_BASE: Record<string, number> = {
      'Café': 890000,
      'Soja': 400000,
      'Milho': 300000,
      'HF': 3000000,
      'Algodão': 1000000
    };
    const valuePerHectare = IT_BASE[cultivo] || 400000;
    const vpmCentavos = Math.round(Number(area_hectares) * valuePerHectare);

    // 1. Insert customer
    const { data: customer, error: custError } = await supabase
      .from('clientes') // Used to be customers in original code, fixing it to clientes based on GET
      .insert({
        tenant_id: tenantId,
        ctv_id: ctvId,
        name,
        city,
        state,
        region: 'Região Geral',
        document: `doc-${Date.now()}`
      })
      .select()
      .single();

    if (custError) throw custError;

    // 2. Insert crop area
    const { data: areaData, error: areaError } = await supabase
      .from('customer_crop_areas')
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        crop_name: cultivo,
        area_ha: Number(area_hectares)
      })
      .select()
      .single();

    if (areaError) throw areaError;

    const returnedClient = {
      id: customer.id,
      tenantId: customer.tenant_id,
      ctvId: customer.ctv_id,
      name: customer.name,
      city: customer.city,
      state: customer.state,
      cultivo,
      area_hectares: Number(area_hectares),
      areas: [{ id: areaData.id, cropName: cultivo, areaHa: Number(area_hectares), vpmCentavos }],
      vpm_total_centavos: vpmCentavos,
      vpmTotalCentavos: vpmCentavos
    };

    return NextResponse.json(returnedClient, { status: 201 });
  } catch (err: any) {
    console.error('[api/clientes] Supabase error (POST):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível salvar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, city, state, cultivo, area_hectares } = body;

    const IT_BASE: Record<string, number> = {
      'Café': 890000,
      'Soja': 400000,
      'Milho': 300000,
      'HF': 3000000,
      'Algodão': 1000000
    };
    const valuePerHectare = IT_BASE[cultivo] || 400000;
    const vpmCentavos = Math.round(Number(area_hectares || 0) * valuePerHectare);

    // 1. Update customer in DB
    const { data: customer, error: custError } = await supabase
      .from('clientes')
      .update({
        name,
        city,
        state,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (custError) throw custError;

    // 2. Update area in DB
    await supabase
      .from('customer_crop_areas')
      .delete()
      .eq('customer_id', id)
      .eq('tenant_id', tenantId);

    const { data: areaData, error: areaError } = await supabase
      .from('customer_crop_areas')
      .insert({
        tenant_id: tenantId,
        customer_id: id,
        crop_name: cultivo,
        area_ha: Number(area_hectares)
      })
      .select()
      .single();

    if (areaError) throw areaError;

    return NextResponse.json({
      id: customer.id,
      tenantId: customer.tenant_id,
      name: customer.name,
      city: customer.city,
      state: customer.state,
      cultivo,
      area_hectares: Number(area_hectares),
      areas: [{ id: areaData.id, cropName: cultivo, areaHa: Number(area_hectares), vpmCentavos }],
      vpm_total_centavos: vpmCentavos,
      vpmTotalCentavos: vpmCentavos
    });
  } catch (err: any) {
    console.error('[api/clientes] Supabase error (PATCH):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível atualizar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  try {
    const { error: dbError } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/clientes] Supabase error (DELETE):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível excluir os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}
