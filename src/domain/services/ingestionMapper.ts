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
    const buckets: Record<string, number> = {};

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
      buckets[key] = (buckets[key] || 0) + value;
    });

    return Object.entries(buckets).map(([key, value]) => {
      const [cnpj, ctvId, segmentId, month, year] = key.split('|');
      return {
        cnpjClient: cnpj,
        ctvId,
        segmentId,
        realizedValue: value,
        billingDate: new Date(parseInt(year), parseInt(month), 1)
      };
    });
  }

  /**
   * Delta Calculation: Real-time comparison with targets.
   * Generates PacingData with Shadow Target logic.
   */
  static calculatePacing(
    aggregatedBilling: Partial<BillingSummary>[],
    targets: CommercialSetup[]
  ): PacingData[] {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    return targets.map(target => {
      // Find matching billing for this bucket
      const matchingBilling = aggregatedBilling.filter(b => 
        b.ctvId === target.ctvId && 
        b.segmentId === target.segmentId &&
        b.billingDate?.getMonth() === target.month - 1 &&
        b.billingDate?.getFullYear() === target.year
      );

      const realizedValue = matchingBilling.reduce((sum, b) => sum + (b.realizedValue || 0), 0);
      
      // Shadow Target (Phantom Line): Pro-rata target for the current day
      const shadowTarget = (currentDay / daysInMonth) * target.targetValue;
      const toGoBalance = Math.max(0, target.targetValue - realizedValue);

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
