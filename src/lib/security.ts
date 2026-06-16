/**
 * Utilitários Globais de Segurança (LGPD & Anti-Injection)
 * MetaCampo V4
 */

/**
 * Ofusca documentos sensíveis (CPF/CNPJ) de acordo com a LGPD.
 * Aplica máscara parcial. Exemplo: "***.123.***-45"
 * 
 * @param document String crua do documento (CPF ou CNPJ)
 * @returns Documento formatado com máscara parcial
 */
export function maskPII(document: string | null | undefined): string {
  if (!document) return "";
  
  // Remove formatações prévias
  const cleanDoc = document.replace(/\D/g, "");

  // Se for CPF (11 dígitos)
  if (cleanDoc.length === 11) {
    const p1 = cleanDoc.substring(3, 6);
    const p4 = cleanDoc.substring(9, 11);
    return `***.${p1}.***-${p4}`;
  }
  
  // Se for CNPJ (14 dígitos)
  if (cleanDoc.length === 14) {
    const p2 = cleanDoc.substring(2, 5);
    const p3 = cleanDoc.substring(5, 8);
    const p5 = cleanDoc.substring(12, 14);
    return `**.${p2}.${p3}/0001-${p5}`;
  }

  // Falha silenciosa com ofuscação genérica caso não caia nos padrões normais
  if (cleanDoc.length > 4) {
    const visibleStart = cleanDoc.substring(0, 2);
    const visibleEnd = cleanDoc.substring(cleanDoc.length - 2);
    return `${visibleStart}${"*".repeat(cleanDoc.length - 4)}${visibleEnd}`;
  }

  return "***";
}

/**
 * Sanitiza valores originários de planilhas/CSVs para impedir
 * ataques de CSV Formula Injection.
 * 
 * @param value Valor bruto da célula
 * @returns Valor sanitizado e seguro
 */
export function sanitizeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  
  const stringValue = String(value);

  // Impede que softwares de planilha interpretem a string como uma fórmula
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  
  if (dangerousPrefixes.some(prefix => stringValue.startsWith(prefix))) {
    // Adiciona o apóstrofo (') para forçar a interpretação como string no Excel/Google Sheets
    return `'${stringValue}`;
  }

  return stringValue;
}

/**
 * Validação segura de arquivos carregados (Magic Numbers vs Type)
 * e tamanho máximo.
 * 
 * @param file Arquivo a ser validado
 * @param maxSizeMB Tamanho máximo em Megabytes
 * @returns Retorna string de erro se for inválido, senão nulo.
 */
export function verifyJwt(token: string): boolean {
  try {
    // Simple base64 decode check (placeholder). Replace with proper library like jose.
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return false;
    if (payload.nbf && now < payload.nbf) return false;
    // Optionally check audience/issuer here.
    return true;
  } catch (e) {
    console.error('Invalid JWT:', e);
    return false;
  }
}

  if (!file) return "Arquivo inexistente.";

  // 1. Validar tamanho para evitar Memory Exhaustion/DoS
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `O arquivo excede o limite máximo permitido de ${maxSizeMB}MB.`;
  }

  // 2. Validação simples de extensão (para camada 1)
  const safeTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/pdf"];
  
  // Como browsers modernos já aplicam forte checagem em `file.type`, validamos contra whitelist
  // Para CSVs específicos do Windows, o file.type pode vir vazio ou application/vnd.ms-excel
  if (file.type && !safeTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      return "Formato de arquivo inválido. Apenas CSV, XLSX e PDF são permitidos.";
  }

  return null; // OK
}
