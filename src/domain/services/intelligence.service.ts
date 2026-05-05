import { Cliente, PerformanceBand } from '@/types/schema';
import { VpmService } from './vpm.service';

export interface VisitPlan {
  clientId: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reason: string;
}

/**
 * Service for field intelligence and prioritization.
 */
export class IntelligenceService {
  /**
   * Generates a visit plan based on Pareto and billing protection.
   */
  static generateVisitPlan(
    clients: Cliente[],
    revenues: Record<string, number>
  ): VisitPlan[] {
    // 1. Calculate Pareto with weights
    const paretoInput = clients.map(c => ({
      id: c.id,
      revenue: revenues[c.id] || 0,
      qualitativeWeight: c.qualitativeWeight || 1.0
    }));

    const paretoResults = VpmService.calculatePareto(paretoInput);
    
    // 2. Map to visit plan
    return clients.map(client => {
      const pareto = paretoResults.find(p => p.clientId === client.id);
      const isTopClient = (pareto?.cumulativePercentage || 100) <= 80;
      
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
      let reason = 'Manutenção de rotina';

      if (isTopClient) {
        priority = 'CRITICAL';
        reason = 'Proteção de faturamento (Pareto 80)';
      } else if (client.confidenceLevel === 'VERMELHO') {
        priority = 'CRITICAL';
        reason = 'Risco de perda de cliente (Confiança Vermelha)';
      } else if (client.performanceBand === 'AMARELO') {
        priority = 'HIGH';
        reason = 'Oportunidade de recuperação de share';
      }

      return {
        clientId: client.id,
        priority,
        reason
      };
    });
  }
}
