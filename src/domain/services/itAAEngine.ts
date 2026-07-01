/**
 * Antigravity V4 - IT-SE / ITAA Engine
 * 
 * Updated for Metadata-Oriented Architecture:
 * - Removed hardcoded SEGMENTOS array
 * - calculateITAA now receives classification keys dynamically from tenant dictionary
 * - calculateVPMIndividual unchanged (already operates with dynamic Record keys)
 * 
 * The canonical formula remains: VPM_Cliente = Σ (HA_Cultura × IT-SE_Cultura_Segmento × Fator_Safra_Vigente)
 * Per GEMINI.md Regra 2: NEVER use aliases ITAA, ITAA_CULTURA, or Valor/ha.
 */

import { ITAAConfig } from '@/types/blueprint';

/**
 * @deprecated Use tenant dictionary instead. 
 * This export is kept temporarily for backward compatibility during migration.
 * Components should migrate to useSegmentDictionary hook.
 */
export const SEGMENTOS_LEGACY = [
  'Semente',
  'Fertilizante',
  'Agroquímicos',
  'Nutrição',
  'Biológico',
  'Regulador de Crescimento'
] as const;

export class ITAAEngine {
  /**
   * Calculates the IT-SE total and technical mix percentages.
   * 
   * @param cultura - Crop internal_key (from tenant dictionary)
   * @param valores - Record mapping classification internal_keys to values per hectare
   *                  e.g. { "SEMENTES": 3500, "FERTILIZANTES": 2500 }
   */
  static calculateITAA(cultura: string, valores: Record<string, number>): ITAAConfig {
    const total = Object.values(valores).reduce((acc, val) => acc + val, 0);
    
    const mixTecnico: Record<string, number> = {};
    Object.keys(valores).forEach(key => {
      mixTecnico[key] = total > 0 ? (valores[key] / total) : 0;
    });

    return {
      cultura,
      valores,
      total,
      mixTecnico,
    };
  }

  /**
   * Calculates individual VPM for a client.
   * Operates with dynamic keys from the tenant dictionary.
   * 
   * @param hectares - Record mapping crop internal_keys to hectare values
   * @param itAAConfigs - Record mapping crop internal_keys to IT-SE totals
   */
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
