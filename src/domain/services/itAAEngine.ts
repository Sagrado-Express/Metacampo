import { Segmento, ITAAConfig } from '@/types/blueprint';

export const SEGMENTOS: Segmento[] = [
  'Semente',
  'Fertilizante',
  'Agroquímicos',
  'Nutrição',
  'Biológico',
  'Regulador de Crescimento'
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

  static calculateVPMIndividual(
    hectares: Record<string, number>,
    itAAConfigs: Record<string, number>
  ): number {
    return Object.keys(hectares).reduce((total, cultura) => {
      const chaveNormalizada = Object.keys(itAAConfigs).find(
        k => k.toLowerCase() === cultura.toLowerCase()
      );
      return total + (hectares[cultura] * (chaveNormalizada ? itAAConfigs[chaveNormalizada] : 0));
    }, 0);
  }
}
