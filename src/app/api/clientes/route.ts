import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

async function checkAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'src/data/local_customers.json');

function getLocalCustomers(): any[] {
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8'));
      // Handle both raw array format and object format
      return Array.isArray(data) ? data : (data.customers || []);
    }
  } catch (err) {
    console.warn('[Clientes API] Failed to read fallback file:', err);
  }
  return [];
}

function saveLocalCustomers(customers: any[]) {
  try {
    const dir = path.dirname(FALLBACK_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify({ customers }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Clientes API] Failed to write fallback file:', err);
  }
}

export async function GET(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";

  try {
    // 1. Fetch all customers for this tenant
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId);

    if (custError) throw custError;

    // 2. Fetch all crop areas for this tenant
    const { data: cropAreas, error: areasError } = await supabase
      .from('customer_crop_areas')
      .select('*')
      .eq('tenant_id', tenantId);

    if (areasError) throw areasError;

    // 3. Fetch all IT configurations
    const { data: indices } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    // 4. Map customers and calculate VPM
    const result = (customers || []).map(cust => {
      const areas = (cropAreas || []).filter(area => area.customer_id === cust.id);
      
      let vpmTotalCentavos = 0;
      const mappedAreas = areas.map(area => {
        const index = (indices || []).find(
          ind => ind.crop_name.toUpperCase() === area.crop_name.toUpperCase()
        );
        const valuePerHectare = index ? Number(index.value_per_hectare) : 350000;
        const areaHa = Number(area.area_ha);
        const areaVpm = Math.round(areaHa * valuePerHectare);
        vpmTotalCentavos += areaVpm;

        return {
          id: area.id,
          cropName: area.crop_name,
          areaHa: areaHa,
          valorPorHectareCentavos: valuePerHectare,
          vpmCentavos: areaVpm
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
        vpmTotalCentavos: vpmTotalCentavos || Number(cust.vpm_total_centavos || 0),
        vpm_total_centavos: vpmTotalCentavos || Number(cust.vpm_total_centavos || 0)
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.warn('[Clientes API] Supabase GET failed, falling back to local file. Error:', err.message);
    const localStore = getLocalCustomers();
    const filteredLocal = localStore.filter(c => c.tenantId === tenantId || c.tenant_id === tenantId).map(c => {
      // Map properties to ensure consistency
      const cropName = c.cultivo || (c.areas?.[0]?.cropName) || 'Soja';
      const areaHa = Number(c.area_hectares || c.areas?.[0]?.areaHa || 0);
      const mappedAreas = c.areas || [
        {
          id: `area-0-${c.id}`,
          cropName,
          areaHa,
          vpmCentavos: Number(c.vpm_total_centavos || c.vpmTotalCentavos || 0)
        }
      ];

      return {
        ...c,
        cultivo: cropName,
        area_hectares: areaHa,
        areas: mappedAreas,
        vpm_total_centavos: Number(c.vpm_total_centavos || c.vpmTotalCentavos || 0),
        vpmTotalCentavos: Number(c.vpm_total_centavos || c.vpmTotalCentavos || 0)
      };
    });
    return NextResponse.json(filteredLocal);
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

    if (!name || !city || !state || !cultivo || !area_hectares) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

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
      .from('customers')
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
    console.warn('[Clientes API] Supabase POST failed, fallback to local. Error:', err.message);
    const body = await request.json().catch(() => ({}));
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

    const mockId = `cliente-${Date.now()}`;
    const newLocalCustomer = {
      id: mockId,
      tenant_id: tenantId,
      tenantId: tenantId,
      ctv_id: ctvId,
      name,
      city,
      state,
      region: 'Região Geral',
      cultivo,
      area_hectares: Number(area_hectares),
      areas: [
        {
          id: `area-${mockId}`,
          cropName: cultivo,
          areaHa: Number(area_hectares),
          vpmCentavos
        }
      ],
      vpm_total_centavos: vpmCentavos,
      vpmTotalCentavos: vpmCentavos
    };

    const localStore = getLocalCustomers();
    localStore.push(newLocalCustomer);
    saveLocalCustomers(localStore);

    return NextResponse.json(newLocalCustomer, { status: 201 });
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
      .from('customers')
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
    console.warn('[Clientes API] Supabase PATCH failed, fallback to local. Error:', err.message);
    const body = await request.json().catch(() => ({}));
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

    const localData = getLocalCustomers();
    const idx = localData.findIndex(c => c.id === id && (c.tenantId === tenantId || c.tenant_id === tenantId));
    
    if (idx !== -1) {
      localData[idx] = {
        ...localData[idx],
        name: name || localData[idx].name,
        city: city || localData[idx].city,
        state: state || localData[idx].state,
        cultivo: cultivo || localData[idx].cultivo,
        area_hectares: area_hectares !== undefined ? Number(area_hectares) : localData[idx].area_hectares,
        areas: [
          {
            id: `area-${id}`,
            cropName: cultivo || localData[idx].cultivo,
            areaHa: area_hectares !== undefined ? Number(area_hectares) : localData[idx].area_hectares,
            vpmCentavos
          }
        ],
        vpm_total_centavos: vpmCentavos,
        vpmTotalCentavos: vpmCentavos
      };

      saveLocalCustomers(localData);
      return NextResponse.json(localData[idx]);
    }

    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
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
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.warn('[Clientes API] Supabase DELETE failed, fallback to local. Error:', err.message);
    const localData = getLocalCustomers();
    const filtered = localData.filter(c => !(c.id === id && (c.tenantId === tenantId || c.tenant_id === tenantId)));
    saveLocalCustomers(filtered);
    return NextResponse.json({ success: true });
  }
}
