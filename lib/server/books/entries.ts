import type { Tx } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { groupOf, GROUPS, MANUAL_VOUCHER_TYPES, VoucherType } from '@/lib/books';
import { audit, Actor } from '../audit';
import { assertDayOpen } from '../dayLocks';
import { addDays, badRequest, conflict, forbidden, notFound } from '../http';
import { cleanVehicleNumber, getDefaultWarehouse, moveStock, resolveLocation, StockLocation } from '../inventory';
import { isInterState } from '../pricing';
import { nextNumber } from '../sequence';
import { getSetting } from '../settings';
import { isStoredFile } from '../storage';
import { partyAccount } from './accounts';
import { settleFromAdvance, voucherPayments } from './plantBalance';
import { writeVoucher } from './vouchers';

// Entries made in Books: purchase bills (+ payments against them), expenses,
// manual Receipt / Payment / Contra / Journal vouchers and new ledgers.

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const MONEY_GROUPS = new Set(['Cash-in-Hand', 'Bank Accounts']);

function isDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// ───────────────────────── Purchase bills ─────────────────────────

export interface PurchaseBillInput {
  supplierId: string;
  supplierInvoiceNo: string;
  date: string;
  dueDate?: string | null;
  itcEligible?: boolean;
  receiveStock?: boolean;
  warehouseId?: string | null;
  /** Cylinders handed straight from the truck to delivery boys (rest goes to the godown). */
  stockSplit?: SplitLine[] | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  /** From an imported plant e-invoice. */
  einvoice?: { sapDocNo?: string | null; deliveryNo?: string | null; salesOrderNo?: string | null; irn?: string | null; irnDate?: string | null; einvoiceQr?: string | null; invoicePdfUrl?: string | null } | null;
  notes?: string | null;
  items: { productId?: string | null; materialCode?: string | null; description?: string; hsnCode?: string; quantity: number; unit?: string; rate: number; taxRate: number }[];
}

async function billLines(tx: Tx, tenantId: string, input: PurchaseBillInput, igst: boolean) {
  const lines = [];
  for (const i of input.items || []) {
    const quantity = Number(i.quantity) || 0;
    const rate = Number(i.rate) || 0;
    const taxRate = Number(i.taxRate) || 0;
    if (quantity <= 0 || rate < 0 || taxRate < 0 || taxRate > 40) throw badRequest('Each line needs a quantity, a rate and a GST rate between 0 and 40%.');
    const product = i.productId ? await tx.product.findFirst({ where: { id: i.productId, tenantId } }) : null;
    if (i.productId && !product) throw badRequest('Product not found.');
    const description = (i.description || product?.name || '').trim();
    if (!description) throw badRequest('Each line needs a product or a description.');
    const taxable = r2(quantity * rate);
    // CGST and SGST are each rounded on the taxable value, as on the supplier's invoice.
    const half = r2((taxable * taxRate) / 200);
    const tax = igst ? r2((taxable * taxRate) / 100) : r2(half * 2);
    lines.push({
      productId: product?.id ?? null,
      description,
      hsnCode: (i.hsnCode || product?.hsnCode || '').trim(),
      materialCode: i.materialCode?.trim().toUpperCase() || null,
      quantity,
      unit: (i.unit || product?.unit || 'PCS').trim(),
      rate,
      taxRate,
      taxableAmount: taxable,
      cgstAmount: igst ? 0 : half,
      sgstAmount: igst ? 0 : half,
      igstAmount: igst ? tax : 0,
      totalAmount: r2(taxable + tax),
    });
  }
  if (!lines.length) throw badRequest('Add at least one item to the bill.');
  return lines;
}

function billTotals(lines: { taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number }[]) {
  const sum = (k: 'taxableAmount' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'totalAmount') => r2(lines.reduce((s, l) => s + l[k], 0));
  const exact = sum('totalAmount');
  const grandTotal = Math.round(exact);
  return { subTotal: sum('taxableAmount'), totalCgst: sum('cgstAmount'), totalSgst: sum('sgstAmount'), totalIgst: sum('igstAmount'), roundOff: r2(grandTotal - exact), grandTotal };
}

export interface SplitLine { deliveryBoyId: string; productId: string; qty: number }

/** Clean a truck split from the request: whole, positive quantities only. */
export function cleanSplit(v: unknown): SplitLine[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => ({ deliveryBoyId: String((s as SplitLine)?.deliveryBoyId || ''), productId: String((s as SplitLine)?.productId || ''), qty: Number((s as SplitLine)?.qty) || 0 }))
    .filter((s) => s.deliveryBoyId && s.productId && s.qty > 0)
    .map((s) => {
      if (!Number.isInteger(s.qty)) throw badRequest('Cylinders handed to delivery boys must be whole numbers.');
      return s;
    });
}

/**
 * Bring a bill's cylinders in from the plant (or take them back out when
 * `reverse`). Cylinders in `split` go straight off the truck to those delivery
 * boys; the rest goes to the godown. Reversing fails if a delivery boy no
 * longer holds what he was given.
 */
async function receiveBillStock(
  tx: Tx,
  actor: Actor,
  bill: { id: string; billNumber: string; supplierId: string; supplierName: string; vehicleNumber: string | null; driverName: string | null },
  warehouseId: string | null | undefined,
  items: { productId: string | null; description: string; quantity: number }[],
  reverse: boolean,
  split: SplitLine[] = []
): Promise<{ received: boolean; warehouseId: string | null }> {
  const totals = new Map<string, { name: string; qty: number }>();
  for (const i of items) {
    if (!i.productId || !Number.isInteger(i.quantity)) continue;
    const t = totals.get(i.productId);
    totals.set(i.productId, { name: t?.name || i.description, qty: (t?.qty || 0) + i.quantity });
  }
  if (!totals.size) return { received: false, warehouseId: null };

  // Who gets what off the truck; the remainder per product goes to the godown.
  const byBoy = new Map<string, Map<string, number>>();
  const handed = new Map<string, number>();
  for (const s of split) {
    if (!totals.has(s.productId)) throw badRequest('A cylinder handed to a delivery boy is not on this bill.');
    const boy = byBoy.get(s.deliveryBoyId) || new Map<string, number>();
    boy.set(s.productId, (boy.get(s.productId) || 0) + s.qty);
    byBoy.set(s.deliveryBoyId, boy);
    handed.set(s.productId, (handed.get(s.productId) || 0) + s.qty);
  }
  for (const [productId, qty] of handed) {
    const t = totals.get(productId)!;
    if (qty > t.qty) throw badRequest(`${qty} × ${t.name} handed to delivery boys, but the bill has only ${t.qty}.`);
  }

  // The supplier stands in for the plant so the stock ledger shows who sent the load.
  const plant = { type: 'PLANT' as const, id: bill.supplierId, name: bill.supplierName };
  const move = (place: StockLocation, lines: { productId: string; qty: number }[]) =>
    moveStock(tx, {
      tenantId: actor.tenantId,
      type: reverse ? 'REVERSAL' : 'PURCHASE_RECEIPT',
      from: reverse ? place : plant,
      to: reverse ? plant : place,
      lines: lines.map((l) => ({ productId: l.productId, productName: totals.get(l.productId)!.name, fullQty: l.qty, emptyQty: 0 })),
      referenceType: 'PURCHASE',
      referenceId: bill.id,
      referenceNumber: bill.billNumber,
      reason: reverse ? `Purchase bill ${bill.billNumber} cancelled` : `Purchase bill ${bill.billNumber}${place.type === 'DELIVERY_BOY' ? ' · straight from the truck' : ''}`,
      vehicleNumber: bill.vehicleNumber,
      driverName: bill.driverName,
      performedBy: actor.name,
    });

  for (const [boyId, lines] of byBoy) {
    // On reversal the boy may have left since; find him even if inactive.
    await move(await resolveLocation(tx, actor.tenantId, 'DELIVERY_BOY', boyId), [...lines].map(([productId, qty]) => ({ productId, qty })));
  }
  const rest = [...totals].map(([productId, t]) => ({ productId, qty: t.qty - (handed.get(productId) || 0) })).filter((l) => l.qty > 0);
  if (!rest.length) return { received: true, warehouseId: null };
  const warehouse = warehouseId ? await resolveLocation(tx, actor.tenantId, 'WAREHOUSE', warehouseId) : await (async () => {
    const w = await getDefaultWarehouse(tx, actor.tenantId);
    return { type: 'WAREHOUSE' as const, id: w.id, name: w.name };
  })();
  await move(warehouse, rest);
  return { received: true, warehouseId: warehouse.id };
}

/** Remember the oil company's material code on our product, so the next invoice matches by code. */
async function learnMaterialCodes(tx: Tx, tenantId: string, lines: { productId: string | null; materialCode: string | null }[]) {
  for (const l of lines) {
    if (l.productId && l.materialCode) await tx.product.updateMany({ where: { id: l.productId, tenantId, OR: [{ materialCode: null }, { materialCode: '' }] }, data: { materialCode: l.materialCode } });
  }
}

export async function savePurchaseBill(tx: Tx, actor: Actor, input: PurchaseBillInput, billId?: string | null) {
  if (!isDate(input.date)) throw badRequest('Choose the bill date.');
  const supplierInvoiceNo = String(input.supplierInvoiceNo || '').trim();
  if (!supplierInvoiceNo) throw badRequest("Enter the supplier's invoice number.");
  const supplier = await tx.customer.findFirst({ where: { id: input.supplierId, tenantId: actor.tenantId } });
  if (!supplier) throw badRequest('Choose the supplier (Party Master → Plants / suppliers).');
  await assertDayOpen(tx, actor.tenantId, input.date);
  const company = await getSetting(actor.tenantId, 'company');
  const igst = isInterState(company.stateCode, supplier.stateCode, supplier.gstin);
  const lines = await billLines(tx, actor.tenantId, input, igst);
  const totals = billTotals(lines);
  const dup = await tx.purchaseBill.findFirst({ where: { tenantId: actor.tenantId, supplierId: supplier.id, supplierInvoiceNo, status: { not: 'Cancelled' }, NOT: billId ? { id: billId } : undefined } });
  if (dup) throw conflict(`Supplier bill ${supplierInvoiceNo} is already entered as ${dup.billNumber}.`);
  const ei = input.einvoice;
  const einvoice = ei
    ? {
        sapDocNo: ei.sapDocNo?.trim() || null,
        deliveryNo: ei.deliveryNo?.trim() || null,
        salesOrderNo: ei.salesOrderNo?.trim() || null,
        irn: ei.irn?.trim().toLowerCase() || null,
        irnDate: ei.irnDate?.trim() || null,
        einvoiceQr: ei.einvoiceQr?.trim() || null,
        invoicePdfUrl: isStoredFile(ei.invoicePdfUrl) ? ei.invoicePdfUrl! : null,
      }
    : null;
  // The same e-invoice (IRN / SAP document) can't be entered twice, whatever invoice no. was typed.
  const sameDoc = einvoice && (einvoice.irn || einvoice.sapDocNo) ? await tx.purchaseBill.findFirst({ where: { tenantId: actor.tenantId, status: { not: 'Cancelled' }, NOT: billId ? { id: billId } : undefined, OR: [einvoice.irn ? { irn: einvoice.irn } : null, einvoice.sapDocNo ? { sapDocNo: einvoice.sapDocNo } : null].filter((x) => x !== null) } }) : null;
  if (sameDoc) throw conflict(`This invoice (${einvoice!.sapDocNo ? `SAP doc ${einvoice!.sapDocNo}` : 'same IRN'}) is already entered as ${sameDoc.billNumber}.`);
  const header = {
    ...(einvoice ?? {}),
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierGstin: supplier.gstin || null,
    supplierInvoiceNo,
    date: input.date,
    dueDate: isDate(input.dueDate) ? input.dueDate : addDays(input.date, supplier.creditDays ?? 0),
    isIgst: igst,
    itcEligible: input.itcEligible !== false,
    vehicleNumber: cleanVehicleNumber(input.vehicleNumber),
    driverName: input.driverName?.trim() || null,
    notes: input.notes?.trim() || null,
    ...totals,
  };
  await partyAccount(tx, supplier);

  if (billId) {
    const existing = await tx.purchaseBill.findFirst({ where: { id: billId, tenantId: actor.tenantId }, include: { items: true } });
    if (!existing) throw notFound('Purchase bill not found.');
    if (existing.status === 'Cancelled') throw conflict('A cancelled bill cannot be edited.');
    await assertDayOpen(tx, actor.tenantId, existing.date);
    // Payments made against this bill stay with it, so the bill can't drop below them.
    const viaVoucher = (await voucherPayments(tx, existing.supplierId, [existing.id])).get(existing.id) || 0;
    if (viaVoucher > 0.01 && existing.supplierId !== supplier.id) throw conflict('Payments are made against this bill to the old supplier — the supplier cannot be changed. Delete the bill and enter a new one.');
    if (viaVoucher > totals.grandTotal + 0.5) throw conflict(`₹${viaVoucher.toLocaleString('en-IN')} is already paid against this bill — the new total cannot be less than that.`);
    // Stock: take the old receipt back out and receive the edited lines, unless nothing changed.
    const keepStock = input.receiveStock ?? existing.stockReceived;
    const sig = (items: { productId: string | null; quantity: number }[]) => items.filter((i) => i.productId).map((i) => `${i.productId}:${i.quantity}`).sort().join('|');
    const warehouseId = input.warehouseId || existing.warehouseId;
    const oldSplit = cleanSplit(existing.stockSplit);
    const split = input.stockSplit ? cleanSplit(input.stockSplit) : oldSplit;
    const splitSig = (s: SplitLine[]) => s.map((x) => `${x.deliveryBoyId}:${x.productId}:${x.qty}`).sort().join('|');
    const stockSame = existing.stockReceived && keepStock && existing.supplierId === supplier.id && warehouseId === existing.warehouseId && sig(existing.items) === sig(lines) && splitSig(split) === splitSig(oldSplit);
    if (existing.stockReceived && !stockSame) await receiveBillStock(tx, actor, existing, existing.warehouseId, existing.items, true, oldSplit);
    await tx.purchaseBillItem.deleteMany({ where: { billId } });
    await tx.purchaseBill.update({ where: { id: billId }, data: { ...header, items: { create: lines } } });
    if (!stockSame) {
      const edited = await tx.purchaseBill.findUniqueOrThrow({ where: { id: billId }, include: { items: true } });
      const got = keepStock ? await receiveBillStock(tx, actor, edited, warehouseId, edited.items, false, split) : { received: false, warehouseId: null };
      await tx.purchaseBill.update({ where: { id: billId }, data: { stockReceived: got.received, warehouseId: got.warehouseId, stockSplit: got.received && split.length ? (split as unknown as Prisma.InputJsonValue) : Prisma.DbNull } });
    }
    // The supplier may have changed: re-spread both suppliers' plant balance.
    await settleFromAdvance(tx, actor.tenantId, supplier.id);
    if (existing.supplierId !== supplier.id) await settleFromAdvance(tx, actor.tenantId, existing.supplierId);
    await learnMaterialCodes(tx, actor.tenantId, lines);
    const bill = await tx.purchaseBill.findUniqueOrThrow({ where: { id: billId }, include: { items: true } });
    await audit(tx, actor, { action: 'PURCHASE_BILL_EDITED', entityType: 'PurchaseBill', entityId: bill.id, reference: bill.billNumber, oldValue: { total: existing.grandTotal }, newValue: { total: bill.grandTotal } });
    return bill;
  }

  const billNumber = await nextNumber(tx, actor.tenantId, 'PB');
  let bill = await tx.purchaseBill.create({ data: { tenantId: actor.tenantId, billNumber, createdBy: actor.name, ...header, items: { create: lines } }, include: { items: true } });
  if (input.receiveStock) {
    const split = cleanSplit(input.stockSplit);
    const got = await receiveBillStock(tx, actor, bill, input.warehouseId, bill.items, false, split);
    if (got.received) await tx.purchaseBill.update({ where: { id: bill.id }, data: { stockReceived: true, warehouseId: got.warehouseId, stockSplit: split.length ? (split as unknown as Prisma.InputJsonValue) : Prisma.DbNull } });
  }
  // Paid straight from the plant balance when money is lying with the supplier.
  await settleFromAdvance(tx, actor.tenantId, supplier.id);
  await learnMaterialCodes(tx, actor.tenantId, lines);
  bill = await tx.purchaseBill.findUniqueOrThrow({ where: { id: bill.id }, include: { items: true } });
  await audit(tx, actor, { action: 'PURCHASE_BILL_CREATED', entityType: 'PurchaseBill', entityId: bill.id, reference: `${bill.billNumber} / ${supplierInvoiceNo}`, newValue: { supplier: supplier.name, total: bill.grandTotal, stockReceived: bill.stockReceived } });
  return bill;
}

export async function cancelPurchaseBill(tx: Tx, actor: Actor, billId: string, reason: string) {
  const bill = await tx.purchaseBill.findFirst({ where: { id: billId, tenantId: actor.tenantId }, include: { items: true } });
  if (!bill) throw notFound('Purchase bill not found.');
  await assertDayOpen(tx, actor.tenantId, bill.date);
  const notes = await tx.debitNote.count({ where: { tenantId: actor.tenantId, purchaseBillId: bill.id, status: 'Active' } });
  if (notes) throw conflict('A debit note (purchase return) is made against this bill — cancel it first.');
  const tds = await tx.tdsEntry.count({ where: { tenantId: actor.tenantId, referenceType: 'PURCHASE_BILL', referenceId: bill.id, cancelled: false } });
  if (tds) throw conflict('A TDS entry is made against this bill — cancel it first (Books → TDS).');
  if (bill.status !== 'Cancelled') {
    // Money already paid against this bill is not lost: it stays with the supplier as plant balance (advance).
    await tx.accountVoucher.updateMany({ where: { againstBillId: bill.id }, data: { againstBillId: null } });
    if (bill.stockReceived) await receiveBillStock(tx, actor, bill, bill.warehouseId, bill.items, true, cleanSplit(bill.stockSplit));
  }
  // Deleted for good: the bill, its purchase voucher and its (now netted-out) stock movements.
  // The audit log keeps a copy of what was deleted.
  await tx.inventoryTransaction.deleteMany({ where: { tenantId: actor.tenantId, referenceType: 'PURCHASE', referenceId: bill.id } });
  await tx.accountVoucher.deleteMany({ where: { tenantId: actor.tenantId, sourceType: 'PURCHASE_BILL', sourceId: bill.id } });
  await tx.purchaseBill.delete({ where: { id: bill.id } });
  // Advance used on this bill goes back to the plant balance for the other bills.
  await settleFromAdvance(tx, actor.tenantId, bill.supplierId);
  await audit(tx, actor, { action: 'PURCHASE_BILL_DELETED', entityType: 'PurchaseBill', entityId: bill.id, reference: `${bill.billNumber} / ${bill.supplierInvoiceNo}`, reason, sensitive: true, oldValue: { supplier: bill.supplierName, date: bill.date, total: bill.grandTotal, status: bill.status, items: bill.items.map((i) => `${i.quantity} × ${i.description} @ ${i.rate}`) } });
}

// ───────────────────────── Expenses ─────────────────────────

export interface ExpenseInput {
  date: string;
  headName: string;
  description?: string | null;
  amount: number;
  gstRate?: number;
  paidFrom: 'CASH' | 'BANK' | 'CREDIT';
  paidAccountId?: string | null;
  supplierId?: string | null;
  supplierGstin?: string | null;
  billNumber?: string | null;
  attachmentUrl?: string | null;
}

export async function saveExpense(tx: Tx, actor: Actor, input: ExpenseInput, expenseId?: string | null) {
  if (!isDate(input.date)) throw badRequest('Choose the expense date.');
  const headName = String(input.headName || '').trim();
  if (!headName) throw badRequest('Choose the expense head.');
  const amount = r2(Number(input.amount) || 0);
  if (amount <= 0) throw badRequest('Enter the expense amount.');
  const gstRate = Number(input.gstRate) || 0;
  if (gstRate < 0 || gstRate > 40) throw badRequest('GST rate must be between 0 and 40%.');
  if (!['CASH', 'BANK', 'CREDIT'].includes(input.paidFrom)) throw badRequest('Choose how it was paid.');
  await assertDayOpen(tx, actor.tenantId, input.date);

  let supplier = null;
  if (input.paidFrom === 'CREDIT') {
    supplier = input.supplierId ? await tx.customer.findFirst({ where: { id: input.supplierId, tenantId: actor.tenantId } }) : null;
    if (!supplier) throw badRequest('Choose the supplier for an expense on credit.');
  }
  if (input.paidFrom !== 'CREDIT' && input.paidAccountId) {
    const acc = await tx.ledgerAccount.findFirst({ where: { id: input.paidAccountId, tenantId: actor.tenantId } });
    if (!acc || !MONEY_GROUPS.has(acc.groupName)) throw badRequest('Paid-from must be a cash or bank ledger.');
  }
  const company = await getSetting(actor.tenantId, 'company');
  const gstin = (input.supplierGstin || supplier?.gstin || '').trim().toUpperCase() || null;
  const gstAmount = r2((amount * gstRate) / 100);
  const data = {
    date: input.date,
    headName,
    description: input.description?.trim() || null,
    amount,
    gstRate,
    gstAmount,
    isIgst: gstin ? isInterState(company.stateCode, null, gstin) : false,
    totalAmount: r2(amount + gstAmount),
    paidFrom: input.paidFrom,
    paidAccountId: input.paidFrom === 'CREDIT' ? null : input.paidAccountId || null,
    supplierId: supplier?.id ?? null,
    supplierName: supplier?.name ?? null,
    supplierGstin: gstin,
    billNumber: input.billNumber?.trim() || null,
    attachmentUrl: input.attachmentUrl || null,
  };
  if (expenseId) {
    const existing = await tx.expenseEntry.findFirst({ where: { id: expenseId, tenantId: actor.tenantId } });
    if (!existing) throw notFound('Expense not found.');
    if (existing.cancelled) throw conflict('A cancelled expense cannot be edited.');
    await assertDayOpen(tx, actor.tenantId, existing.date);
    const saved = await tx.expenseEntry.update({ where: { id: expenseId }, data });
    await audit(tx, actor, { action: 'EXPENSE_EDITED', entityType: 'ExpenseEntry', entityId: saved.id, reference: saved.entryNumber, oldValue: { total: existing.totalAmount, head: existing.headName }, newValue: { total: saved.totalAmount, head: saved.headName } });
    return saved;
  }
  const entryNumber = await nextNumber(tx, actor.tenantId, 'EXP');
  const saved = await tx.expenseEntry.create({ data: { tenantId: actor.tenantId, entryNumber, createdBy: actor.name, ...data } });
  await audit(tx, actor, { action: 'EXPENSE_CREATED', entityType: 'ExpenseEntry', entityId: saved.id, reference: saved.entryNumber, newValue: { head: headName, total: saved.totalAmount, paidFrom: saved.paidFrom } });
  return saved;
}

export async function cancelExpense(tx: Tx, actor: Actor, expenseId: string, reason: string) {
  const x = await tx.expenseEntry.findFirst({ where: { id: expenseId, tenantId: actor.tenantId } });
  if (!x) throw notFound('Expense not found.');
  if (x.cancelled) throw conflict('Expense is already cancelled.');
  await assertDayOpen(tx, actor.tenantId, x.date);
  await tx.expenseEntry.update({ where: { id: x.id }, data: { cancelled: true, description: `${x.description ? `${x.description} · ` : ''}Cancelled: ${reason}` } });
  await audit(tx, actor, { action: 'EXPENSE_CANCELLED', entityType: 'ExpenseEntry', entityId: x.id, reference: x.entryNumber, reason, sensitive: true });
}

// ───────────────────────── Manual vouchers ─────────────────────────

export interface ManualVoucherInput {
  voucherType: VoucherType;
  date: string;
  narration?: string | null;
  againstBillId?: string | null;
  lines: { accountId: string; debit?: number; credit?: number }[];
}

export async function createManualVoucher(tx: Tx, actor: Actor, input: ManualVoucherInput) {
  if (!MANUAL_VOUCHER_TYPES.includes(input.voucherType)) throw badRequest('Choose Receipt, Payment, Contra or Journal.');
  if (!isDate(input.date)) throw badRequest('Choose the voucher date.');
  await assertDayOpen(tx, actor.tenantId, input.date);
  const lines = (input.lines || []).map((l) => ({ accountId: String(l.accountId || ''), debit: r2(Number(l.debit) || 0), credit: r2(Number(l.credit) || 0) })).filter((l) => l.accountId && (l.debit || l.credit));
  if (lines.some((l) => l.debit < 0 || l.credit < 0 || (l.debit && l.credit))) throw badRequest('Each line is either a debit or a credit, never both or negative.');
  const accounts = await tx.ledgerAccount.findMany({ where: { tenantId: actor.tenantId, id: { in: lines.map((l) => l.accountId) } } });
  if (accounts.length !== new Set(lines.map((l) => l.accountId)).size) throw badRequest('One of the ledgers was not found.');
  const acc = new Map(accounts.map((a) => [a.id, a]));

  // Customer dues are kept in the customer ledger (with approvals) — never here.
  for (const a of accounts) {
    if (a.groupName === 'Sundry Debtors' && a.partyId) {
      throw badRequest(`${a.name} is a customer. Record customer payments in Accounts → Payments and adjustments in Ledgers (with approval).`);
    }
    if (!a.active) throw badRequest(`${a.name} is inactive.`);
  }
  const money = lines.filter((l) => MONEY_GROUPS.has(acc.get(l.accountId)!.groupName));
  if (input.voucherType === 'RECEIPT' && !money.some((l) => l.debit)) throw badRequest('A receipt must debit a cash or bank ledger.');
  if (input.voucherType === 'PAYMENT' && !money.some((l) => l.credit)) throw badRequest('A payment must credit a cash or bank ledger.');
  if (input.voucherType === 'CONTRA' && money.length !== lines.length) throw badRequest('A contra moves money between cash and bank ledgers only.');
  if (input.voucherType === 'JOURNAL' && money.length) throw badRequest('Use Receipt, Payment or Contra when cash or bank is involved.');

  let bill = null;
  if (input.againstBillId) {
    bill = await tx.purchaseBill.findFirst({ where: { id: input.againstBillId, tenantId: actor.tenantId } });
    if (!bill || bill.status === 'Cancelled') throw badRequest('Purchase bill not found.');
    if (input.voucherType !== 'PAYMENT') throw badRequest('Only a payment can be made against a bill.');
    const supplierLine = lines.find((l) => acc.get(l.accountId)!.partyId === bill!.supplierId && l.debit);
    if (!supplierLine) throw badRequest("A bill payment must debit the supplier's ledger.");
    const due = r2(bill.grandTotal - bill.paidAmount);
    if (supplierLine.debit > due + 0.01) throw badRequest(`Only ₹${due.toFixed(2)} is due on ${bill.billNumber}.`);
  }

  const partyName = accounts.find((a) => a.partyId)?.name || accounts.find((a) => !MONEY_GROUPS.has(a.groupName))?.name || null;
  const voucher = await writeVoucher(tx, { tenantId: actor.tenantId, voucherType: input.voucherType, date: input.date, partyName, narration: input.narration?.trim() || null, sourceType: 'MANUAL', againstBillId: bill?.id ?? null, createdBy: actor.name, lines });
  await settleSuppliers(tx, actor.tenantId, voucher.id);
  await audit(tx, actor, { action: 'VOUCHER_CREATED', entityType: 'AccountVoucher', entityId: voucher.id, reference: voucher.voucherNumber, newValue: { type: voucher.voucherType, amount: voucher.amount, date: voucher.date } });
  return voucher;
}

/** Refresh a bill's paid amount and status (payments against it, then plant balance). */
export async function applyBillPayment(tx: Tx, billId: string) {
  const bill = await tx.purchaseBill.findUnique({ where: { id: billId }, select: { tenantId: true, supplierId: true } });
  if (bill) await settleFromAdvance(tx, bill.tenantId, bill.supplierId);
}

/** Re-spread the plant balance of every supplier a voucher touches. */
async function settleSuppliers(tx: Tx, tenantId: string, voucherId: string) {
  const lines = await tx.accountVoucherLine.findMany({ where: { voucherId, account: { groupName: 'Sundry Creditors', partyId: { not: null } } }, select: { account: { select: { partyId: true } } } });
  for (const partyId of new Set(lines.map((l) => l.account.partyId!))) await settleFromAdvance(tx, tenantId, partyId);
}

export async function cancelManualVoucher(tx: Tx, actor: Actor, voucherId: string, reason: string) {
  const v = await tx.accountVoucher.findFirst({ where: { id: voucherId, tenantId: actor.tenantId } });
  if (!v) throw notFound('Voucher not found.');
  if (v.sourceType !== 'MANUAL') throw forbidden('This voucher comes from a document — cancel the invoice, payment, bill or expense instead.');
  if (v.cancelled) throw conflict('Voucher is already cancelled.');
  await assertDayOpen(tx, actor.tenantId, v.date);
  await tx.accountVoucher.update({ where: { id: v.id }, data: { cancelled: true, narration: `${v.narration ? `${v.narration} · ` : ''}Cancelled: ${reason}` } });
  await settleSuppliers(tx, actor.tenantId, v.id);
  await audit(tx, actor, { action: 'VOUCHER_CANCELLED', entityType: 'AccountVoucher', entityId: v.id, reference: v.voucherNumber, reason, sensitive: true });
}

// ───────────────────────── Ledgers ─────────────────────────

export async function saveLedger(tx: Tx, actor: Actor, input: { id?: string | null; name: string; groupName: string; openingBalance?: number; gstin?: string | null; notes?: string | null; active?: boolean }) {
  const name = String(input.name || '').trim();
  if (!name) throw badRequest('Enter the ledger name.');
  const group = groupOf(input.groupName);
  if (!group) throw badRequest(`Choose a group: ${GROUPS.map((g) => g.name).join(', ')}.`);
  const clash = await tx.ledgerAccount.findFirst({ where: { tenantId: actor.tenantId, name: { equals: name, mode: 'insensitive' }, NOT: input.id ? { id: input.id } : undefined } });
  if (clash) throw conflict(`A ledger called ${clash.name} already exists.`);
  const data = { name, groupName: group.name, nature: group.nature, openingBalance: r2(Number(input.openingBalance) || 0), gstin: input.gstin?.trim().toUpperCase() || null, notes: input.notes?.trim() || null, active: input.active !== false };
  if (input.id) {
    const existing = await tx.ledgerAccount.findFirst({ where: { id: input.id, tenantId: actor.tenantId } });
    if (!existing) throw notFound('Ledger not found.');
    // System / master ledgers keep their name and group (they are driven by their masters).
    const edit = existing.isSystem ? { openingBalance: existing.partyId ? existing.openingBalance : data.openingBalance, notes: data.notes } : data;
    const saved = await tx.ledgerAccount.update({ where: { id: existing.id }, data: edit });
    await audit(tx, actor, { action: 'LEDGER_EDITED', entityType: 'LedgerAccount', entityId: saved.id, reference: saved.name, oldValue: { name: existing.name, group: existing.groupName, opening: existing.openingBalance }, newValue: { name: saved.name, group: saved.groupName, opening: saved.openingBalance }, sensitive: existing.openingBalance !== saved.openingBalance });
    return saved;
  }
  const code = await nextNumber(tx, actor.tenantId, 'LED');
  const saved = await tx.ledgerAccount.create({ data: { tenantId: actor.tenantId, code, ...data } });
  await audit(tx, actor, { action: 'LEDGER_CREATED', entityType: 'LedgerAccount', entityId: saved.id, reference: saved.name, newValue: data });
  return saved;
}
