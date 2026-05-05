export type PlanStatus = 'DRAFT' | 'PENDING_REVIEW' | 'REVIEWED' | 'OFFICIAL';

export interface AuditLog {
  user: string;
  timestamp: string;
  action: string;
  changes?: any;
}

export class GovernanceService {
  /**
   * Passo 10: Fluxo de Handshake
   */
  static submitPlan(planId: string) {
    return { status: 'PENDING_REVIEW', timestamp: new Date().toISOString() };
  }

  static approvePlan(planId: string, managerId: string) {
    return { status: 'REVIEWED', timestamp: new Date().toISOString(), approvedBy: managerId };
  }

  static freezePlan(planId: string, log: AuditLog) {
    // Simula a gravação na tabela official_safra_plans
    console.log('[Freeze] Plano congelado e imutável. Audit Log gravado.');
    return { status: 'OFFICIAL', log };
  }
}
