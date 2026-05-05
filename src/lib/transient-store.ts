/**
 * Antigravity AI - Memory-First Transient Store
 * 
 * Este serviço gerencia os dados processados em memória RAM durante a sessão,
 * garantindo que faturamentos brutos nota-a-nota não sejam persistidos.
 */

export class TransientStore {
  private static storage: Map<string, any> = new Map();

  static set(key: string, data: any) {
    // Processamento transiente: Dados sensíveis são consolidados e o bruto é descartado
    console.log(`[Memory-First] Processando dados transientes para: ${key}`);
    this.storage.set(key, data);
  }

  static get(key: string) {
    return this.storage.get(key);
  }

  static clear(key: string) {
    this.storage.delete(key);
  }

  /**
   * Simula o faturamento transiente de um CSV do ERP
   */
  static processERPSales(csvData: any) {
    // Lógica fictícia de consolidação nota-a-nota
    const consolidated = {
      realYTD: 12500000,
      lastUpdate: new Date().toISOString(),
      vpmImpact: 'positivo'
    };
    
    this.set('consolidated_sales', consolidated);
    return consolidated;
  }
}
