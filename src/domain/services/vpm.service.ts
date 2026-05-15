import { ITSEConfig, VPMResult, PerformanceBand, AgriculturalWindow, Cliente, IBGEBenchmark } from '@/types/schema';

export interface ParetoResult {
  clientId: string;
  name: string;
  vpmTotal: number;
  performanceBand: PerformanceBand;
  cumulativePercentage: number;
}

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
   * Automates Step 15 segmentation based on the Antigravity V4 Blueprint.
   * Rules:
   * 1. Ranking: Order by VPM Total descending.
   * 2. Cutoff: Top 80% cumulative VPM = Grupo Estratégico.
   * 3. Color Logic (Estratégico):
   *    - AZUL: (Faturado / VPM) >= 0.15 AND Rating in [A, B]
   *    - VERMELHO: (Faturado / VPM) < 0.05 (High Gap)
   *    - VERDE: Others in Estratégico
   * 4. Color Logic (Complementar):
   *    - AMARELO: Top 50% of remaining
   *    - CINZA: Bottom 50% or Default
   */
  static calculatePareto(
    clients: { 
      id: string; 
      name: string; 
      vpmTotal: number; 
      realizedValue?: number; 
      rating?: string 
    }[]
  ): ParetoResult[] {
    
    // 1. Ranking: Order by VPM Total descending
    const sorted = [...clients].sort((a, b) => b.vpmTotal - a.vpmTotal);
    
    const totalPortfolioVpm = sorted.reduce((acc, curr) => acc + curr.vpmTotal, 0);
    if (totalPortfolioVpm === 0) return sorted.map(c => ({ clientId: c.id, name: c.name, vpmTotal: c.vpmTotal, performanceBand: 'CINZA', cumulativePercentage: 0 }));

    let cumulativeVpm = 0;
    const ranked = sorted.map(item => {
      cumulativeVpm += item.vpmTotal;
      return {
        ...item,
        cumulativePercentage: Number(((cumulativeVpm / totalPortfolioVpm) * 100).toFixed(2))
      };
    });

    return ranked.map(c => {
      const share = c.vpmTotal > 0 ? (c.realizedValue || 0) / c.vpmTotal : 0;
      let band: PerformanceBand = 'CINZA';

      if (c.cumulativePercentage <= 80) {
        // GRUPO ESTRATÉGICO
        if (share >= 0.15 && ['A', 'B'].includes(c.rating || '')) {
          band = 'AZUL';
        } else if (share < 0.05) {
          band = 'VERMELHO';
        } else {
          band = 'VERDE';
        }
      } else {
        // GRUPO COMPLEMENTAR
        band = c.cumulativePercentage <= 90 ? 'AMARELO' : 'CINZA';
      }

      return {
        clientId: c.id,
        name: c.name,
        vpmTotal: c.vpmTotal,
        cumulativePercentage: c.cumulativePercentage,
        performanceBand: band
      };
    });
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

