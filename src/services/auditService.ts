import { db } from './db/store';
import { AuditLog, User } from '../types/erp';

export class AuditService {
  public static log(
    user: User,
    action: string,
    module: string,
    recordId: string,
    beforeState?: any,
    afterState?: any,
    branchId?: string
  ): AuditLog {
    const entry: AuditLog = {
      id: 'audit_' + Math.random().toString(36).substr(2, 9) + Date.now(),
      timestamp: new Date().toISOString(),
      companyId: user.companyId,
      branchId: branchId || user.defaultBranchId,
      userId: user.id,
      userName: user.fullName,
      role: user.role,
      action,
      module,
      recordId,
      ipAddress: '192.168.1.1',
      beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : undefined,
      afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : undefined
    };

    db.collection('auditLogs').insertOne(entry);
    return entry;
  }

  public static getLogs(limit: number = 100): AuditLog[] {
    const logs = db.collection('auditLogs').find();
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }
}
