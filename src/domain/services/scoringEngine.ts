import { ScoringWeights } from '@/types/blueprint';

export class ScoringEngine {
  /**
   * Passo 2: Calcula a Nota do Cliente (0-10) baseada nos pesos multicritérios
   */
  static calculateNota(
    indicadores: {
      vpm: number;          // Normalizado 0-10
      walletShare: number;  // Normalizado 0-10
      creditRating: number; // Normalizado 0-10 (Ex: A=10, B=7.5, C=5, D=0)
      relacionamento: number; // Normalizado 0-10
    },
    pesos: ScoringWeights // Somatório deve ser 100
  ): number {
    const nota = (
      (indicadores.vpm * (pesos.vpm / 100)) +
      (indicadores.walletShare * (pesos.walletShare / 100)) +
      (indicadores.creditRating * (pesos.creditRating / 100)) +
      (indicadores.relacionamento * (pesos.relacionamento / 100))
    );

    return Number(nota.toFixed(2));
  }

  /**
   * Passo 8: Determina a cor da segmentação baseada na nota
   */
  static getSegmentacao(nota: number): 'AZUL' | 'VERDE' | 'AMARELO' | 'VERMELHO' {
    if (nota > 8.5) return 'AZUL';
    if (nota >= 7.0) return 'VERDE';
    if (nota >= 5.0) return 'AMARELO';
    return 'VERMELHO';
  }
}
