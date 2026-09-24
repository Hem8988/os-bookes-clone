import type { Db, Tx } from '@/lib/db';
import { createApproval } from './approvals';
import { audit, Actor } from './audit';
import { reopenDeliveryDay } from './deliveryDays';
import type { Effects } from './effects';
import { badRequest, conflict, dateStr, round2 } from './http';
import { getSetting } from './settings';

/** Everything the accountant reconciles before locking a business day (SRS §12). */
export async function closingSummary(db: Db, tenantId: string, date: string) {
  const [deliveries, payments, submissions, days, wallets, closing, invoices, pendingApprovals] = await Promise.all([
    db.delivery.findMany({ where: { tenantId, deliveryDate: date } }),
    db.payment.findMany({ where: { tenantId, paymentDate: date, source: { not: 'DELIVERY' } } }),
    db.cashSubmission.findMany({ where: { tenantId, date } }),
    db.deliveryDay.findMany({ where: { tenantId, date } }),
    db.cashWallet.findMany({ where: { tenantId } }),
    db.dailyClosing.findUnique({ where: { tenantId_date: { tenantId, date } } }),
    db.invoice.findMany({ where: { tenantId, date, status: { not: 'Cancelled' } } }),
    db.approvalRequest.count({ where: { tenantId, status: 'PENDING' } }),
  ]);

  const sum = <T>(rows: T[], pick: (r: T) => number) => round2(rows.reduce((s, r) => s + pick(r), 0));
  const cashCollected = sum(deliveries.filter((d) => d.paymentMode === 'CASH'), (d) => d.paymentAmount);
  const cashSubmitted = sum(submissions.filter((s) => s.status === 'APPROVED'), (s) => s.amount);
  const cashWithBoys = sum(wallets.filter((w) => w.ownerType === 'DELIVERY_BOY'), (w) => w.balance);

  const pending = {
    deliveries: deliveries.filter((d) => d.status === 'PENDING_VERIFICATION').length,
    sentBack: deliveries.filter((d) => d.status === 'SENT_BACK').length,
    payments: payments.filter((p) => p.status === 'PENDING_VERIFICATION').length,
    cashSubmissions: submissions.filter((s) => s.status === 'PENDING').length,
    openDeliveryDays: days.filter((d) => d.status !== 'CLOSED').length,
  };

  return {
    date,
    status: closing?.status || 'OPEN',
    closing,
    deliveries: {
      total: deliveries.length,
      verified: deliveries.filter((d) => d.status === 'VERIFIED').length,
      cylinders: deliveries.reduce((s, d) => s + d.deliveredQtyTotal, 0),
      empties: deliveries.reduce((s, d) => s + d.emptyReceivedTotal, 0),
      variances: deliveries.filter((d) => d.hasVariance).length,
    },
    collections: {
      cash: cashCollected,
      online: sum(deliveries.filter((d) => d.paymentMode === 'ONLINE'), (d) => d.paymentAmount),
      cheque: sum(deliveries.filter((d) => d.paymentMode === 'CHEQUE'), (d) => d.paymentAmount),
      credit: sum(deliveries, (d) => Math.max(d.invoiceAmount - d.paymentAmount, 0)),
      latePayments: sum(payments.filter((p) => p.status === 'VERIFIED'), (p) => p.amount),
    },
    cash: {
      expectedFromDeliveries: cashCollected,
      submittedAndApproved: cashSubmitted,
      pendingSubmissions: sum(submissions.filter((s) => s.status === 'PENDING'), (s) => s.amount),
      stillWithDeliveryBoys: cashWithBoys,
      companyCash: sum(wallets.filter((w) => w.ownerType === 'COMPANY'), (w) => w.balance),
    },
    invoices: { count: invoices.length, total: sum(invoices, (i) => i.grandTotal) },
    deliveryBoys: days.map((d) => ({ name: d.deliveryBoyName, status: d.status, openingCash: d.openingCash, closingCash: d.closingCash })),
    pending,
    pendingApprovals,
  };
}

export async function lockDay(tx: Tx, actor: Actor, dateInput: string, opts: { force?: boolean; notes?: string }) {
  const date = dateStr(dateInput, 'Date');
  const existing = await tx.dailyClosing.findUnique({ where: { tenantId_date: { tenantId: actor.tenantId, date } } });
  if (existing?.status === 'LOCKED') throw conflict(`${date} is already locked.`);

  const summary = await closingSummary(tx, actor.tenantId, date);
  const blockers = Object.entries(summary.pending).filter(([, count]) => count > 0);
  const operations = await getSetting(actor.tenantId, 'operations');
  if (blockers.length && operations.blockLockWithPendingItems && !(opts.force && actor.role === 'SUPER_ADMIN')) {
    throw conflict(`Cannot lock ${date}: ${blockers.map(([k, c]) => `${c} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join(', ')} pending.`);
  }

  const data = { status: 'LOCKED', lockedBy: actor.name, lockedAt: new Date(), summary: JSON.parse(JSON.stringify({ ...summary, notes: opts.notes || null })) };
  const closing = existing
    ? await tx.dailyClosing.update({ where: { id: existing.id }, data })
    : await tx.dailyClosing.create({ data: { ...data, tenantId: actor.tenantId, date } });
  await audit(tx, actor, { action: 'DAY_LOCKED', entityType: 'DailyClosing', entityId: closing.id, reference: date, newValue: { cash: summary.cash, collections: summary.collections }, sensitive: blockers.length > 0 });
  return closing;
}

export async function reopenDay(tx: Tx, actor: Actor, dateInput: string, reason: string) {
  const date = dateStr(dateInput, 'Date');
  if (!reason.trim()) throw badRequest('Reason is mandatory to re-open a day.');
  const closing = await tx.dailyClosing.findUnique({ where: { tenantId_date: { tenantId: actor.tenantId, date } } });
  if (!closing || closing.status !== 'LOCKED') throw conflict(`${date} is not locked.`);
  await tx.dailyClosing.update({ where: { id: closing.id }, data: { status: 'REOPENED', reopenedBy: actor.name, reopenedAt: new Date(), reopenReason: reason } });
  await audit(tx, actor, { action: 'DAY_REOPENED', entityType: 'DailyClosing', entityId: closing.id, reference: date, reason, sensitive: true });
}

/** Accountant or delivery boy asks the admin to re-open a closed day. */
export async function requestDayReopen(
  tx: Tx,
  actor: Actor,
  input: { scope: 'ACCOUNTS' | 'DELIVERY_DAY'; date: string; deliveryBoyId?: string; reason: string },
  effects: Effects
) {
  const date = dateStr(input.date, 'Date');
  if (!input.reason?.trim()) throw badRequest('Reason is mandatory.');
  const deliveryBoyId = input.scope === 'DELIVERY_DAY' ? input.deliveryBoyId || actor.userId : undefined;
  const already = await tx.approvalRequest.findFirst({ where: { tenantId: actor.tenantId, type: 'DAY_REOPEN', status: 'PENDING', referenceId: `${input.scope}:${deliveryBoyId || ''}:${date}` } });
  if (already) throw conflict('A re-open request for this day is already pending.');
  return createApproval(
    tx,
    {
      tenantId: actor.tenantId,
      type: 'DAY_REOPEN',
      referenceType: 'DAY',
      referenceId: `${input.scope}:${deliveryBoyId || ''}:${date}`,
      title: input.scope === 'ACCOUNTS' ? `Re-open accounts day ${date}` : `Re-open delivery day ${date} (${actor.name})`,
      summary: input.reason,
      payload: { scope: input.scope, date, deliveryBoyId, reason: input.reason },
      requestedById: actor.userId,
      requestedByName: actor.name,
    },
    effects
  );
}

export async function applyDayReopen(tx: Tx, actor: Actor, payload: { scope: string; date: string; deliveryBoyId?: string; reason: string }) {
  if (payload.scope === 'DELIVERY_DAY' && payload.deliveryBoyId) {
    await reopenDeliveryDay(tx, actor, payload.deliveryBoyId, payload.date, payload.reason);
  } else {
    await reopenDay(tx, actor, payload.date, payload.reason);
  }
}
