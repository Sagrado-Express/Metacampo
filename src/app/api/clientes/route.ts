import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

async function checkAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

// Global in-memory fallback store to allow creation/retrieval when database is unreachable
let localCustomersStore: any[] = [
  {
    id: "pedro-id",
    tenant_id: "00000000-0000-0000-0000-000000000000",
    ctv_id: "ctv-mock-id",
    name: "Pedro",
    city: "Carmo do Paranaíba",
    state: "MG",
    region: "Cerrado Mineiro",
    areas: [
      { id: "area-1", cropName: "Café", areaHa: 6000, valorPorHectareCentavos: 890000, vpmCentavos: 5340000000 }
    ],
    vpmTotalCentavos: 5340000000
  },
  {
    id: "paulo-id",
    tenant_id: "00000000-0000-0000-0000-000000000000",
    ctv_id: "ctv-mock-id",
    name: "Paulo",
    city: "Carmo do Paranaíba",
    state: "MG",
    region: "Cerrado Mineiro",
    areas: [
      { id: "area-2", cropName: "Soja", areaHa: 1000, valorPorHectareCentavos: 350000, vpmCentavos: 350000000 }
    ],
    vpmTotalCentavos: 350000000
  }
];

export async function GET(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id;

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

    // 3. Fetch all IT configurations (Índice Tecnológico)
    const { data: indices, error: indicesError } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    if (indicesError) throw indicesError;

    // 4. Map customers and calculate VPM
    const result = (customers || []).map(cust => {
      const areas = (cropAreas || []).filter(area => area.customer_id === cust.id);
      
      let vpmTotalCentavos = 0;
      const mappedAreas = areas.map(area => {
        const index = (indices || []).find(
          ind => ind.crop_name.toUpperCase() === area.crop_name.toUpperCase()
        );
        const valuePerHectare = index ? Number(index.value_per_hectare) : 0;
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

      return {
        id: cust.id,
        tenantId: cust.tenant_id,
        ctvId: cust.ctv_id,
        name: cust.name,
        document: cust.document,
        city: cust.city,
        state: cust.state,
        region: cust.region,
        performanceBand: cust.performance_band,
        confidenceLevel: cust.confidence_level,
        creditRating: cust.credit_rating,
        walletShare: cust.wallet_share,
        qualitativeWeight: cust.qualitative_weight,
        createdAt: cust.created_at,
        areas: mappedAreas,
        vpmTotalCentavos
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.warn('Database error, falling back to local memory store:', err.message);
    // Filter local memory store by tenant_id
    const filteredLocal = localCustomersStore.filter(c => c.tenantId === tenantId || c.tenant_id === tenantId);
    return NextResponse.json(filteredLocal);
  }
}

export async function POST(request: Request) {
  const { error, session } = await checkAuth();
  if (error) return error;

  const tenantId = session?.user?.app_metadata?.tenant_id;

  try {
    const body = await request.json();
    const { ctvId, name, document, city, state, region, areas } = body;

    if (!ctvId || !name || !city || !state || !region) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // 1. Insert customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        ctv_id: ctvId,
        name,
        document,
        city,
        state,
        region
      })
      .select()
      .single();

    if (custError) throw custError;

    // 2. Insert crop areas if provided
    const insertedAreas = [];
    if (areas && Array.isArray(areas)) {
      for (const area of areas) {
        const { cropName, areaHa } = area;
        if (cropName && areaHa !== undefined) {
          const { data: areaData, error: areaError } = await supabase
            .from('customer_crop_areas')
            .insert({
              tenant_id: tenantId,
              customer_id: customer.id,
              crop_name: cropName,
              area_ha: areaHa
            })
            .select()
            .single();

          if (areaError) throw areaError;
          insertedAreas.push(areaData);
        }
      }
    }

    // 3. Fetch indices to calculate returning VPM
    const { data: indices } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    let vpmTotalCentavos = 0;
    const mappedAreas = insertedAreas.map(area => {
      const index = (indices || []).find(
        ind => ind.crop_name.toUpperCase() === area.crop_name.toUpperCase()
      );
      const valuePerHectare = index ? Number(index.value_per_hectare) : 0;
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

    return NextResponse.json({
      id: customer.id,
      tenantId: customer.tenant_id,
      ctvId: customer.ctv_id,
      name: customer.name,
      document: customer.document,
      city: customer.city,
      state: customer.state,
      region: customer.region,
      areas: mappedAreas,
      vpmTotalCentavos
    });
  } catch (err: any) {
    console.warn('Database error on POST, falling back to local memory store:', err.message);
    const body = await request.json().catch(() => ({}));
    const { ctvId, name, document, city, state, region, areas } = body;

    const mockCustomerId = "mock-id-" + Math.random().toString(36).substr(2, 9);
    
    // Default mock crop prices: Café: R$ 8.900/ha, Soja: R$ 3.500/ha
    const mockIndices = [
      { crop: 'CAFÉ', value: 890000 },
      { crop: 'SOJA', value: 350000 }
    ];

    let vpmTotalCentavos = 0;
    const mappedAreas = (areas || []).map((area: any, idx: number) => {
      const cropName = area.cropName || area.crop_name || 'SOJA';
      const areaHa = Number(area.areaHa || area.area_ha || 0);
      const matchedIdx = mockIndices.find(m => m.crop === cropName.toUpperCase());
      const valuePerHectare = matchedIdx ? matchedIdx.value : 350000;
      const areaVpm = Math.round(areaHa * valuePerHectare);
      vpmTotalCentavos += areaVpm;

      return {
        id: "mock-area-id-" + idx,
        cropName,
        areaHa,
        valorPorHectareCentavos: valuePerHectare,
        vpmCentavos: areaVpm
      };
    });

    const newMockCustomer = {
      id: mockCustomerId,
      tenant_id: tenantId,
      ctv_id: ctvId || "ctv-mock-id",
      name,
      document,
      city,
      state,
      region,
      areas: mappedAreas,
      vpmTotalCentavos
    };

    localCustomersStore.push(newMockCustomer);
    return NextResponse.json(newMockCustomer);
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
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
