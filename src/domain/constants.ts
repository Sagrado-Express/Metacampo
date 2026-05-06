/**
 * Antigravity AI - Golden Master Constants
 * Derived from 'Simulador Carteira CTV AA _20260313.xlsx'
 */

export const VISIT_FREQUENCIES = {
  AZUL: '4x/mês',
  VERDE: '3x/mês',
  AMARELO: '2x/mês',
  VERMELHO: '1x/mês'
} as const;

export const DEFAULT_ITAA = {
  SOJA: 3500, // Based on Golden Master tests
  MILHO: 2500,
  ALGODAO: 5500,
  CAFE: 4500,
  HF: 3000
} as const;

export const PARETO_THRESHOLD = 0.8; // 80/20 rule mentioned in Excel
