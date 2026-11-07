import type { Db, Tx } from '@/lib/db';
import type { CylinderVoucher } from '@/lib/generated/prisma/client';
import { audit, Actor } from './audit';
import type { Effects } from './effects';
import { badRequest, businessDate, round2 } from './http';
import { postCustomerLedger } from './ledger';
import { notifyCustomer } from './notify';
import { nextNumber } from './sequence';

// Cylinder security deposits (SV / TV vouchers).
//
// The deposit card on the customer form is the usual way in: every cylinder
// type with a received deposit becomes one CylinderVoucher (source
// CUSTOMER_MASTER), so it shows in the voucher list, prints as a receipt and
// reaches the books. The deposit is refundable, so it never touches the
// customer's outstanding — except when it is adjusted against their dues.

type Row = Record<string, unknown>;
type LineStatus = 'Pending' | 'Paid' | 'Refunded' | 'Adjusted' | 'Free';
interface DepositLine { productId: string; fee: number; qty: number; status: LineStatus; voucherNo: string }

export const DEPOSIT_MODES = ['CASH', 'BANK', 'UPI', 'CHEQUE', 'OPENING'] as const;
export const VOUCHER_STATUSES = ['ACTIVE', 'TRANSFERRED', 'REFUNDED', 'ADJUSTED', 'CANCELLED'] as const;

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
export const depositMode = (v: unknown) => (DEPOSIT_MODES as readonly string[]).includes(s(v).toUpperCase()) ? s(v).toUpperCase() : null;

function linesOf(value: unknown): DepositLine[] {
  if (!Array.isArray(value)) return [];
  return (value as Row[])
    .filter((l) => s(l.productId))
    .map((l) => ({
      productId: s(l.productId),
      fee: Math.max(0, Number(l.fee) || 0),
      qty: Math.max(0, Math.floor(Number(l.qty) || 0)),
      status: (['Pending', 'Paid', 'Refunded', 'Adjusted', 'Free'].includes(s(l.status)) ? s(l.status) : 'Pending') as LineStatus,
      voucherNo: s(l.voucherNo).toUpperCase(),
    }));
}

/** Voucher status for a form line; null = no voucher (nothing received yet). */
function voucherStatusOf(line: DepositLine | undefined) {
  if (!line || line.qty <= 0) return null;
  switch (line.status) {
    case 'Paid':
    case 'Free':
      return 'ACTIVE';
    case 'Refunded':
      return 'REFUNDED';
    case 'Adjusted':
      return 'ADJUSTED';
    default:
      return null;
  }
}

const sameLine = (a?: DepositLine, b?: DepositLine) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Bring the customer's form-made vouchers in line with the deposit card.
 * Only lines the user changed are touched, so a voucher refunded from the
 * voucher screen is not undone by saving the customer for something else.
 */
export async function syncCustomerDeposits(tx: Tx, actor: Actor, customer: { id: string; name: string; phone: string; whatsappNumber: string | null; email: string | null }, input: Row, previous: Row | null, effects?: Effects) {
  const next = linesOf(input.depositLines);
  const prev = linesOf(previous?.depositLines);
  const mode = depositMode(input.depositMode);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(s(input.depositDate)) ? s(input.depositDate) : businessDate();
  const existing = await tx.cylinderVoucher.findMany({ where: { tenantId: actor.tenantId, customerId: customer.id, source: 'CUSTOMER_MASTER' } });
  const productIds = [...new Set([...next.map((l) => l.productId), ...existing.map((v) => v.productId || '')])].filter(Boolean);
  const products = await tx.product.findMany({ where: { tenantId: actor.tenantId, id: { in: productIds } }, select: { id: true, name: true } });
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name || null;

  const received: CylinderVoucher[] = [];
  for (const productId of productIds) {
    const line = next.find((l) => l.productId === productId);
    const voucher = existing.find((v) => v.productId === productId);
    if (voucher && sameLine(line, prev.find((l) => l.productId === productId))) continue;
    const status = voucherStatusOf(line);

    if (!status || !line) {
      // Back to Pending / removed: the voucher made earlier no longer stands.
      if (voucher && voucher.status !== 'CANCELLED') {
        const v = await tx.cylinderVoucher.update({ where: { id: voucher.id }, data: { status: 'CANCELLED', closedOn: businessDate() } });
        await postDepositAdjustment(tx, actor, v);
        await audit(tx, actor, { action: 'VOUCHER_CANCELLED', entityType: 'CylinderVoucher', entityId: v.id, reference: `${v.voucherNumber} · ${customer.name}` });
      }
      continue;
    }
    if (!voucher && status !== 'ACTIVE' && !line.voucherNo) continue; // refunded / adjusted with nothing on record: nothing to show
    const depositAmount = line.status === 'Free' ? 0 : round2(line.fee * line.qty);
    if (depositAmount > 0 && !mode && !voucher?.paymentMode) throw badRequest('Choose how the cylinder deposit was received (Cash / Bank / UPI / Cheque, or "Old deposit" if it was taken before this software).');

    const data = {
      productId,
      productName: nameOf(productId),
      cylinderQty: line.qty,
      depositAmount,
      status,
      svNumber: line.voucherNo || null,
      voucherType: line.voucherNo.startsWith('TV') ? 'TV' : 'SV',
      closedOn: status === 'ACTIVE' ? null : voucher?.closedOn || businessDate(),
    };
    const v = voucher
      ? await tx.cylinderVoucher.update({ where: { id: voucher.id }, data: { ...data, ...(mode && (voucher.status === 'CANCELLED' || !voucher.paymentMode) ? { paymentMode: mode, issueDate: date } : {}) } })
      : await tx.cylinderVoucher.create({
          data: { ...data, tenantId: actor.tenantId, customerId: customer.id, source: 'CUSTOMER_MASTER', paymentMode: mode, issueDate: date, voucherNumber: await nextNumber(tx, actor.tenantId, data.voucherType), createdBy: actor.name },
        });
    await postDepositAdjustment(tx, actor, v);
    await audit(tx, actor, { action: voucher ? 'VOUCHER_UPDATED' : 'VOUCHER_ISSUED', entityType: 'CylinderVoucher', entityId: v.id, reference: `${v.voucherNumber} · ${customer.name}`, newValue: data });
    if (v.status === 'ACTIVE' && v.paymentMode !== 'OPENING' && (!voucher || voucher.status !== 'ACTIVE')) received.push(v);
  }

  if (received.length && effects) depositMessage(effects, actor.tenantId, customer, received);
  return received;
}

/** WhatsApp / SMS confirmation for newly received deposits (one message for all cylinder types). */
export function depositMessage(effects: Effects, tenantId: string, customer: { name: string; phone: string; whatsappNumber: string | null; email: string | null }, vouchers: CylinderVoucher[]) {
  const amount = round2(vouchers.reduce((sum, v) => sum + v.depositAmount, 0));
  const cylinders = vouchers.reduce((sum, v) => sum + v.cylinderQty, 0);
  effects.add('deposit received message', () =>
    notifyCustomer(
      tenantId,
      customer,
      'DEPOSIT_RECEIVED',
      {
        amount: amount.toLocaleString('en-IN'),
        cylinders,
        details: vouchers.map((v) => `${v.cylinderQty} × ${v.productName || 'cylinder'}`).join(', '),
        voucherNumber: vouchers.map((v) => v.svNumber || v.voucherNumber).join(', '),
        date: vouchers[0].issueDate.split('-').reverse().join('-'),
      },
      'Cylinder security deposit receipt'
    )
  );
}

/**
 * A deposit adjusted against the customer's dues is a credit on their ledger.
 * Posts only the difference from what is already there, so it can be called
 * on every change (adjusted → active again reverses it).
 */
export async function postDepositAdjustment(tx: Tx, actor: Actor, v: CylinderVoucher) {
  const want = v.status === 'ADJUSTED' ? round2(v.depositAmount) : 0;
  const posted = await tx.ledgerEntry.aggregate({ where: { tenantId: v.tenantId, ledgerType: 'CUSTOMER', referenceType: 'CYL_DEPOSIT', referenceId: v.id }, _sum: { credit: true, debit: true } });
  const diff = round2(want - ((posted._sum.credit || 0) - (posted._sum.debit || 0)));
  if (!diff) return;
  const ref = v.svNumber ? `${v.voucherNumber} / ${v.svNumber}` : v.voucherNumber;
  await postCustomerLedger(tx, {
    tenantId: v.tenantId,
    customerId: v.customerId,
    entryType: 'ADJUSTMENT',
    credit: diff > 0 ? diff : 0,
    debit: diff < 0 ? -diff : 0,
    voucherNumber: v.voucherNumber,
    date: v.closedOn || businessDate(),
    particulars: diff > 0 ? `Cylinder security deposit adjusted against dues (${ref})` : `Cylinder deposit adjustment reversed (${ref})`,
    referenceType: 'CYL_DEPOSIT',
    referenceId: v.id,
    createdBy: actor.name,
  });
}

/** Keep the customer form's deposit card in step when a form-made voucher is edited on the voucher screen. */
export async function syncFormLine(db: Db, v: CylinderVoucher) {
  if (v.source !== 'CUSTOMER_MASTER' || !v.productId) return;
  const customer = await db.customer.findUnique({ where: { id: v.customerId }, select: { extra: true } });
  const extra = (customer?.extra as Row | null) || {};
  const lines = Array.isArray(extra.depositLines) ? (extra.depositLines as Row[]) : [];
  const status: LineStatus | 'Pending' = v.status === 'REFUNDED' ? 'Refunded' : v.status === 'ADJUSTED' ? 'Adjusted' : v.status === 'CANCELLED' ? 'Pending' : v.depositAmount ? 'Paid' : 'Free';
  const updated = lines.map((l) => (l.productId === v.productId ? { ...l, qty: v.cylinderQty, status, voucherNo: v.svNumber || undefined } : l));
  if (!lines.some((l) => l.productId === v.productId)) return;
  await db.customer.update({ where: { id: v.customerId }, data: { extra: { ...extra, depositLines: updated } as object } });
}
