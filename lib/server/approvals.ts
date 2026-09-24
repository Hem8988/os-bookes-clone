import type { Tx } from '@/lib/db';
import { APPROVAL_TYPES, ApprovalType } from '@/lib/permissions';
import type { Effects } from './effects';
import { notifyRoles } from './notify';

export interface NewApproval {
  tenantId: string;
  type: ApprovalType;
  referenceType?: string;
  referenceId?: string;
  title: string;
  summary?: string;
  payload?: unknown;
  requestedById?: string | null;
  requestedByName: string;
}

/** Put an item in the central approval queue (SRS §8) and alert the approvers. */
export async function createApproval(tx: Tx, input: NewApproval, effects?: Effects) {
  const config = APPROVAL_TYPES[input.type];
  const request = await tx.approvalRequest.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      title: input.title,
      summary: input.summary,
      payload: input.payload === undefined ? undefined : JSON.parse(JSON.stringify(input.payload)),
      approverRoles: [...config.approvers],
      requestedById: input.requestedById ?? undefined,
      requestedByName: input.requestedByName,
      dueAt: new Date(Date.now() + config.slaHours * 3_600_000),
      logs: { create: { action: 'CREATED', actorName: input.requestedByName } },
    },
  });
  effects?.add('notify approvers', () =>
    notifyRoles(input.tenantId, [...config.approvers], { title: `${config.label}: ${input.title}`, body: input.summary || input.title, link: '/admin?tab=approval-queue' })
  );
  return request;
}

/** Cancel any still-pending queue items for a reference (e.g. when an order is cancelled). */
export async function cancelPendingApprovals(tx: Tx, tenantId: string, referenceType: string, referenceId: string, actorName: string, note: string) {
  const pending = await tx.approvalRequest.findMany({ where: { tenantId, referenceType, referenceId, status: 'PENDING' } });
  for (const item of pending) {
    await tx.approvalRequest.update({
      where: { id: item.id },
      data: { status: 'CANCELLED', decidedByName: actorName, decidedAt: new Date(), decisionNote: note, logs: { create: { action: 'CANCELLED', actorName, note } } },
    });
  }
}
