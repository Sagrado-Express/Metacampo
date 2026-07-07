const { createClient } = require('c:/Projetos Antigravity/Simulador de Carteira/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jcnxinvycgluoeqixdul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbnhpbnZ5Y2dsdW9lcWl4ZHVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA0MTE5NiwiZXhwIjoyMDk3NjE3MTk2fQ.CG8k-aDZ2FLhpmUi0_yexBySa1sm7o9Wdj8n0vBuxYk';

const supabase = createClient(supabaseUrl, supabaseKey);

const TENANT_ID = '00000000-0000-0000-0000-000000000000';
const CTV_ID = 'mock-ctv-uuid-001';

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

async function seedPlanejamento() {
  try {
    const localCustomersPath = path.join(process.cwd(), 'src/data/local_customers.json');
    const localDictPath = path.join(process.cwd(), 'src/data/local_dictionary.json');

    if (!fs.existsSync(localCustomersPath) || !fs.existsSync(localDictPath)) {
      console.error('❌ local_customers.json ou local_dictionary.json não encontrados. Rode o seed da Sprint 0 primeiro.');
      process.exit(1);
    }

    const customers = JSON.parse(fs.readFileSync(localCustomersPath, 'utf-8'));
    const dict = JSON.parse(fs.readFileSync(localDictPath, 'utf-8'));

    const segments = dict.classifications.filter(c => c.tenantId === TENANT_ID && c.isActive).map(c => c.internalKey);
    const cultures = dict.cultures.filter(c => c.tenantId === TENANT_ID && c.isActive).map(c => c.internalKey);

    console.log('🌱 Gerando dados de planejamento (Fase 1 - Passo 2)...');
    console.log(`   Segmentos ativos:`, segments);
    console.log(`   Cultivos ativos:`, cultures);

    const localPlanejamento = [];

    // Loop through customers and generate baseline planning values
    customers.forEach(cust => {
      // For each crop area that the customer has
      cust.areas.forEach(area => {
        const cropKey = area.cropName.toUpperCase();
        // Generate planning entry for each segment
        segments.forEach(segment => {
          // Default VPM segment potential calculation = Area * technological segment price
          // For now let's map a mock planned value (e.g. 10% share target)
          const areaHa = area.areaHa || 0;
          const price = area.valorPorHectareCentavos || 350000;
          const potentialCentavos = Math.round(areaHa * price);
          const share = 10.0; // 10% Target
          const plannedCentavos = Math.round(potentialCentavos * (share / 100));

          localPlanejamento.push({
            id: `plan-${cust.id}-${cropKey}-${segment}`,
            tenant_id: TENANT_ID,
            ctv_id: CTV_ID,
            cliente_id: cust.id,
            cliente_name: cust.name,
            cliente_document: cust.document,
            cultivo: area.cropName,
            segmento: segment,
            valor_planejado_centavos: plannedCentavos,
            share_percentual: share,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      });
    });

    const localPlanPath = path.join(process.cwd(), 'src/data/local_planejamento.json');
    fs.writeFileSync(localPlanPath, JSON.stringify(localPlanejamento, null, 2), 'utf-8');
    console.log(`   ✅ Cópia local com ${localPlanejamento.length} registros persistida em src/data/local_planejamento.json.`);

    // DB Seeding
    const isOnline = await checkDbReachability();
    if (!isOnline) {
      console.log('\n⚠ Banco de dados offline. Planejamento seeded apenas no fallback local.');
      return;
    }

    console.log('\n🌐 Conectando ao Supabase para inserir planejamentos...');
    // We batch inserts in chunks to not overload
    const chunkSize = 50;
    for (let i = 0; i < localPlanejamento.length; i += chunkSize) {
      const chunk = localPlanejamento.slice(i, i + chunkSize).map(p => {
        // Map to DB columns
        return {
          tenant_id: p.tenant_id,
          ctv_id: p.ctv_id,
          cliente_id: p.cliente_id.replace('customer-', ''), // Get raw UUID
          cultivo: p.cultivo,
          segmento: p.segmento,
          valor_planejado_centavos: p.valor_planejado_centavos,
          share_percentual: p.share_percentual,
          status: p.status
        };
      });

      const { error } = await supabase
        .from('planejamento_cliente_segmento')
        .upsert(chunk, { onConflict: 'tenant_id,cliente_id,cultivo,segmento' });

      if (error) {
        console.warn(`      Erro no lote de upsert (${i}-${i + chunkSize}):`, error.message);
      }
    }
    console.log('   ✅ Planejamento inserido no Supabase.');

  } catch (err) {
    console.error('❌ Erro no seed de planejamento:', err);
    process.exit(1);
  }
}

seedPlanejamento();
