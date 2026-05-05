import { Cliente, GoalDiagnostic, ITAAConfig } from '../types/blueprint';

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
   * Passo 5: Drill-down por Segmento
   * Agrega a meta total de cada segmento baseado no share do mix técnico
   */
  static calculateSegmentDrillDown(clientes: Cliente[], itAAConfigs: Record<string, ITAAConfig>) {
    const drillDown = {
      'Semente': 0,
      'Fertilizante': 0,
      'Defensivos': 0,
      'Nutrição': 0,
      'Biológicos': 0
    };

    clientes.forEach(cliente => {
      // Simplificação: distribui a previsão de vendas proporcionalmente ao mix técnico das culturas
      // Em uma implementação real, isso seria mais granular (área_soja * itaa_soja_segmento + area_milho * itaa_milho_segmento)
      
      const totalHectares = cliente.hectares.soja + cliente.hectares.milho + cliente.hectares.algodao;
      if (totalHectares === 0) return;

      const pesos = {
        soja: cliente.hectares.soja / totalHectares,
        milho: cliente.hectares.milho / totalHectares,
        algodao: cliente.hectares.algodao / totalHectares
      };

      (['Semente', 'Fertilizante', 'Defensivos', 'Nutrição', 'Biológicos'] as const).forEach(segmento => {
        const valorSegmento = 
          (cliente.previsaoVendas * pesos.soja * (itAAConfigs['Soja']?.mixTecnico[segmento] || 0)) +
          (cliente.previsaoVendas * pesos.milho * (itAAConfigs['Milho']?.mixTecnico[segmento] || 0)) +
          (cliente.previsaoVendas * pesos.algodao * (itAAConfigs['Algodão']?.mixTecnico[segmento] || 0));
        
        drillDown[segmento] += valorSegmento;
      });
    });

    return drillDown;
  }
}
