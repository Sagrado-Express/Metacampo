import { Cliente, VPMResult, ITSEConfig } from '@/types/schema';
import { VpmService } from './vpm.service';

/**
 * Transient Middleware Service.
 * Handles external data ingestion (CSV) without permanent storage of raw data.
 * Focus: Data Sovereignty and Edge Compatibility.
 */
export class MiddlewareService {
  /**
   * Parses a CSV string following the expanded strategic layout.
   * Designed to run in Vercel Edge Runtime.
   */
  static parseBillingCSV(csvContent: string): any[] {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    
    // Expanded layout based on ERP requirements
    const requiredHeaders = [
      'ID_Cliente', 'Nome_Cliente', 'Produto', 'Segmento', 'Volume', 'Faturamento_R$',
      'vendedor', 'marca', 'principio_ativo', 'data_emissao', 'loja_cliente', 
      'uf_entrega', 'cidade_entrega', 'cod_grupo', 'nome_grupo'
    ];

    const isValid = requiredHeaders.every(h => headers.includes(h));
    
    if (!isValid) {
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      throw new Error('Invalid CSV layout. Missing: ' + missing.join(', '));
    }

    const results: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      
      results.push({
        clientId: record['ID_Cliente'],
        clientName: record['Nome_Cliente'],
        revenue: parseFloat(record['Faturamento_R$']) || 0,
        segment: record['Segmento'],
        product: record['Produto'],
        vendedor: record['vendedor'],
        marca: record['marca'],
        principioAtivo: record['principio_ativo'],
        dataEmissao: record['data_emissao'],
        lojaCliente: record['loja_cliente'],
        uf: record['uf_entrega'],
        cidade: record['cidade_entrega'],
        groupCode: record['cod_grupo'],
        groupName: record['nome_grupo'],
        // IBGE Integration (Phase 2): Normalize municipality to IBGE code
        ibgeCode: this.normalizeMunicipality(record['cidade_entrega'], record['uf_entrega']),
      });
    }

    return results;
  }

  /**
   * Normalizes municipality name to IBGE Code.
   * Placeholder for the fuzzy matching / lookup logic (Semana 6-8).
   */
  private static normalizeMunicipality(name: string, uf: string): string {
    // Example: "Turvelândia" -> 5221551
    // For now, returning a placeholder or name-based key
    return `IBGE-${uf}-${name.toUpperCase().replace(/\s/g, '_')}`;
  }

  /**
   * Transforms raw billing data into strategic VPM results.
   * (Step 13: Integração com faturamento real para detecção de desvios)
   */
  static processStrategicConsolidation(
    billingData: any[],
    itseConfigs: ITSEConfig[]
  ): Record<string, { totalRevenue: number; vpmPotential: number }> {
    const consolidation: Record<string, { totalRevenue: number; vpmPotential: number }> = {};

    billingData.forEach(item => {
      if (!consolidation[item.clientId]) {
        consolidation[item.clientId] = { totalRevenue: 0, vpmPotential: 0 };
      }
      
      consolidation[item.clientId].totalRevenue += item.revenue;
      
      // Map to VPM potential if configs are provided
      // In a real flow, we'd lookup the crop area for the client
      // For the middleware, we focus on the transient aggregation
    });

    return consolidation;
  }
}
