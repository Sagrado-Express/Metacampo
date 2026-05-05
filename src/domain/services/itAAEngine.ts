import { Segmento, ITAAConfig } from '../types/blueprint';

export const SEGMENTOS: Segmento[] = [
  'Semente',
  'Fertilizante',
  'Defensivos',
  'Nutrição',
  'Biológicos'
];

export class ITAAEngine {
  /**
   * Passo 1: Calcula o ITAA Total e o Mix Técnico %
   */
  static calculateITAA(cultura: string, valores: Record<Segmento, number>): ITAAConfig {
    const total = Object.values(valores).reduce((acc, val) => acc + val, 0);
    
    const mixTecnico: Partial<Record<Segmento, number>> = {};
    SEGMENTOS.forEach(segmento => {
      mixTecnico[segmento] = total > 0 ? (valores[segmento] / total) : 0;
    });

    return {
      cultura,
      valores,
      total,
      mixTecnico: mixTecnico as Record<Segmento, number>
    };
  }

  /**
   * Passo 4: Calcula o VPM Individual baseado nos hectares e no ITAA da cultura
   */
  static calculateVPMIndividual(
    hectares: { soja: number; milho: number; algodao: number },
    itAAConfigs: Record<string, number> // Record<cultura, itaa_total>
  ): number {
    return (
      (hectares.soja * (itAAConfigs['Soja'] || 0)) +
      (hectares.milho * (itAAConfigs['Milho'] || 0)) +
      (hectares.algodao * (itAAConfigs['Algodao'] || itAAConfigs['Algodão'] || 0))
    );
  }
}
