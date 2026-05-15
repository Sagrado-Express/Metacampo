import { BillingSummary, CommercialSetup, PacingData } from '@/types/schema';
import Papa from 'papaparse';

/**
 * METACAMPO - Ingestion Engine (The Senior Dev Perspective)
 * Zero-Footprint Ingestion: Memory-First Processing.
 * Implements ISO Normalization, Monthly Aggregation, and Delta Calculation.
 */
export class IngestionMapper {
  
  /**
   * Normalization: ISO Date conversion & Data Cleaning
   */
  static normalizeDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    // Handle DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day);
      }
    }
    
    // Fallback to native ISO
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  /**
   * Aggregation: Grouping by CTV + Client + Month + Segment
   * Processed in memory to ensure instant feedback.
   */
  static aggregateBilling(csvContent: string): Partial<BillingSummary>[] {
    const parsed = Papa.parse(csvContent, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: true 
    });
    
    const rawData = parsed.data as any[];
    const buckets = new Map<string, number>();

    rawData.forEach(row => {
      // Flexible header mapping (Normalizing legacy ERP headers)
      const cnpj = row.CNPJ_Cliente || row.cnpj || '00.000.000/0000-00';
      const ctvId = String(row.ID_CTV || row.ctv || row.vendedor || '');
      const segmentId = row.Segmento || row.segmento || 'Outros';
      const value = parseFloat(row.Valor_Liquido || row.valor || row.faturamento || '0');
      const date = this.normalizeDate(row.Data_Nota || row.data || '');

      const month = date.getMonth();
      const year = date.getFullYear();
      
      // Bucket Key: Client + CTV + Segment + Month + Year
      const key = `${cnpj}|${ctvId}|${segmentId}|${month}|${year}`;
      
      // Safe Math: Convert to cents for accumulation to avoid floating point errors
      const currentCents = buckets.get(key) || 0;
      const valueCents = Math.round(value * 100);
      buckets.set(key, currentCents + valueCents);
    });

    return Array.from(buckets.entries()).map(([key, cents]) => {
      const [cnpj, ctvId, segmentId, month, year] = key.split('|');
      return {
        cnpjClient: cnpj,
        ctvId,
        segmentId,
        realizedValue: cents / 100, // Convert back to float safely
        billingDate: new Date(parseInt(year), parseInt(month), 1)
      };
    });
  }

  /**
   * Delta Calculation: Real-time comparison with targets.
   * Generates PacingData with Shadow Target logic.
   * O(M + N) Performance by using Hash Maps.
   */
  static calculatePacing(
    aggregatedBilling: Partial<BillingSummary>[],
    targets: CommercialSetup[]
  ): PacingData[] {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // 1. O(N) Space/Time: Build an index Map for O(1) lookups
    const billingIndex = new Map<string, number>();
    aggregatedBilling.forEach(b => {
      if (b.billingDate) {
        const month = b.billingDate.getMonth() + 1; // 1-indexed to match target.month
        const year = b.billingDate.getFullYear();
        const key = `${b.ctvId}|${b.segmentId}|${month}|${year}`;
        const currentCents = billingIndex.get(key) || 0;
        const valueCents = Math.round((b.realizedValue || 0) * 100);
        billingIndex.set(key, currentCents + valueCents);
      }
    });

    // 2. O(M) Time: Iterate targets
    return targets.map(target => {
      const key = `${target.ctvId}|${target.segmentId}|${target.month}|${target.year}`;
      const realizedCents = billingIndex.get(key) || 0;
      const realizedValue = realizedCents / 100;
      
      // Shadow Target (Phantom Line): Pro-rata target for the current day
      const targetCents = Math.round(target.targetValue * 100);
      const shadowTargetCents = Math.round((currentDay / daysInMonth) * targetCents);
      const shadowTarget = shadowTargetCents / 100;
      
      const toGoBalanceCents = Math.max(0, targetCents - realizedCents);
      const toGoBalance = toGoBalanceCents / 100;

      return {
        month: target.month,
        year: target.year,
        ctvId: target.ctvId,
        segmentId: target.segmentId,
        targetValue: target.targetValue,
        realizedValue,
        shadowTarget,
        toGoBalance,
        performanceStatus: realizedValue >= shadowTarget ? 'AHEAD' : 'BEHIND'
      };
    });
  }

  /**
   * Smart Reconciliation Check
   * Identifies unmapped segments or new clients.
   */
  static identifyAnomalies(csvContent: string, knownSegments: string[]): string[] {
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    const rawData = parsed.data as any[];
    const unknownSegments = new Set<string>();

    rawData.forEach(row => {
      const segment = row.Segmento || row.segmento;
      if (segment && !knownSegments.includes(segment)) {
        unknownSegments.add(segment);
      }
    });

    return Array.from(unknownSegments);
  }
}
