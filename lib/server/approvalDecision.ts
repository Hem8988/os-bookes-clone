import { transaction, type Tx } from '@/lib/db';
import type { ApprovalRequest } from '@/lib/generated/prisma/client';
import { APPROVAL_TYPES, ApprovalType, canDecide } from '@/lib/permissions';
import { audit } from './audit';
import type { AuthContext } from './auth';
import { approveCash, rejectCash } from './cash';
import { applyDayReopen } from './closing';
import { sendBackDelivery, verifyDelivery } from './deliveries';
import { Effects } from './effects';
import { badRequest, conflict, forbidden, notFound, round2, businessDate } from './http';
import { postCustomerLedger } from './ledger';
import { applyInvoiceEdit } from './manualInvoices';
import { notifyUsers } from './notify';
import { approveOrder, rejectOrder } from './orders';
import { rejectPayment, verifyPayment } from './payments';
import { applyAdjustment, AdjustmentInput, approveTransfer, rejectTransfer } from './stock';

type Handler = {
  approve: (tx: Tx, auth: AuthContext, item: ApprovalRequest, note: string | null, effects: Effects) => Promise<void>;
  reject: (tx: Tx, auth: AuthContext, item: ApprovalRequest, note: string, effects: Effects) => Promise<void>;
};

const loadOrder = async (tx: Tx, item: ApprovalRequest) => {
  const order = await tx.order.findUnique({ where: { id: item.referenceId || '' } });
  if (!order) throw notFound('Order not found.');
  return order;
};

const payloadOf = <T>(item: ApprovalRequest) => (item.payload || {}) as T;

const HANDLERS: Record<ApprovalType, Handler> = {
  ORDER_APPROVAL: {
    approve: async (tx, auth, item, _note, effects) => approveOrder(tx, auth, await loadOrder(tx, item), { creditOverride: false }, effects),
    reject: async (tx, auth, item, note, effects) => rejectOrder(tx, auth, await loadOrder(tx, item), note, effects),
  },
  CREDIT_APPROVAL: {
    approve: async (tx, auth, item, _note, effects) => approveOrder(tx, auth, await loadOrder(tx, item), { creditOverride: true }, effects),
    reject: async (tx, auth, item, note, effects) => rejectOrder(tx, auth, await loadOrder(tx, item), note, effects),
  },
  DELIVERY_VERIFICATION: {
    approve: async (tx, auth, item, note, effects) => {
      await verifyDelivery(tx, auth, item.referenceId || '', note, effects);
    },
    reject: (tx, auth, item, note, effects) => sendBackDelivery(tx, auth, item.referenceId || '', note, effects),
  },
  PAYMENT_VERIFICATION: {
    approve: (tx, auth, item, _note, effects) => verifyPayment(tx, auth, item.referenceId || '', effects),
    reject: (tx, auth, item, note) => rejectPayment(tx, auth, item.referenceId || '', note),
  },
  CASH_SUBMISSION: {
    approve: (tx, auth, item) => approveCash(tx, auth, item.referenceId || ''),
    reject: (tx, auth, item, note) => rejectCash(tx, auth, item.referenceId || '', note),
  },
  STOCK_TRANSFER: {
    approve: (tx, auth, item) => approveTransfer(tx, auth, item.referenceId || ''),
    reject: (tx, auth, item, note) => rejectTransfer(tx, auth, item.referenceId || '', note),
  },
  STOCK_ADJUSTMENT: {
    approve: (tx, auth, item) => applyAdjustment(tx, auth, payloadOf<AdjustmentInput>(item), item.id),
    reject: async () => {},
  },
  LEDGER_ADJUSTMENT: {
    approve: async (tx, auth, item) => {
      const p = payloadOf<{ customerId: string; amount: number; reason: string; voucherNumber?: string }>(item);
      const amount = round2(Number(p.amount));
      await postCustomerLedger(tx, {
        tenantId: auth.tenantId,
        customerId: p.customerId,
        entryType: 'ADJUSTMENT',
        debit: amount > 0 ? amount : 0,
        credit: amount < 0 ? -amount : 0,
        voucherNumber: p.voucherNumber || `ADJ-${item.id.slice(-6).toUpperCase()}`,
        date: businessDate(),
        particulars: `Manual adjustment: ${p.reason}`,
        referenceType: 'APPROVAL',
        referenceId: item.id,
        createdBy: auth.name,
      });
      await audit(tx, auth, { action: 'CUSTOMER_BALANCE_ADJUSTED', entityType: 'Customer', entityId: p.customerId, reason: p.reason, newValue: { amount }, sensitive: true });
    },
    reject: async () => {},
  },
  INVOICE_APPROVAL: {
    approve: (tx, auth, item) => applyInvoiceEdit(tx, auth, item.referenceId || '', payloadOf<Record<string, unknown>>(item)),
    reject: async () => {},
  },
  DAY_REOPEN: {
    approve: (tx, auth, item) => applyDayReopen(tx, auth, payloadOf<{ scope: string; date: string; deliveryBoyId?: string; reason: string }>(item)),
    reject: async () => {},
  },
  DEVICE_APPROVAL: {
    approve: async (tx, auth, item) => {
      const device = await tx.userDevice.findUnique({ where: { id: item.referenceId || '' } });
      if (!device) throw notFound('Device not found.');
      await tx.userDevice.update({ where: { id: device.id }, data: { status: 'APPROVED', approvedBy: auth.name, approvedAt: new Date() } });
      await audit(tx, auth, { action: 'DEVICE_APPROVED', entityType: 'UserDevice', entityId: device.id, reference: device.label || device.deviceId, sensitive: true });
    },
    reject: async (tx, auth, item) => {
      await tx.userDevice.update({ where: { id: item.referenceId || '' }, data: { status: 'REVOKED' } });
    },
  },
  FIELD_REQUEST: {
    approve: async () => {},
    reject: async () => {},
  },
};

/** Approve or reject a queue item. Reject always requires a reason (SRS §8). */
export async function decideApproval(auth: AuthContext, id: string, action: 'APPROVE' | 'REJECT', note: string | null) {
  const effects = new Effects();
  const result = await transaction(async (tx) => {
    const item = await tx.approvalRequest.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!item) throw notFound('Approval item not found.');
    if (item.status !== 'PENDING') throw conflict(`This item is already ${item.status.toLowerCase()}.`);
    if (!canDecide(auth.role, item.type)) throw forbidden(`Only ${APPROVAL_TYPES[item.type as ApprovalType]?.approvers.join(' / ')} can decide this item.`);
    if (item.requestedById && item.requestedById === auth.userId && auth.role !== 'SUPER_ADMIN') throw forbidden('You cannot approve your own request.');
    const handler = HANDLERS[item.type as ApprovalType];
    if (!handler) throw badRequest('Unknown approval type.');

    if (action === 'REJECT') {
      if (!note?.trim()) throw badRequest('Reason is mandatory when rejecting.');
      await handler.reject(tx, auth, item, note.trim(), effects);
    } else {
      await handler.approve(tx, auth, item, note, effects);
    }

    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updated = await tx.approvalRequest.update({
      where: { id: item.id },
      data: {
        status,
        decidedById: auth.userId,
        decidedByName: auth.name,
        decidedAt: new Date(),
        decisionNote: note,
        logs: { create: { action: status, actorName: auth.name, actorRole: auth.role, note } },
      },
    });
    await audit(tx, auth, { action: `APPROVAL_${status}`, entityType: 'ApprovalRequest', entityId: item.id, reference: `${item.type}: ${item.title}`, reason: note || undefined });
    if (item.requestedById) {
      const requesterId = item.requestedById;
      effects.add('notify requester', () =>
        notifyUsers(auth.tenantId, [requesterId], { title: `${APPROVAL_TYPES[item.type as ApprovalType].label} ${status.toLowerCase()}`, body: `${item.title}${note ? ` — ${note}` : ''}` })
      );
    }
    return updated;
  });
  effects.schedule();
  return result;
}
