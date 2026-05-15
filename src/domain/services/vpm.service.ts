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
  
  // Helper to convert Rating to Weight for tie-breaking
  private static getRatingWeight(rating?: string): number {
    switch (rating?.toUpperCase()) {
      case 'A': return 5;
      case 'B': return 4;
      case 'C': return 3;
      case 'D': return 2;
      case 'E': return 1;
      default: return 0;
    }
  }

  // ==========================================
  // 1. MOTOR DE CÁLCULO FINANCEIRO (AGR-1)
  // ==========================================

  /**
   * Calculates the Required Area (Simulação) based on Sales Goal and Target Share.
   * Formula: Área Necessária = Meta de Venda ÷ (Share Alvo × IT-SE Total)
   * Uses Safe Math to avoid float division issues.
   */
  static calculateRequiredArea(
    metaVenda: number,
    shareAlvoDecimal: number,
    itseTotal: number,
    areaCadastrada: number
  ): { areaNecessaria: number; areaInvalida: boolean; alert?: string } {
    if (shareAlvoDecimal <= 0 || itseTotal <= 0) return { areaNecessaria: 0, areaInvalida: false };

    // Safe Math: Calculate area and round to 2 decimal places properly
    const rawArea = metaVenda / (shareAlvoDecimal * itseTotal);
    const areaNecessaria = Math.round(rawArea * 100) / 100;
    
    // Safe comparison using small epsilon to avoid float inconsistencies like 100.0000000001 > 100
    const epsilon = 0.001;
    const areaInvalida = (areaNecessaria - areaCadastrada) > epsilon;

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
    return Math.round((metaSegmento / vpmSegmento) * 10000) / 10000; // Keeps as 4 decimal places safely
  }

  // ==========================================
  // 2. MOTOR DE SEGMENTAÇÃO PARETO 80/20 (AGR-2)
  // ==========================================

  /**
   * Automates Step 15 segmentation based on the Antigravity V4 Blueprint.
   * Single-Pass O(N) calculation after sorting.
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
    
    // 1. O(N log N) Ranking: Order by VPM Total descending, tie-breaker by Rating
    const sorted = [...clients].sort((a, b) => {
      // Safe subtraction in cents for comparison
      const diff = Math.round(b.vpmTotal * 100) - Math.round(a.vpmTotal * 100);
      if (diff !== 0) return diff;
      return this.getRatingWeight(b.rating) - this.getRatingWeight(a.rating);
    });
    
    // 2. O(N) Single-Pass: Calculate Total VPM
    const totalPortfolioVpmCents = sorted.reduce((acc, curr) => acc + Math.round(curr.vpmTotal * 100), 0);
    
    if (totalPortfolioVpmCents === 0) {
      return sorted.map(c => ({ clientId: c.id, name: c.name, vpmTotal: c.vpmTotal, performanceBand: 'CINZA', cumulativePercentage: 0 }));
    }

    // 3. O(N) Single-Pass: Cumulative assignment
    let cumulativeVpmCents = 0;
    
    return sorted.map(c => {
      const vpmCents = Math.round(c.vpmTotal * 100);
      cumulativeVpmCents += vpmCents;
      
      const cumulativePercentage = Math.round((cumulativeVpmCents / totalPortfolioVpmCents) * 10000) / 100;
      const share = vpmCents > 0 ? Math.round((c.realizedValue || 0) * 100) / vpmCents : 0;
      
      let band: PerformanceBand = 'CINZA';

      if (cumulativePercentage <= 80) {
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
        band = cumulativePercentage <= 90 ? 'AMARELO' : 'CINZA';
      }

      return {
        clientId: c.id,
        name: c.name,
        vpmTotal: c.vpmTotal,
        cumulativePercentage,
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
   * Uses Safe Math in cents.
   */
  static calculateToGo(previsaoVenda: number, faturamento: number, pedidosPendentes: number): number {
    const previsaoCents = Math.round(previsaoVenda * 100);
    const faturamentoCents = Math.round(faturamento * 100);
    const pedidosCents = Math.round(pedidosPendentes * 100);
    
    const toGoCents = previsaoCents - (faturamentoCents + pedidosCents);
    return Math.max(0, toGoCents) / 100;
  }

  /**
   * Calculates the Access Gap.
   * Formula: VPM Total - Faturamento Total
   * Uses Safe Math in cents.
   */
  static calculateAccessGap(vpmTotal: number, faturamentoTotal: number): number {
    const gapCents = Math.round(vpmTotal * 100) - Math.round(faturamentoTotal * 100);
    return Math.max(0, gapCents) / 100;
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

