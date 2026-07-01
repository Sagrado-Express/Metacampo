import { Cliente, GoalDiagnostic, ITAAConfig } from '@/types/blueprint';

export class PlanningService {
  /**
   * Passo 3: Diagnóstico de Viabilidade
   */
  static calculateDiagnostic(metaVendas: number, shareAlvo: number, vpmDisponivel: number): GoalDiagnostic {
    const vpmMinimoNecessario = shareAlvo > 0 ? metaVendas / (shareAlvo / 100) : 0;
    const isViavel = vpmDisponivel >= vpmMinimoNecessario;

    return {
      metaVendas,
      shareAlvo,
      vpmMinimoNecessario,
      isViavel
    };
  }

  /**
   * Passo 5: Drill-down por Classificação de Produto
   * Aggregates the total target for each product classification
   * based on the technical mix share.
   * 
   * Updated for Dictionary Pattern:
   * - classificationKeys come from tenant's dictionary (no hardcoded names)
   * - hectares and itAAConfigs use dynamic crop keys from tenant's culture dictionary
   * 
   * @param clientes - Client list with hectares per crop
   * @param itAAConfigs - IT-SE configs keyed by crop internal_key
   * @param classificationKeys - Active classification internal_keys from tenant dictionary
   */
  static calculateSegmentDrillDown(
    clientes: Cliente[],
    itAAConfigs: Record<string, ITAAConfig>,
    classificationKeys: string[]
  ) {
    // Initialize drill-down accumulator dynamically from tenant classifications
    const drillDown: Record<string, number> = {};
    classificationKeys.forEach(key => { drillDown[key] = 0; });

    clientes.forEach(cliente => {
      // Build hectares dynamically from client data
      const hectaresMap = cliente.hectares as unknown as Record<string, number>;
      const cropKeys = Object.keys(hectaresMap);
      const totalHectares = cropKeys.reduce((sum, k) => sum + (hectaresMap[k] || 0), 0);
      if (totalHectares === 0) return;

      // Calculate weight of each crop
      const pesos: Record<string, number> = {};
      cropKeys.forEach(crop => {
        pesos[crop] = hectaresMap[crop] / totalHectares;
      });

      // Iterate classifications dynamically
      classificationKeys.forEach(classificacao => {
        let valorSegmento = 0;
        cropKeys.forEach(crop => {
          const mix = itAAConfigs[crop]?.mixTecnico[classificacao] || 0;
          valorSegmento += cliente.previsaoVendas * (pesos[crop] || 0) * mix;
        });
        drillDown[classificacao] += valorSegmento;
      });
    });

    return drillDown;
  }
}
