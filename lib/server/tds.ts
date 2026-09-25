import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import type { Tx } from '@/lib/db';
import { tdsDueDate, tdsQuarter } from '@/lib/tds';
import { audit, Actor } from './audit';
import { partyAccount, systemAccount } from './books/accounts';
import { applyBillPayment } from './books/entries';
import { cancelSourceVoucher, writeVoucher } from './books/vouchers';
import { badRequest, businessDate, conflict, notFound, round2 } from './http';
import { postCustomerLedger } from './ledger';
import { nextNumber } from './sequence';

// TDS in two directions:
//  RECEIVABLE — a customer paid us net of TDS: their dues go down by the TDS
//    (customer ledger credit) and the amount sits in "TDS Receivable" until it
//    shows in 26AS / Form 16A and is claimed in the income-tax return.
//  PAYABLE — we deducted TDS from a supplier: the supplier is owed less (Dr party,
//    Cr "TDS Payable") and the liability is cleared when the challan is paid.

export interface TdsInput {
  direction: 'RECEIVABLE' | 'PAYABLE';
  date: string;
  partyId: string;
  section: string;
  baseAmount?: number;
  rate?: number;
  amount: number;
  referenceType?: 'INVOICE' | 'PURCHASE_BILL' | 'EXPENSE' | null;
  referenceId?: string | null;
  pan?: string | null;
  notes?: string | null;
}

export async function createTds(tx: Tx, actor: Actor, input: TdsInput) {
  const amount = round2(input.amount);
  if (!(amount > 0)) throw badRequest('Enter the TDS amount.');
  if (input.direction !== 'RECEIVABLE' && input.direction !== 'PAYABLE') throw badRequest('Choose receivable or payable.');
  const party = await tx.customer.findFirst({ where: { id: input.partyId, tenantId: actor.tenantId } });
  if (!party) throw notFound('Party not found.');
  if (input.direction === 'RECEIVABLE' && party.type === 'Vendor') throw badRequest('TDS receivable is for customers who deducted TDS from your bill.');

  let referenceNo: string | null = null;
  let billId: string | null = null;
  if (input.referenceType === 'INVOICE' && input.referenceId) {
    const inv = await tx.invoice.findFirst({ where: { id: input.referenceId, tenantId: actor.tenantId, customerId: party.id } });
    if (!inv) throw notFound('Invoice not found for this customer.');
    if (amount > inv.grandTotal) throw badRequest('TDS cannot be more than the invoice.');
    referenceNo = inv.invoiceNumber;
  } else if (input.referenceType === 'PURCHASE_BILL' && input.referenceId) {
    const bill = await tx.purchaseBill.findFirst({ where: { id: input.referenceId, tenantId: actor.tenantId, supplierId: party.id } });
    if (!bill || bill.status === 'Cancelled') throw notFound('Purchase bill not found for this supplier.');
    if (amount > round2(bill.grandTotal - bill.paidAmount) + 0.5) throw badRequest(`Only ₹${round2(bill.grandTotal - bill.paidAmount)} is still due on this bill.`);
    referenceNo = `${bill.billNumber} (${bill.supplierInvoiceNo})`;
    billId = bill.id;
  } else if (input.referenceType === 'EXPENSE' && input.referenceId) {
    const exp = await tx.expenseEntry.findFirst({ where: { id: input.referenceId, tenantId: actor.tenantId } });
    if (!exp || exp.cancelled) throw notFound('Expense not found.');
    referenceNo = exp.entryNumber;
  }

  const entryNumber = await nextNumber(tx, actor.tenantId, 'TDS');
  const pan = (input.pan || (party.gstin && party.gstin.length === 15 ? party.gstin.slice(2, 12) : '') || '').toUpperCase() || null;
  const entry = await tx.tdsEntry.create({
    data: {
      tenantId: actor.tenantId,
      entryNumber,
      direction: input.direction,
      date: input.date,
      partyId: party.id,
      partyName: party.name,
      pan,
      section: input.section || 'OTHER',
      baseAmount: round2(input.baseAmount || 0),
      rate: round2(input.rate || 0),
      amount,
      referenceType: input.referenceType || null,
      referenceId: input.referenceId || null,
      referenceNo,
      notes: input.notes?.trim() || null,
      createdBy: actor.name,
    },
  });

  if (input.direction === 'RECEIVABLE') {
    const le = await postCustomerLedger(tx, { tenantId: actor.tenantId, customerId: party.id, entryType: 'ADJUSTMENT', credit: amount, voucherNumber: entryNumber, date: input.date, particulars: `TDS u/s ${entry.section} deducted by customer${referenceNo ? ` on ${referenceNo}` : ''}`, referenceType: 'TDS', referenceId: entry.id, createdBy: actor.name });
    await tx.tdsEntry.update({ where: { id: entry.id }, data: { ledgerEntryId: le.id } });
  } else {
    const [acc, tds] = await Promise.all([partyAccount(tx, party), systemAccount(tx, actor.tenantId, 'TDS_PAYABLE')]);
    await writeVoucher(tx, { tenantId: actor.tenantId, voucherType: 'JOURNAL', date: input.date, partyName: party.name, narration: `TDS u/s ${entry.section} deducted${referenceNo ? ` on ${referenceNo}` : ''}`, sourceType: 'TDS', sourceId: entry.id, againstBillId: billId, createdBy: actor.name, lines: [{ accountId: acc.id, debit: amount }, { accountId: tds.id, credit: amount }] });
    if (billId) await applyBillPayment(tx, billId);
  }
  await audit(tx, actor, { action: 'TDS_RECORDED', entityType: 'TdsEntry', entityId: entry.id, reference: entryNumber, newValue: { direction: entry.direction, section: entry.section, amount, party: party.name } });
  return entry;
}

export async function cancelTds(tx: Tx, actor: Actor, id: string, reason: string) {
  const e = await tx.tdsEntry.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!e) throw notFound('TDS entry not found.');
  if (e.cancelled) throw conflict('Already cancelled.');
  if (e.depositedOn) throw conflict('This TDS is already deposited — it cannot be cancelled.');
  if (!reason.trim()) throw badRequest('Give a reason.');
  if (e.direction === 'RECEIVABLE') {
    await postCustomerLedger(tx, { tenantId: actor.tenantId, customerId: e.partyId, entryType: 'REVERSAL', debit: e.amount, voucherNumber: e.entryNumber, date: e.date, particulars: `TDS entry ${e.entryNumber} cancelled: ${reason.trim()}`, referenceType: 'TDS', referenceId: e.id, createdBy: actor.name });
  } else {
    await cancelSourceVoucher(tx, actor.tenantId, 'TDS', e.id);
    if (e.referenceType === 'PURCHASE_BILL' && e.referenceId) await applyBillPayment(tx, e.referenceId);
  }
  await tx.tdsEntry.update({ where: { id: e.id }, data: { cancelled: true, notes: [e.notes, `Cancelled: ${reason.trim()}`].filter(Boolean).join(' · ') } });
  await audit(tx, actor, { action: 'TDS_CANCELLED', entityType: 'TdsEntry', entityId: e.id, reference: e.entryNumber, reason });
}

/** Pay TDS to the government: one challan clears the selected payable entries. */
export async function depositTds(tx: Tx, actor: Actor, input: { ids: string[]; date: string; challanNo: string; bankAccountId: string }) {
  if (!input.ids.length) throw badRequest('Choose the TDS entries this challan covers.');
  if (!input.challanNo.trim()) throw badRequest('Enter the challan number (CIN / BSR + serial).');
  const entries = await tx.tdsEntry.findMany({ where: { id: { in: input.ids }, tenantId: actor.tenantId, direction: 'PAYABLE', cancelled: false, depositedOn: null } });
  if (entries.length !== input.ids.length) throw conflict('Some entries are already deposited or cancelled — refresh and try again.');
  const bank = await tx.ledgerAccount.findFirst({ where: { id: input.bankAccountId, tenantId: actor.tenantId, groupName: { in: ['Bank Accounts', 'Cash-in-Hand'] } } });
  if (!bank) throw badRequest('Choose the bank account the challan was paid from.');
  const total = round2(entries.reduce((s, e) => s + e.amount, 0));
  const batchId = randomUUID();
  const tds = await systemAccount(tx, actor.tenantId, 'TDS_PAYABLE');
  const voucher = await writeVoucher(tx, { tenantId: actor.tenantId, voucherType: 'PAYMENT', date: input.date, partyName: 'Income Tax Department', narration: `TDS deposited, challan ${input.challanNo.trim()} (${entries.map((e) => e.entryNumber).join(', ')})`, sourceType: 'TDS_CHALLAN', sourceId: batchId, createdBy: actor.name, lines: [{ accountId: tds.id, debit: total }, { accountId: bank.id, credit: total }] });
  await tx.tdsEntry.updateMany({ where: { id: { in: input.ids } }, data: { depositedOn: input.date, challanNo: input.challanNo.trim(), depositBatchId: batchId } });
  await audit(tx, actor, { action: 'TDS_DEPOSITED', entityType: 'TdsEntry', entityId: batchId, reference: input.challanNo, newValue: { total, entries: entries.length, voucher: voucher?.voucherNumber } });
  return { total, voucherNumber: voucher?.voucherNumber };
}

/** Receivable side: note the Form 16A certificate once the customer issues it. */
export async function markCertificate(tx: Tx, actor: Actor, id: string, certificateNo: string, certificateDate: string) {
  const e = await tx.tdsEntry.findFirst({ where: { id, tenantId: actor.tenantId, direction: 'RECEIVABLE' } });
  if (!e) throw notFound('TDS entry not found.');
  await tx.tdsEntry.update({ where: { id }, data: { certificateNo: certificateNo.trim() || null, certificateDate: certificateDate || null } });
}

export async function tdsRegister(tenantId: string, from: string, to: string, direction?: string) {
  const rows = await prisma.tdsEntry.findMany({ where: { tenantId, date: { gte: from, lte: to }, ...(direction ? { direction } : {}) }, orderBy: [{ date: 'asc' }, { entryNumber: 'asc' }] });
  const today = businessDate();
  return rows.map((e) => {
    const dueOn = e.direction === 'PAYABLE' ? tdsDueDate(e.date) : null;
    const state = e.cancelled ? 'Cancelled' : e.direction === 'PAYABLE' ? (e.depositedOn ? 'Deposited' : dueOn! < today ? 'Overdue' : 'To deposit') : e.certificateNo ? 'Certificate received' : 'Awaiting Form 16A';
    return { ...e, quarter: tdsQuarter(e.date), dueOn, state };
  });
}
