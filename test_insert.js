const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('clientes').insert({
    tenant_id: '00000000-0000-0000-0000-000000000000',
    ctv_id: 'mock-ctv-uuid-001',
    name: 'teste 123',
    city: 'Uberaba',
    state: 'MG',
    region: 'Região Geral',
    document: 'doc-12345'
  }).select().single();
  console.log(JSON.stringify(error || data, null, 2));
}
test();
