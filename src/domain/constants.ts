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

/**
 * Default color palette (Morning Dew theme) for dynamic product classifications.
 * Used when a tenant creates a new classification without specifying a color.
 * Colors cycle through this palette based on creation order.
 */
export const DEFAULT_CLASSIFICATION_COLORS = [
  '#22C55E', // Verde Clorofila
  '#3B82F6', // Azul Safira
  '#F59E0B', // Âmbar Colheita
  '#8B5CF6', // Violeta Orvalho
  '#EF4444', // Vermelho Alerta
  '#06B6D4', // Ciano Água
  '#EC4899', // Rosa Flor
  '#14B8A6', // Teal Folha
  '#F97316', // Laranja Solo
  '#6366F1', // Índigo Noite
] as const;
