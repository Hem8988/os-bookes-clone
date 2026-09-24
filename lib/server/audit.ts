import type { Db } from '@/lib/db';
import type { AuthContext } from './auth';

export interface AuditInput {
  action: string;
  entityType?: string;
  entityId?: string;
  reference?: string;
  details?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  /** Specially flagged in the audit screen (day reopen, overrides, ledger edits…). */
  sensitive?: boolean;
}

/** Whoever performs an action: a logged-in user, the WhatsApp bot or a job. */
export type Actor = Pick<AuthContext, 'tenantId' | 'userId' | 'name' | 'ip' | 'userAgent'> & { role: string };

const toJson = (v: unknown) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export async function audit(db: Db, actor: Actor, input: AuditInput) {
  await db.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      reference: input.reference,
      details: input.details,
      oldValue: toJson(input.oldValue),
      newValue: toJson(input.newValue),
      reason: input.reason,
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
      isSensitive: !!input.sensitive,
    },
  });
}

/** Actor used by background jobs and inbound webhooks. */
export function systemActor(tenantId = 'default', name = 'System'): Actor {
  return { tenantId, userId: 'system', name, role: 'SYSTEM', ip: '127.0.0.1', userAgent: 'system' };
}
