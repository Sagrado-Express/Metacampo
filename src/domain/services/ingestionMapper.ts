import { ITSEConfig } from '@/types/schema';

export interface IngestedClientRow {
  cliente: string;
  municipio: string;
  uf: string;
  vendedor: string;
  cultivo: string;
  areaPlantadaHa: number;
}

export interface ClientFinancialData extends IngestedClientRow {
  vpmSegmentos: Record<string, number>;
  vpmTotal: number;
}

/**
 * Service responsible for mapping CSV inputs to the METACAMPO internal structures.
 * Implements the mapping logic from the Excel Agr-1 sheet.
 */
export class IngestionMapper {
  
  /**
   * Parses the raw CSV layout exactly as requested by the Master Prompt.
   */
  static parseCSV(csvContent: string): IngestedClientRow[] {
    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const requiredHeaders = ['cliente', 'municipio', 'uf', 'vendedor', 'cultivo', 'area_plantada_ha'];
    
    // Check missing headers using loose matching or throw
    // For resilience, we just look for substring matches if exact isn't found
    const getColIndex = (keyword: string) => headers.findIndex(h => h.includes(keyword));
    
    const indices = {
      cliente: getColIndex('cliente'),
      municipio: getColIndex('municip') > -1 ? getColIndex('municip') : getColIndex('cidade'),
      uf: getColIndex('uf') > -1 ? getColIndex('uf') : getColIndex('estado'),
      vendedor: getColIndex('vendedor'),
      cultivo: getColIndex('cultivo') > -1 ? getColIndex('cultivo') : getColIndex('cultura'),
      area: getColIndex('area') > -1 ? getColIndex('area') : getColIndex('ha')
    };

    const results: IngestedClientRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      results.push({
        cliente: values[indices.cliente] || 'Desconhecido',
        municipio: values[indices.municipio] || '',
        uf: values[indices.uf] || '',
        vendedor: values[indices.vendedor] || '',
        cultivo: values[indices.cultivo] || '',
        areaPlantadaHa: parseFloat(values[indices.area]) || 0
      });
    }

    return results;
  }

  /**
   * Calculates the VPM based on the 6 standard pillars (DNA Financeiro).
   */
  static calculateClientFinancials(
    rows: IngestedClientRow[],
    itseConfigs: ITSEConfig[]
  ): ClientFinancialData[] {
    
    const pilares = ['Semente', 'Fertilizante', 'Agroquímicos', 'Nutrição', 'Biológico', 'Regulador de Crescimento'];

    return rows.map(row => {
      const vpmSegmentos: Record<string, number> = {};
      let vpmTotal = 0;

      pilares.forEach(pilar => {
        // Find configuration for this crop and segment
        const config = itseConfigs.find(c => 
          c.cultivoId.toLowerCase() === row.cultivo.toLowerCase() && 
          c.productSegmentId.toLowerCase() === pilar.toLowerCase()
        );

        const valorHa = config ? config.valuePerHectare : 0;
        const vpmSeg = parseFloat((row.areaPlantadaHa * valorHa).toFixed(2));
        
        vpmSegmentos[pilar] = vpmSeg;
        vpmTotal += vpmSeg;
      });

      return {
        ...row,
        vpmSegmentos,
        vpmTotal: parseFloat(vpmTotal.toFixed(2))
      };
    });
  }
}
