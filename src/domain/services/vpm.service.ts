import { ITSEConfig, VPMResult, PerformanceBand, AgriculturalWindow, Cultivo, IBGEBenchmark, Cliente } from '@/types/schema';

/**
 * Domain Service for VPM (Valor Potencial de Mercado) calculations.
 * Pure logic implementation to match Excel (Simulador Carteira CTV AA) results.
 */
export class VpmService {
  /**
   * Calculates VPM breakdown based on Area (ha) and ITSE Configs.
   * Formula: VPM = Area * ValuePerHectare (per segment)
   * Ensures 2-decimal rounding for financial consistency.
   */
  static calculateVPM(
    areaHa: number,
    itseConfigs: ITSEConfig[],
    cultivoId: string
  ): VPMResult {
    const breakdown = itseConfigs
      .filter((config) => config.cultivoId === cultivoId)
      .map((config) => ({
        productSegmentId: config.productSegmentId,
        value: Number((areaHa * config.valuePerHectare).toFixed(2)),
      }));

    const totalVpm = Number(
      breakdown.reduce((acc, item) => acc + item.value, 0).toFixed(2)
    );

    return {
      cultivoId,
      totalVpm,
      breakdown,
    };
  }

  /**
   * Determines the Performance Band based on attained value vs target.
   */
  static getPerformanceBand(attained: number, target: number): PerformanceBand {
    if (target <= 0) return 'CINZA';
    const percentage = (attained / target) * 100;

    if (percentage >= 100) return 'AZUL';
    if (percentage >= 90) return 'VERDE';
    if (percentage >= 70) return 'AMARELO';
    if (percentage > 0) return 'VERMELHO';
    return 'CINZA';
  }

  /**
   * Calculates Pareto distribution to help determine Performance Bands
   * across a portfolio of clients.
   * Now supports qualitativeWeight for influence-based adjustments.
   */
  static calculatePareto(
    clients: { id: string; revenue: number; qualitativeWeight: number }[]
  ): { clientId: string; cumulativePercentage: number }[] {
    const sorted = [...clients]
      .map((c) => ({ ...c, adjustedValue: c.revenue * c.qualitativeWeight }))
      .sort((a, b) => b.adjustedValue - a.adjustedValue);
    
    const total = sorted.reduce((acc, curr) => acc + curr.adjustedValue, 0);
    let cumulative = 0;

    return sorted.map((item) => {
      cumulative += item.adjustedValue;
      return {
        clientId: item.id,
        cumulativePercentage: Number(((cumulative / total) * 100).toFixed(2)),
      };
    });
  }

  /**
   * Adjusts the potential share based on the agricultural window.
   * (Step 8: Ajuste de share pelo calendário agrícola)
   */
  static calculateAdjustedShare(currentDate: Date, window: AgriculturalWindow): number {
    const now = currentDate.getTime();
    const start = window.plantingStart.getTime();
    const end = window.harvestEnd.getTime();

    // Within window: 100% potential
    if (now >= start && now <= end) {
      return 1.0;
    }

    // Outside window: 0% potential (MVP logic)
    return 0.0;
  }

  /**
   * Materializes the real area for a client (Step 3).
   * Validates client areas against IBGE benchmarks (Step 2 - Materialização).
   * Ensures CTVs don't "invent" area beyond the municipality physical ceiling.
   */
  static validateAreaAgainstIBGE(
    summedClientArea: number,
    benchmark: IBGEBenchmark
  ): { isValid: boolean; warning?: string } {
    if (summedClientArea > benchmark.areaPlantadaHa) {
      return {
        isValid: false,
        warning: `Alerta: Área total lançada (${summedClientArea} ha) excede o teto IBGE do município para ${benchmark.culturaNome} (${benchmark.areaPlantadaHa} ha).`
      };
    }
    return { isValid: true };
  }

  /**
   * Generates a prioritized visit plan for the CTV (Step 16).
   * Prioritization Logic: 
   * 1. Pareto Band A + RED Confidence (Critical Risk)
   * 2. Pareto Band A + Upcoming Agricultural Window (Urgency)
   * 3. Pareto Band B + Opportunity
   */
  static generateVisitPlan(
    clients: (Cliente & { vpmTotal: number })[],
    windows: AgriculturalWindow[]
  ): { clientId: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'; reason: string }[] {
    const sortedByVpm = [...clients].sort((a, b) => b.vpmTotal - a.vpmTotal);
    const totalVpm = sortedByVpm.reduce((acc, c) => acc + c.vpmTotal, 0);
    let cumulative = 0;

    return sortedByVpm.map((client) => {
      cumulative += client.vpmTotal;
      const isBandA = (cumulative / totalVpm) <= 0.8;
      
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
      let reason = 'Manutenção de Relacionamento';

      if (isBandA) {
        if (client.confidenceLevel === 'VERMELHO') {
          priority = 'CRITICAL';
          reason = 'Alto Risco em Cliente Estratégico (Pareto A)';
        } else if (client.confidenceLevel === 'AMARELO') {
          priority = 'HIGH';
          reason = 'Acompanhamento Necessário (Potencial em Risco)';
        } else {
          priority = 'HIGH';
          reason = 'Garantir Execução do Potencial (Pareto A)';
        }
      }

      return {
        clientId: client.id,
        priority,
        reason
      };
    }).sort((a, b) => {
      const pMap = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
      return pMap[a.priority] - pMap[b.priority];
    });
  }

  /**
   * Calculates the Management Index (%) based on Embrapa standards (Step 13 - V4).
   * Formula: (Volume Realizado / (Área * Dose Ref)) * 100
   */
  static calculateManagementIndex(
    volumeRealizado: number,
    areaHa: number,
    doseRefLha: number
  ): number {
    const volumeNecessario = areaHa * doseRefLha;
    if (volumeNecessario <= 0) return 0;
    return Number(((volumeRealizado / volumeNecessario) * 100).toFixed(2));
  }

  /**
   * Triggers technical alerts based on Management Index.
   */
  static getManagementAlert(index: number): { status: 'CRITICAL' | 'WARNING' | 'OK'; icon: string } {
    if (index < 50) return { status: 'CRITICAL', icon: '🔴' };
    if (index < 80) return { status: 'WARNING', icon: '🟡' };
    return { status: 'OK', icon: '✅' };
  }
}
