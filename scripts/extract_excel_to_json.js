const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Arquivo 1: Carteira de 3 CTVs
const filePath = 'C:/Projetos Antigravity/Simulador de Carteira/Arquivos teste/excel/Metacampo_Base-de-dados_Referencia_Carteira-de-3-CTVs.xlsx';
const wb1 = XLSX.readFile(filePath);

// Extrair as abas principais
const parametros = XLSX.utils.sheet_to_json(wb1.Sheets['Parametros_ITR']);
const baseClientes = XLSX.utils.sheet_to_json(wb1.Sheets['Base_Clientes']);
const baseClienteCultivo = XLSX.utils.sheet_to_json(wb1.Sheets['Base_Cliente_Cultivo']);
const resumoCTV = XLSX.utils.sheet_to_json(wb1.Sheets['Resumo_CTV']);
const resumoCultivo = XLSX.utils.sheet_to_json(wb1.Sheets['Resumo Cultivo']);

// Garantir diretório
const dir = path.join(__dirname, 'data');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Salvar como JSON
fs.writeFileSync(path.join(dir, 'parametros_itr.json'), JSON.stringify(parametros, null, 2));
fs.writeFileSync(path.join(dir, 'base_clientes.json'), JSON.stringify(baseClientes, null, 2));
fs.writeFileSync(path.join(dir, 'base_cliente_cultivo.json'), JSON.stringify(baseClienteCultivo, null, 2));
fs.writeFileSync(path.join(dir, 'resumo_ctv.json'), JSON.stringify(resumoCTV, null, 2));
fs.writeFileSync(path.join(dir, 'resumo_cultivo.json'), JSON.stringify(resumoCultivo, null, 2));

console.log('✅ Arquivo 1 extraído');
console.log(`  - Parametros ITR: ${parametros.length} linhas`);
console.log(`  - Base Clientes: ${baseClientes.length} linhas`);
console.log(`  - Base Cliente-Cultivo: ${baseClienteCultivo.length} linhas`);
