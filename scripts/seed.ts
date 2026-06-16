import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as path from 'path';

// Carregar variáveis de ambiente (use dotenv se necessário, mas para scripts Node Next as vezes ele pega automático)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = path.join(__dirname, '../Arquivos teste/Metacampo_Base-de-dados_Referencia_Carteira-de-3-CTVs.xlsx');

/**
 * Função principal do Seed
 */
async function runSeed() {
  console.log(`Carregando arquivo Excel: ${FILE_PATH}`);
  const workbook = xlsx.readFile(FILE_PATH);
  
  // Assumindo que os dados estão na primeira aba
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Transformar os dados em JSON (com cabeçalhos)
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);
  
  if (rows.length === 0) {
    console.log("Nenhum dado encontrado na planilha.");
    return;
  }
  
  console.log(`Encontradas ${rows.length} linhas para processar.`);

  // O Excel conterá 3 CTVs. Vamos identificá-los e criá-arlos (ou obter os IDs)
  // Ajuste os nomes das colunas conforme o seu Excel real.
  const COL_CTV_NAME = 'CTV'; // Exemplo de coluna
  const COL_CLIENT_NAME = 'Nome do Cliente';
  const COL_DOCUMENT = 'Documento';
  const COL_PERFORMANCE = 'Banda de Performance';
  const COL_CROP_NAME = 'Cultivo';
  const COL_CROP_AREA = 'Area (ha)';
  const COL_SEGMENT = 'Segmento';
  const COL_META = 'Meta';
  const COL_FATURAMENTO = 'Faturamento Realizado';

  // 1. Processar CTVs (Users)
  const uniqueCTVs = new Set<string>();
  rows.forEach(r => {
    if (r[COL_CTV_NAME]) uniqueCTVs.add(r[COL_CTV_NAME]);
  });

  const ctvMap: Record<string, string> = {};
  for (const ctvName of uniqueCTVs) {
    // Gerar um UUID ficticio para o CTV ou inserir no banco
    const email = `${ctvName.replace(/\s+/g, '').toLowerCase()}@exemplo.com`;
    const { data: user, error: userErr } = await supabase
      .from('User') // Tabela User ou profiles? (conforme schema)
      .select('id')
      .eq('email', email)
      .single();

    if (userErr || !user) {
      console.log(`Criando usuário simulado para CTV: ${ctvName}`);
      // Dependendo de como o seu Auth funciona, vocẽ pode precisar inserir na tabela apropriada
      const mockId = crypto.randomUUID(); 
      ctvMap[ctvName] = mockId;
    } else {
      ctvMap[ctvName] = user.id;
    }
  }

  // 2. Processar Clientes, Cultivos, Metas, etc
  for (const row of rows) {
    const ctvId = ctvMap[row[COL_CTV_NAME]];
    
    // Inserir ou recuperar o Cliente
    const { data: client, error: clientErr } = await supabase
      .from('Cliente')
      .upsert({
        name: row[COL_CLIENT_NAME] || 'Cliente Desconhecido',
        document: row[COL_DOCUMENT] || null,
        ctvId: ctvId,
        performanceBand: row[COL_PERFORMANCE] || 'CINZA',
        confidenceLevel: 'VERDE',
        creditRating: 'A',
        walletShare: 0,
        qualitativeWeight: 1,
      }, { onConflict: 'document' }) // ajuste 'document' ou o que for unico
      .select('id')
      .single();

    if (clientErr) {
      console.error(`Erro inserindo cliente ${row[COL_CLIENT_NAME]}:`, clientErr);
      continue;
    }

    // Inserir Cultivo
    if (row[COL_CROP_NAME]) {
      await supabase.from('Cultivo').insert({
        clienteId: client.id,
        name: row[COL_CROP_NAME],
        areaHa: Number(row[COL_CROP_AREA]) || 0,
        safraId: 'mock-safra-id', // Ajuste
        standardCropId: 'mock-standard-crop', // Ajuste
      });
    }

    // Inserir Configuração Comercial (Meta / SetupBudget)
    if (row[COL_META]) {
       await supabase.from('SetupBudget').insert({
         mes: '01', // Ajustar
         ctvId: ctvId,
         segmento: row[COL_SEGMENT] || 'Sementes',
         valorMetaCentavos: Math.round(Number(row[COL_META]) * 100),
       });
    }

    // Inserir Faturamento Snapshot
    if (row[COL_FATURAMENTO]) {
      await supabase.from('FaturamentoSnapshot').insert({
        mes: '01',
        ctvId: ctvId,
        segmento: row[COL_SEGMENT] || 'Sementes',
        valorRealizadoCentavos: Math.round(Number(row[COL_FATURAMENTO]) * 100),
        valorMetaCentavos: Math.round(Number(row[COL_META] || 0) * 100),
      });
    }
  }

  console.log("Seed finalizado com sucesso!");
}

runSeed().catch(err => {
  console.error("Erro fatal durante o seed:", err);
  process.exit(1);
});
