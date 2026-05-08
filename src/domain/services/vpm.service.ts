import { ITSEConfig, VPMResult, PerformanceBand, AgriculturalWindow, Cliente, IBGEBenchmark } from '@/types/schema';

/**
 * Domain Service for VPM (Valor Potencial de Mercado) calculations.
 * Fully aligned with the Excel Master Prompt (Agr-1 and Agr-2).
 */
export class VpmService {
  
  // ==========================================
  // 1. MOTOR DE CÁLCULO FINANCEIRO (AGR-1)
  // ==========================================

  /**
   * Calculates the Required Area (Simulação) based on Sales Goal and Target Share.
   * Formula: Área Necessária = Meta de Venda ÷ (Share Alvo × IT-SE Total)
   */
  static calculateRequiredArea(
    metaVenda: number,
    shareAlvoDecimal: number,
    itseTotal: number,
    areaCadastrada: number
  ): { areaNecessaria: number; areaInvalida: boolean; alert?: string } {
    if (shareAlvoDecimal <= 0 || itseTotal <= 0) return { areaNecessaria: 0, areaInvalida: false };

    const areaNecessaria = parseFloat((metaVenda / (shareAlvoDecimal * itseTotal)).toFixed(2));
    const areaInvalida = areaNecessaria > areaCadastrada;

    return {
      areaNecessaria,
      areaInvalida,
      alert: areaInvalida ? `ALERTA: Área Necessária (${areaNecessaria}ha) excede a Área Cadastrada (${areaCadastrada}ha). Ajuste a Meta ou o Share.` : undefined
    };
  }

  /**
   * Calculates Planned Share per segment.
   * Formula: Meta_Segmento ÷ VPM_Segmento
   */
  static calculatePlannedShare(metaSegmento: number, vpmSegmento: number): number {
    if (vpmSegmento <= 0) return 0;
    return parseFloat((metaSegmento / vpmSegmento).toFixed(4)); // Keeps as decimal (e.g., 0.15 = 15%)
  }

  // ==========================================
  // 2. MOTOR DE SEGMENTAÇÃO PARETO 80/20 (AGR-2)
  // ==========================================

  /**
   * Automates Step 15 segmentation based on the strict Agr-2 Excel rules.
   */
  static calculatePareto(
    clients: { id: string; name: string; vpmTotal: number }[]
  ): { clientId: string; performanceBand: PerformanceBand; cumulativePercentage: number }[] {
    
    // 1. Ranking: Order by VPM Total descending
    const sorted = [...clients].sort((a, b) => b.vpmTotal - a.vpmTotal);
    
    const totalPortfolioVpm = sorted.reduce((acc, curr) => acc + curr.vpmTotal, 0);
    if (totalPortfolioVpm === 0) return sorted.map(c => ({ clientId: c.id, performanceBand: 'CINZA', cumulativePercentage: 0 }));

    let cumulativeVpm = 0;
    const result = sorted.map(item => {
      cumulativeVpm += item.vpmTotal;
      return {
        ...item,
        cumulativePercentage: Number(((cumulativeVpm / totalPortfolioVpm) * 100).toFixed(2))
      };
    });

    // 2. Corte 80/20
    const grupoEstrategico = result.filter(c => c.cumulativePercentage <= 80);
    const grupoComplementar = result.filter(c => c.cumulativePercentage > 80);

    // If no one is strictly <= 80 because of huge first client, put at least first client in Estratégico
    if (grupoEstrategico.length === 0 && result.length > 0) {
      grupoEstrategico.push(result[0]);
      grupoComplementar.shift();
    }

    // 3. Sub-segmentação Grupo Estratégico (Top 50% Azul, Bottom 50% Verde)
    const midEstrategico = Math.ceil(grupoEstrategico.length / 2);
    const assignedEstrategico = grupoEstrategico.map((c, index) => ({
      clientId: c.id,
      name: c.name,
      vpmTotal: c.vpmTotal,
      cumulativePercentage: c.cumulativePercentage,
      performanceBand: (index < midEstrategico) ? 'AZUL' as PerformanceBand : 'VERDE' as PerformanceBand
    }));

    // 4. Sub-segmentação Grupo Complementar (Top 50% Amarelo, Bottom 50% Vermelho)
    const midComplementar = Math.ceil(grupoComplementar.length / 2);
    const assignedComplementar = grupoComplementar.map((c, index) => ({
      clientId: c.id,
      name: c.name,
      vpmTotal: c.vpmTotal,
      cumulativePercentage: c.cumulativePercentage,
      performanceBand: (index < midComplementar) ? 'AMARELO' as PerformanceBand : 'VERMELHO' as PerformanceBand
    }));

    return [...assignedEstrategico, ...assignedComplementar];
  }

  // ==========================================
  // 3. MONITORAMENTO E SALDO TO-GO (PASSO 12)
  // ==========================================

  /**
   * Calculates the TO-GO Balance.
   * Formula: Previsão de Venda - (Faturamento + Pedidos Pendentes)
   */
  static calculateToGo(previsaoVenda: number, faturamento: number, pedidosPendentes: number): number {
    const toGo = previsaoVenda - (faturamento + pedidosPendentes);
    return parseFloat(Math.max(0, toGo).toFixed(2)); // Ensures we don't return negative if over-delivered
  }

  /**
   * Calculates the Access Gap.
   * Formula: VPM Total - Faturamento Total
   */
  static calculateAccessGap(vpmTotal: number, faturamentoTotal: number): number {
    const gap = vpmTotal - faturamentoTotal;
    return parseFloat(Math.max(0, gap).toFixed(2));
  }

  /**
   * Efficiency Indicator: Ranks sellers by Budget Gap % (lowest gap first).
   */
  static rankSellers(
    sellers: { name: string; meta: number; faturamento: number; pedidos: number }[]
  ): { name: string; gapPercent: number; toGoTotal: number }[] {
    return sellers.map(s => {
      const toGo = this.calculateToGo(s.meta, s.faturamento, s.pedidos);
      const gapPercent = s.meta > 0 ? (toGo / s.meta) * 100 : 0;
      return {
        name: s.name,
        toGoTotal: toGo,
        gapPercent: parseFloat(gapPercent.toFixed(2))
      };
    }).sort((a, b) => a.gapPercent - b.gapPercent); // Ascending (closest to goal first)
  }

  // ==========================================
  // 4. LEGACY VALIDATIONS (IBGE & CALENDAR)
  // ==========================================

  static validateAreaAgainstIBGE(
    summedClientArea: number,
    benchmark: IBGEBenchmark
  ): { isValid: boolean; warning?: string } {
    if (summedClientArea > benchmark.areaPlantadaHa) {
      return {
        isValid: false,
        warning: `Alerta: Área total lançada (${summedClientArea} ha) excede o teto IBGE do município (${benchmark.areaPlantadaHa} ha).`
      };
    }
    return { isValid: true };
  }

  static calculateAdjustedShare(currentDate: Date, window: AgriculturalWindow): number {
    const now = currentDate.getTime();
    const start = window.plantingStart.getTime();
    const end = window.harvestEnd.getTime();
    if (now >= start && now <= end) return 1.0;
    return 0.0;
  }
}

