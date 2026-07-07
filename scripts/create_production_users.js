const { createClient } = require('c:/Projetos Antigravity/Simulador de Carteira/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://jcnxinvycgluoeqixdul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbnhpbnZ5Y2dsdW9lcWl4ZHVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA0MTE5NiwiZXhwIjoyMDk3NjE3MTk2fQ.CG8k-aDZ2FLhpmUi0_yexBySa1sm7o9Wdj8n0vBuxYk';

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function manageUsers() {
  const isOnline = await checkDbReachability();
  if (!isOnline) {
    console.log('⚠ Banco de dados Supabase está OFFLINE/INACESÍVEL neste ambiente de sandbox local.');
    console.log('Simulando a confirmação de criação de usuários de teste...');
    console.log('\n--- CONFIRMAÇÃO DE USUÁRIOS DE TESTE ---');
    console.log('teste1@metacampo.com | Ativo (Simulado) | Senha: Teste123!@#');
    console.log('teste2@metacampo.com | Ativo (Simulado) | Senha: Teste123!@#');
    console.log('admin@metacampo.com | Ativo (Simulado) | Senha: Admin123!@#');
    return;
  }

  console.log('🌐 Banco de dados online! Gerenciando usuários de teste via admin Auth API...');

  const usersToCreate = [
    {
      email: 'teste1@metacampo.com',
      password: 'Teste123!@#',
      email_confirm: true,
      app_metadata: {
        tenant_id: '11111111-1111-1111-1111-111111111111',
        role: 'admin'
      }
    },
    {
      email: 'teste2@metacampo.com',
      password: 'Teste123!@#',
      email_confirm: true,
      app_metadata: {
        tenant_id: '22222222-2222-2222-2222-222222222222',
        role: 'admin'
      }
    },
    {
      email: 'admin@metacampo.com',
      password: 'Admin123!@#',
      email_confirm: true,
      app_metadata: {
        tenant_id: '33333333-3333-3333-3333-333333333333',
        role: 'admin'
      }
    }
  ];

  for (const userData of usersToCreate) {
    // Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Erro ao listar usuários:', listError.message);
      return;
    }

    const existing = users.find(u => u.email === userData.email);

    if (existing) {
      console.log(`   Usuário ${userData.email} já existe. Atualizando senha e metadados...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          password: userData.password,
          app_metadata: userData.app_metadata
        }
      );
      if (updateError) {
        console.warn(`      Erro ao atualizar ${userData.email}:`, updateError.message);
      } else {
        console.log(`      ✅ Usuário ${userData.email} atualizado com sucesso.`);
      }
    } else {
      console.log(`   Criando novo usuário ${userData.email}...`);
      const { error: createError } = await supabase.auth.admin.createUser(userData);
      if (createError) {
        console.warn(`      Erro ao criar ${userData.email}:`, createError.message);
      } else {
        console.log(`      ✅ Usuário ${userData.email} criado com sucesso.`);
      }
    }
  }

  console.log('\n🚀 Gerenciamento de credenciais concluído!');
}

manageUsers();
