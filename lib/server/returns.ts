import type { Tx } from '@/lib/db';
import { audit, Actor } from './audit';
import { assertDayOpen } from './dayLocks';
import { badRequest, conflict, notFound, round2 } from './http';
import { customerReturnsFull, getDefaultWarehouse, moveStock, resolveLocation, StockLocation } from './inventory';
import { postCustomerLedger } from './ledger';
import { isInterState, splitGst } from './pricing';
import { nextInvoiceNumber, nextNumber } from './sequence';
import { getSetting } from './settings';

// GST credit notes (sales returns / rate reductions to customers) and debit
// notes (purchase returns to the plant / suppliers). A credit note posts to the
// customer ledger (and from there to the books); a debit note is a document the
// books pick up directly. Stock moves back when cylinders physically return.

const MONEY_GROUPS = new Set(['Cash-in-Hand', 'Bank Accounts']);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const sum = <T,>(rows: T[], f: (r: T) => number) => round2(rows.reduce((s, r) => s + f(r), 0));

async function warehouseOf(tx: Tx, tenantId: string, warehouseId?: string | null): Promise<StockLocation> {
  if (warehouseId) return resolveLocation(tx, tenantId, 'WAREHOUSE', warehouseId);
  const w = await getDefaultWarehouse(tx, tenantId);
  return { type: 'WAREHOUSE', id: w.id, name: w.name };
}

function totals(lines: { taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number }[]) {
  const exact = sum(lines, (l) => l.totalAmount);
  const grandTotal = Math.round(exact);
  return { subTotal: sum(lines, (l) => l.taxableAmount), totalCgst: sum(lines, (l) => l.cgstAmount), totalSgst: sum(lines, (l) => l.sgstAmount), totalIgst: sum(lines, (l) => l.igstAmount), roundOff: round2(grandTotal - exact), grandTotal };
}

// ───────────────────────── Credit notes ─────────────────────────

export const CREDIT_REASONS = ['RETURN', 'RATE_DIFFERENCE', 'DAMAGED', 'OTHER'] as const;

export interface CreditNoteInput {
  date: string;
  customerId: string;
  invoiceId?: string | null;
  reason: (typeof CREDIT_REASONS)[number];
  /** Full cylinders physically come back into the godown. */
  returnStock?: boolean;
  warehouseId?: string | null;
  refundMode?: 'NONE' | 'CASH' | 'BANK';
  refundAccountId?: string | null;
  refundAmount?: number;
  notes?: string | null;
  /** GST-inclusive rate per unit, like invoice lines. */
  items: { productId?: string | null; productName?: string; hsnCode?: string; quantity: number; unit?: string; rate: number; taxRate: number }[];
}

export async function createCreditNote(tx: Tx, actor: Actor, input: CreditNoteInput) {
  if (!isDate(input.date)) throw badRequest('Choose the credit note date.');
  if (!CREDIT_REASONS.includes(input.reason)) throw badRequest('Choose the reason.');
  await assertDayOpen(tx, actor.tenantId, input.date);
  const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId: actor.tenantId, type: 'Customer' } });
  if (!customer) throw badRequest('Choose the customer.');
  const invoice = input.invoiceId ? await tx.invoice.findFirst({ where: { id: input.invoiceId, tenantId: actor.tenantId }, include: { items: true } }) : null;
  if (input.invoiceId && !invoice) throw badRequest('Invoice not found.');
  if (invoice && invoice.customerId !== customer.id) throw badRequest('That invoice belongs to another customer.');
  if (invoice?.status === 'Cancelled') throw badRequest('The invoice is cancelled — nothing to credit.');
  if (invoice && invoice.date > input.date) throw badRequest('A credit note cannot be dated before its invoice.');

  const company = await getSetting(actor.tenantId, 'company');
  const igst = invoice ? invoice.isIgst : isInterState(company.stateCode, customer.stateCode, customer.gstin);
  const lines = [];
  for (const i of input.items || []) {
    const quantity = Number(i.quantity) || 0;
    const rate = Number(i.rate) || 0;
    const taxRate = Number(i.taxRate) || 0;
    if (quantity <= 0 || rate <= 0 || taxRate < 0 || taxRate > 40) throw badRequest('Each line needs a quantity, a rate and a GST rate.');
    const product = i.productId ? await tx.product.findFirst({ where: { id: i.productId, tenantId: actor.tenantId } }) : null;
    if (i.productId && !product) throw badRequest('Product not found.');
    const total = round2(quantity * rate);
    const g = splitGst(total, taxRate, igst);
    lines.push({ productId: product?.id ?? null, productName: (i.productName || product?.name || '').trim() || 'Item', hsnCode: (i.hsnCode || product?.hsnCode || '').trim(), quantity, unit: (i.unit || product?.unit || 'PCS').trim(), rate, taxRate, taxableAmount: g.taxable, cgstAmount: g.cgst, sgstAmount: g.sgst, igstAmount: g.igst, totalAmount: total });
  }
  if (!lines.length) throw badRequest('Add at least one line.');
  const t = totals(lines);

  // Never credit more than was billed (across all active credit notes of the invoice).
  if (invoice) {
    const earlier = await tx.creditNote.findMany({ where: { tenantId: actor.tenantId, invoiceId: invoice.id, status: 'Active' }, include: { items: true } });
    const credited = sum(earlier, (n) => n.grandTotal);
    if (input.reason === 'RETURN' || input.returnStock) {
      for (const l of lines.filter((x) => x.productId)) {
        const billed = invoice.items.filter((x) => x.productId === l.productId).reduce((s, x) => s + x.quantity, 0);
        const back = earlier.filter((n) => n.stockReturned).flatMap((n) => n.items).filter((x) => x.productId === l.productId).reduce((s, x) => s + x.quantity, 0);
        if (l.quantity + back > billed) throw badRequest(`${l.productName}: only ${billed - back} can be returned against ${invoice.invoiceNumber}.`);
      }
    }
    if (credited + t.grandTotal > invoice.grandTotal + 0.5) throw badRequest(`Only ₹${round2(invoice.grandTotal - credited).toFixed(2)} of ${invoice.invoiceNumber} is left to credit.`);
  }

  const refundMode = input.refundMode || 'NONE';
  const refundAmount = refundMode === 'NONE' ? 0 : round2(Number(input.refundAmount) || 0);
  let refundAccount = null;
  if (refundMode !== 'NONE') {
    if (refundAmount <= 0 || refundAmount > t.grandTotal) throw badRequest('Refund must be more than zero and at most the credit note amount.');
    refundAccount = input.refundAccountId ? await tx.ledgerAccount.findFirst({ where: { id: input.refundAccountId, tenantId: actor.tenantId } }) : null;
    if (!refundAccount || !MONEY_GROUPS.has(refundAccount.groupName)) throw badRequest('Choose the cash or bank ledger the refund is paid from.');
    if ((refundMode === 'CASH') !== (refundAccount.groupName === 'Cash-in-Hand')) throw badRequest(refundMode === 'CASH' ? 'Choose a cash ledger for a cash refund.' : 'Choose a bank ledger for a bank refund.');
  }

  const noteNumber = await nextInvoiceNumber(tx, actor.tenantId, input.date, 'CN');
  const returnStock = !!input.returnStock && lines.some((l) => l.productId && Number.isInteger(l.quantity));
  const warehouse = returnStock ? await warehouseOf(tx, actor.tenantId, input.warehouseId) : null;
  const note = await tx.creditNote.create({
    data: {
      tenantId: actor.tenantId,
      noteNumber,
      date: input.date,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.invoiceNumber ?? null,
      invoiceDate: invoice?.date ?? null,
      customerId: customer.id,
      customerName: customer.name,
      customerGstin: customer.gstin || null,
      reason: input.reason,
      isIgst: igst,
      ...t,
      stockReturned: returnStock,
      warehouseId: warehouse?.id ?? null,
      refundAmount,
      refundMode,
      refundAccountId: refundAccount?.id ?? null,
      notes: input.notes?.trim() || null,
      createdBy: actor.name,
      items: { create: lines },
    },
    include: { items: true },
  });

  if (returnStock && warehouse) {
    await customerReturnsFull(tx, { tenantId: actor.tenantId, customer, warehouse, lines: note.items.filter((l) => l.productId && Number.isInteger(l.quantity)).map((l) => ({ productId: l.productId!, productName: l.productName, fullQty: l.quantity })), referenceId: note.id, referenceNumber: noteNumber, performedBy: actor.name });
  }
  await postCustomerLedger(tx, {
    tenantId: actor.tenantId,
    customerId: customer.id,
    entryType: 'CREDIT_NOTE',
    credit: note.grandTotal,
    voucherNumber: noteNumber,
    date: input.date,
    particulars: `Credit note ${noteNumber}${invoice ? ` against ${invoice.invoiceNumber}` : ''} (${input.reason.replace('_', ' ').toLowerCase()})`,
    referenceType: 'CREDIT_NOTE',
    referenceId: note.id,
    createdBy: actor.name,
  });
  if (refundAmount > 0) {
    await postCustomerLedger(tx, {
      tenantId: actor.tenantId,
      customerId: customer.id,
      entryType: 'REFUND',
      debit: refundAmount,
      voucherNumber: noteNumber,
      date: input.date,
      particulars: `Refund paid (${refundMode.toLowerCase()}) for ${noteNumber}`,
      referenceType: 'CREDIT_NOTE_REFUND',
      referenceId: note.id,
      createdBy: actor.name,
    });
  }
  await audit(tx, actor, { action: 'CREDIT_NOTE_CREATED', entityType: 'CreditNote', entityId: note.id, reference: `${noteNumber} ${customer.name}`, newValue: { total: note.grandTotal, reason: note.reason, stockReturned: returnStock, refund: refundAmount } });
  return note;
}

export async function cancelCreditNote(tx: Tx, actor: Actor, noteId: string, reason: string) {
  const note = await tx.creditNote.findFirst({ where: { id: noteId, tenantId: actor.tenantId }, include: { items: true } });
  if (!note) throw notFound('Credit note not found.');
  if (note.status === 'Cancelled') throw conflict('Credit note is already cancelled.');
  if (note.refundAmount > 0) throw conflict('A refund was paid on this credit note — it cannot be cancelled. Raise an invoice for the amount instead.');
  await assertDayOpen(tx, actor.tenantId, note.date);
  if (note.stockReturned) {
    const warehouse = await warehouseOf(tx, actor.tenantId, note.warehouseId);
    await customerReturnsFull(tx, { tenantId: actor.tenantId, customer: { id: note.customerId, name: note.customerName }, warehouse, lines: note.items.filter((l) => l.productId).map((l) => ({ productId: l.productId!, productName: l.productName, fullQty: l.quantity })), referenceId: note.id, referenceNumber: note.noteNumber, performedBy: actor.name, reverse: true });
  }
  await postCustomerLedger(tx, {
    tenantId: actor.tenantId,
    customerId: note.customerId,
    entryType: 'REVERSAL',
    debit: note.grandTotal,
    voucherNumber: note.noteNumber,
    date: note.date,
    particulars: `Credit note ${note.noteNumber} cancelled: ${reason}`,
    referenceType: 'CREDIT_NOTE',
    referenceId: note.id,
    createdBy: actor.name,
  });
  await tx.creditNote.update({ where: { id: note.id }, data: { status: 'Cancelled', notes: `${note.notes ? `${note.notes} · ` : ''}Cancelled: ${reason}` } });
  await audit(tx, actor, { action: 'CREDIT_NOTE_CANCELLED', entityType: 'CreditNote', entityId: note.id, reference: note.noteNumber, reason, sensitive: true });
}

// ───────────────────────── Debit notes ─────────────────────────

export const DEBIT_REASONS = ['RETURN', 'RATE_DIFFERENCE', 'SHORT_SUPPLY', 'DAMAGED', 'OTHER'] as const;

export interface DebitNoteInput {
  date: string;
  supplierId: string;
  purchaseBillId?: string | null;
  reason: (typeof DEBIT_REASONS)[number];
  /** Full cylinders go back from the godown to the plant. */
  returnStock?: boolean;
  warehouseId?: string | null;
  itcReversed?: boolean;
  notes?: string | null;
  /** Rate before GST, like purchase bill lines. */
  items: { productId?: string | null; description?: string; hsnCode?: string; quantity: number; unit?: string; rate: number; taxRate: number }[];
}

export async function createDebitNote(tx: Tx, actor: Actor, input: DebitNoteInput) {
  if (!isDate(input.date)) throw badRequest('Choose the debit note date.');
  if (!DEBIT_REASONS.includes(input.reason)) throw badRequest('Choose the reason.');
  await assertDayOpen(tx, actor.tenantId, input.date);
  const supplier = await tx.customer.findFirst({ where: { id: input.supplierId, tenantId: actor.tenantId, type: 'Vendor' } });
  if (!supplier) throw badRequest('Choose the supplier / plant.');
  const bill = input.purchaseBillId ? await tx.purchaseBill.findFirst({ where: { id: input.purchaseBillId, tenantId: actor.tenantId }, include: { items: true } }) : null;
  if (input.purchaseBillId && !bill) throw badRequest('Purchase bill not found.');
  if (bill && bill.supplierId !== supplier.id) throw badRequest('That bill belongs to another supplier.');
  if (bill?.status === 'Cancelled') throw badRequest('The purchase bill is cancelled.');

  const company = await getSetting(actor.tenantId, 'company');
  const igst = bill ? bill.isIgst : isInterState(company.stateCode, supplier.stateCode, supplier.gstin);
  const lines = [];
  for (const i of input.items || []) {
    const quantity = Number(i.quantity) || 0;
    const rate = Number(i.rate) || 0;
    const taxRate = Number(i.taxRate) || 0;
    if (quantity <= 0 || rate <= 0 || taxRate < 0 || taxRate > 40) throw badRequest('Each line needs a quantity, a rate and a GST rate.');
    const product = i.productId ? await tx.product.findFirst({ where: { id: i.productId, tenantId: actor.tenantId } }) : null;
    if (i.productId && !product) throw badRequest('Product not found.');
    const taxable = round2(quantity * rate);
    const tax = round2((taxable * taxRate) / 100);
    const half = round2(tax / 2);
    lines.push({ productId: product?.id ?? null, description: (i.description || product?.name || '').trim() || 'Item', hsnCode: (i.hsnCode || product?.hsnCode || '').trim(), quantity, unit: (i.unit || product?.unit || 'PCS').trim(), rate, taxRate, taxableAmount: taxable, cgstAmount: igst ? 0 : half, sgstAmount: igst ? 0 : round2(tax - half), igstAmount: igst ? tax : 0, totalAmount: round2(taxable + tax) });
  }
  if (!lines.length) throw badRequest('Add at least one line.');
  const t = totals(lines);
  if (bill) {
    const earlier = await tx.debitNote.findMany({ where: { tenantId: actor.tenantId, purchaseBillId: bill.id, status: 'Active' } });
    const debited = sum(earlier, (n) => n.grandTotal);
    if (debited + t.grandTotal > bill.grandTotal + 0.5) throw badRequest(`Only ₹${round2(bill.grandTotal - debited).toFixed(2)} of ${bill.billNumber} is left to debit.`);
  }

  const noteNumber = await nextNumber(tx, actor.tenantId, 'DN');
  const returnStock = !!input.returnStock && lines.some((l) => l.productId && Number.isInteger(l.quantity));
  const warehouse = returnStock ? await warehouseOf(tx, actor.tenantId, input.warehouseId) : null;
  const note = await tx.debitNote.create({
    data: {
      tenantId: actor.tenantId,
      noteNumber,
      date: input.date,
      purchaseBillId: bill?.id ?? null,
      billNumber: bill?.billNumber ?? null,
      supplierInvoiceNo: bill?.supplierInvoiceNo ?? null,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierGstin: supplier.gstin || null,
      reason: input.reason,
      isIgst: igst,
      ...t,
      itcReversed: input.itcReversed !== false,
      stockReturned: returnStock,
      warehouseId: warehouse?.id ?? null,
      notes: input.notes?.trim() || null,
      createdBy: actor.name,
      items: { create: lines },
    },
    include: { items: true },
  });
  if (returnStock && warehouse) {
    await moveStock(tx, {
      tenantId: actor.tenantId,
      type: 'PURCHASE_RETURN',
      from: warehouse,
      to: { type: 'PLANT', id: 'PLANT', name: supplier.name },
      lines: note.items.filter((l) => l.productId && Number.isInteger(l.quantity)).map((l) => ({ productId: l.productId!, productName: l.description, fullQty: l.quantity, emptyQty: 0 })),
      referenceType: 'DEBIT_NOTE',
      referenceId: note.id,
      referenceNumber: noteNumber,
      reason: `Purchase return ${noteNumber}`,
      performedBy: actor.name,
    });
  }
  await audit(tx, actor, { action: 'DEBIT_NOTE_CREATED', entityType: 'DebitNote', entityId: note.id, reference: `${noteNumber} ${supplier.name}`, newValue: { total: note.grandTotal, reason: note.reason, stockReturned: returnStock } });
  return note;
}

export async function cancelDebitNote(tx: Tx, actor: Actor, noteId: string, reason: string) {
  const note = await tx.debitNote.findFirst({ where: { id: noteId, tenantId: actor.tenantId }, include: { items: true } });
  if (!note) throw notFound('Debit note not found.');
  if (note.status === 'Cancelled') throw conflict('Debit note is already cancelled.');
  await assertDayOpen(tx, actor.tenantId, note.date);
  if (note.stockReturned) {
    const warehouse = await warehouseOf(tx, actor.tenantId, note.warehouseId);
    await moveStock(tx, {
      tenantId: actor.tenantId,
      type: 'REVERSAL',
      from: { type: 'PLANT', id: 'PLANT', name: note.supplierName },
      to: warehouse,
      lines: note.items.filter((l) => l.productId).map((l) => ({ productId: l.productId!, productName: l.description, fullQty: l.quantity, emptyQty: 0 })),
      referenceType: 'DEBIT_NOTE',
      referenceId: note.id,
      referenceNumber: note.noteNumber,
      reason: `Debit note ${note.noteNumber} cancelled`,
      performedBy: actor.name,
    });
  }
  await tx.debitNote.update({ where: { id: note.id }, data: { status: 'Cancelled', notes: `${note.notes ? `${note.notes} · ` : ''}Cancelled: ${reason}` } });
  await audit(tx, actor, { action: 'DEBIT_NOTE_CANCELLED', entityType: 'DebitNote', entityId: note.id, reference: note.noteNumber, reason, sensitive: true });
}
