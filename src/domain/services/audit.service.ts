import { AuditLog } from '@/types/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing immutable audit records.
 * Ensures every change to critical data (targets, areas, configs) is tracked.
 */
export class AuditService {
  /**
   * Creates an audit log entry for a change.
   */
  static logChange(params: {
    entityId: string;
    entityType: string;
    changedBy: string;
    previousValue: any;
    newValue: any;
    reason?: string;
  }): AuditLog {
    const log: AuditLog = {
      id: uuidv4(),
      entityId: params.entityId,
      entityType: params.entityType,
      changedBy: params.changedBy,
      changedAt: new Date(),
      previousValue: params.previousValue,
      newValue: params.newValue,
      reason: params.reason,
    };

    // In a real implementation, this would be persisted to Supabase/DB.
    // For the Transient Middleware focus, we focus on the logic.
    console.info(`[AUDIT] ${params.entityType} (${params.entityId}) updated by ${params.changedBy}`);
    
    return log;
  }

  /**
   * Retrieves history for a specific entity.
   */
  static getHistory(entityId: string, logs: AuditLog[]): AuditLog[] {
    return logs
      .filter((log) => log.entityId === entityId)
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  }
}
