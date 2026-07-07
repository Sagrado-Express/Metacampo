const { createClient } = require('c:/Projetos Antigravity/Simulador de Carteira/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jcnxinvycgluoeqixdul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbnhpbnZ5Y2dsdW9lcWl4ZHVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA0MTE5NiwiZXhwIjoyMDk3NjE3MTk2fQ.CG8k-aDZ2FLhpmUi0_yexBySa1sm7o9Wdj8n0vBuxYk';

const supabase = createClient(supabaseUrl, supabaseKey);

const TENANT_ID = '00000000-0000-0000-0000-000000000000'; // Tenant de teste
const CTV_ID = 'mock-ctv-uuid-001';

function normalizeToKey(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function checkDbReachability() {
  try {
    const promise = supabase.from('tenants').select('id').limit(1);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
    await Promise.race([promise, timeout]);
    return true;
  } catch (e) {
    return false;
  }
}

async function seedData() {
  try {
    const baseClientesPath = path.join(process.cwd(), 'scripts/data/base_clientes.json');
    const baseClienteCultivoPath = path.join(process.cwd(), 'scripts/data/base_cliente_cultivo.json');

    const baseClientes = JSON.parse(fs.readFileSync(baseClientesPath, 'utf-8'));
    const baseClienteCultivo = JSON.parse(fs.readFileSync(baseClienteCultivoPath, 'utf-8'));

    console.log('🌱 Iniciando seed de dados pedagógicos...');
    console.log(`   Tenant: ${TENANT_ID}`);
    console.log(`   Clientes: ${baseClientes.length}`);

    const uniqueCrops = [...new Set(baseClienteCultivo.map(c => c['Cultivo']))];
    console.log(`\n📌 Cultivos encontrados nos arquivos Excel:`, uniqueCrops);

    // ─── 1. Offline file seeding (persistent fallbacks) ───
    console.log('\n💾 Salvando cópia local para fallback offline...');

    const dictionaryPath = path.join(process.cwd(), 'src/data/local_dictionary.json');
    let localDict = { classifications: [], cultures: [] };
    if (fs.existsSync(dictionaryPath)) {
      try {
        localDict = JSON.parse(fs.readFileSync(dictionaryPath, 'utf-8'));
      } catch (e) {}
    }

    uniqueCrops.forEach((crop, idx) => {
      const key = normalizeToKey(crop);
      const exists = localDict.cultures.some(c => c.internalKey === key && c.tenantId === TENANT_ID);
      if (!exists) {
        localDict.cultures.push({
          id: `culture-${key.toLowerCase()}`,
          tenantId: TENANT_ID,
          internalKey: key,
          customName: crop,
          isActive: true,
          displayOrder: idx
        });
      }
    });
    fs.writeFileSync(dictionaryPath, JSON.stringify(localDict, null, 2), 'utf-8');
    console.log('   ✅ src/data/local_dictionary.json atualizado.');

    const localCustomers = [];
    baseClientes.forEach(cliente => {
      const clientCrops = baseClienteCultivo.filter(c => c['Produtor'] === cliente['Produtor'] && c['Cliente_ID'] === cliente['Cliente_ID']);
      
      const mappedAreas = clientCrops.map((c, idx) => {
        const areaHa = parseFloat(c['Área Cultivada (ha)'] || '0');
        const itr = parseFloat(c['ITR (R$/ha)'] || '0');
        const vpm = Math.round(areaHa * itr);
        return {
          id: `area-id-${cliente['Cliente_ID']}-${idx}`,
          cropName: c['Cultivo'],
          areaHa: areaHa,
          valorPorHectareCentavos: Math.round(itr * 100),
          vpmCentavos: Math.round(vpm * 100)
        };
      });

      const totalVpmCalculated = mappedAreas.reduce((acc, curr) => acc + curr.vpmCentavos, 0);

      localCustomers.push({
        id: `customer-${cliente['Cliente_ID']}`,
        tenantId: TENANT_ID,
        ctvId: CTV_ID,
        name: cliente['Produtor'],
        document: cliente['Cliente_ID'],
        city: cliente['Município'],
        state: cliente['Estado'],
        region: 'Região Geral',
        performanceBand: 'CINZA',
        confidenceLevel: 'AMARELO',
        creditRating: 'C',
        walletShare: 0,
        qualitativeWeight: 3,
        areas: mappedAreas,
        vpmTotalCentavos: totalVpmCalculated
      });
    });

    const localCustomersPath = path.join(process.cwd(), 'src/data/local_customers.json');
    fs.writeFileSync(localCustomersPath, JSON.stringify(localCustomers, null, 2), 'utf-8');
    console.log('   ✅ src/data/local_customers.json preenchido.');

    // Check reachability
    const isOnline = await checkDbReachability();
    if (!isOnline) {
      console.log('\n⚠ Banco de dados offline/inacessível. Seed gravado exclusivamente nos arquivos JSON locais.');
      console.log('\n🚀 Sucesso! Seed completo (Modo Offline).');
      return;
    }

    // ─── 2. Online Supabase Seeding ───
    try {
      console.log('\n🌐 Conectando e inserindo no Supabase...');
      
      for (let idx = 0; idx < uniqueCrops.length; idx++) {
        const crop = uniqueCrops[idx];
        const key = normalizeToKey(crop);
        await supabase
          .from('tenant_config_culturas')
          .upsert(
            {
              tenant_id: TENANT_ID,
              internal_key: key,
              custom_name: crop,
              is_active: true,
              display_order: idx,
            },
            { onConflict: 'tenant_id,internal_key' }
          );
      }
      console.log(`   ✅ Cultivos inseridos no Supabase.`);

      for (const cliente of baseClientes) {
        await supabase
          .from('customers')
          .upsert(
            {
              tenant_id: TENANT_ID,
              ctv_id: CTV_ID,
              name: cliente['Produtor'],
              document: cliente['Cliente_ID'],
              city: cliente['Município'],
              state: cliente['Estado'],
              region: 'Região Geral',
            },
            { onConflict: 'tenant_id,document' }
          );
      }
      console.log(`   ✅ ${baseClientes.length} clientes inseridos no Supabase.`);

      console.log(`   Inserindo áreas de cultivo...`);
      for (const area of baseClienteCultivo) {
        const areaHa = parseFloat(area['Área Cultivada (ha)'] || '0');
        if (areaHa <= 0) continue;

        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', TENANT_ID)
          .eq('document', area['Cliente_ID'])
          .single();

        if (customerData) {
          await supabase
            .from('customer_crop_areas')
            .upsert(
              {
                tenant_id: TENANT_ID,
                customer_id: customerData.id,
                crop_name: area['Cultivo'],
                area_ha: areaHa,
              },
              { onConflict: 'tenant_id,customer_id,crop_name' }
            );
        }
      }
      console.log(`   ✅ Áreas de cultivo inseridas no Supabase.`);
      console.log('\n✅ Supabase Seed concluído com sucesso!');
    } catch (dbErr) {
      console.warn('\n⚠ Banco de dados offline/inacessível. Seed gravado exclusivamente nos arquivos JSON locais.');
    }

    console.log('\n🚀 Sucesso! Seed completo.');

  } catch (error) {
    console.error('❌ Erro geral ao fazer seed:', error);
    process.exit(1);
  }
}

seedData();
