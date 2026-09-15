import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extrai uma mensagem legível de um valor capturado em catch (tipo unknown). */
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Converte texto de valor em reais pra centavos, arredondando pro real mais
 * próximo antes de multiplicar (o produto nunca usa centavos fracionados
 * de real). Extraído de duas cópias idênticas (ITMatrix.tsx e
 * viabilidade/page.tsx) pra não nascer uma terceira na importação de
 * faturamento.
 *
 * Aceita tanto "." quanto "," como decimal — necessário pra CSV importado
 * (Excel/Sheets exportam "45000.00", não "45000,00"), não só digitação
 * manual em pt-BR. Desambigua pelo ÚLTIMO separador que aparece na string:
 * "4.000,00" e "4000,00" → decimal é a vírgula (pt-BR); "4000.00" → decimal
 * é o ponto (só ele existe); "4.000" (3 dígitos depois do ponto, sem
 * vírgula) → ponto é separador de milhar, não decimal.
 *
 * Bug real encontrado ao testar a importação de faturamento ao vivo
 * (15/09/2026): a versão anterior sempre removia TODO ponto antes de
 * converter — "1000.00" virava "100000" (cai no parseFloat como cem mil),
 * inflando o valor em 100x pra qualquer CSV com decimal em ponto. O
 * comentário desta função já prometia aceitar "4000.00", mas o código
 * nunca entregou isso.
 */
export function parseBRLParaCentavos(raw: string): number {
  const cleaned = raw.replace(/[R$\s]/g, "");
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma > lastDot) {
    // Vírgula depois do ponto (ou única separadora): vírgula é o decimal.
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > -1) {
    const digitosAposPonto = cleaned.length - lastDot - 1;
    // 3 dígitos exatos depois do único ponto, sem vírgula: separador de
    // milhar pt-BR sem decimal (ex.: "4.000"). Qualquer outra contagem
    // (0, 1, 2 ou 4+) trata o ponto como decimal.
    normalized = digitosAposPonto === 3 ? cleaned.replace(/\./g, "") : cleaned;
  } else {
    normalized = cleaned;
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed) * 100;
}
