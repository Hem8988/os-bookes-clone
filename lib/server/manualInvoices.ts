import type { Tx } from '@/lib/db';
import { createApproval } from './approvals';
import { audit, Actor } from './audit';
import { assertDayOpen } from './dayLocks';
import type { Effects } from './effects';
import { badRequest, businessDate, conflict, isDateString, notFound, round2 } from './http';
import { dueDateFor, invoiceStatus } from './invoices';
import { postBookEntry, postCustomerLedger } from './ledger';
import { notifyCustomer } from './notify';
import { nextInvoiceNumber, nextNumber } from './sequence';
import { getSetting } from './settings';
import { COMPANY_WALLET, getWallet, postWallet } from './wallet';

// Invoices typed in the Billing screen (counter sales, accessories, deposits…).
// They post to the ledger immediately because they are entered by accounts;
// edits by the accountant need admin approval (SRS §8 "Invoice Approval").

type Row = Record<string, unknown>;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const s = (v: unknown) => (v == null ? '' : String(v));

function normaliseItems(raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) throw badRequest('Invoice must have at least one item.');
  return raw.map((it: Row) => {
    if (!s(it.productName)) throw badRequest('Every invoice line needs a product.');
    return {
      productId: s(it.productId),
      productName: s(it.productName),
      hsnCode: s(it.hsnCode) || '27111900',
      quantity: n(it.quantity),
      unit: s(it.unit) || 'PCS',
      unitPrice: n(it.unitPrice),
      mrp: it.mrp == null ? null : n(it.mrp),
      discountPercent: n(it.discountPercent),
      taxRate: n(it.taxRate),
      taxableAmount: n(it.taxableAmount),
      cgstAmount: n(it.cgstAmount),
      sgstAmount: n(it.sgstAmount),
      igstAmount: n(it.igstAmount),
      totalAmount: n(it.totalAmount),
    };
  });
}

function headerFrom(data: Row, items: ReturnType<typeof normaliseItems>) {
  const itemsTotal = round2(items.reduce((sum, i) => sum + i.totalAmount, 0));
  const roundOff = n(data.roundOff);
  const grandTotal = round2(n(data.grandTotal) || itemsTotal + roundOff);
  if (Math.abs(grandTotal - (itemsTotal + roundOff)) > 1) throw badRequest('Invoice total does not match its items.');
  return {
    subTotal: n(data.subTotal),
    totalDiscount: n(data.totalDiscount),
    totalCgst: n(data.totalCgst),
    totalSgst: n(data.totalSgst),
    totalIgst: n(data.totalIgst),
    roundOff,
    grandTotal,
    isIgst: !!data.isIgst,
    notes: data.notes ? s(data.notes) : null,
    salesmanId: data.salesmanId ? s(data.salesmanId) : null,
    salesmanName: data.salesmanName ? s(data.salesmanName) : null,
    bankAccountId: data.bankAccountId ? s(data.bankAccountId) : null,
    paymentMode: s(data.paymentMode) || 'Credit',
  };
}

const PAYMENT_MODE_MAP: Record<string, 'CASH' | 'ONLINE' | 'CHEQUE' | null> = {
  Cash: 'CASH',
  UPI: 'ONLINE',
  'Bank Transfer': 'ONLINE',
  Cheque: 'CHEQUE',
  Multiple: 'ONLINE',
  Credit: null,
};

export async function createManualInvoice(tx: Tx, actor: Actor, data: Row, effects: Effects) {
  const customer = await tx.customer.findFirst({ where: { id: s(data.customerId), tenantId: actor.tenantId } });
  if (!customer) throw badRequest('Select a customer saved in the system.');
  if (customer.status === 'BLOCKED') throw badRequest('Customer is blocked.');
  const date = isDateString(data.date) ? data.date : businessDate();
  await assertDayOpen(tx, actor.tenantId, date);
  const items = normaliseItems(data.items);
  const header = headerFrom(data, items);
  const company = await getSetting(actor.tenantId, 'company');

  const requestedStatus = s(data.status);
  const paid = requestedStatus === 'Paid' ? header.grandTotal : requestedStatus === 'Partial' ? Math.min(n(data.paidAmount), header.grandTotal) : 0;
  const mode = PAYMENT_MODE_MAP[header.paymentMode] ?? null;
  if (paid > 0 && !mode) throw badRequest('Choose how the payment was received.');

  const invoice = await tx.invoice.create({
    data: {
      ...header,
      tenantId: actor.tenantId,
      invoiceNumber: await nextInvoiceNumber(tx, actor.tenantId, date, company.invoicePrefix),
      date,
      dueDate: isDateString(data.dueDate) ? data.dueDate : dueDateFor(customer, date),
      customerId: customer.id,
      customerName: customer.name,
      customerGstin: customer.gstin,
      customerPhone: customer.phone,
      source: 'MANUAL',
      status: invoiceStatus(header.grandTotal, paid),
      paidAmount: paid,
      createdBy: actor.name,
      items: { create: items },
    },
    include: { items: true },
  });

  let balance = (
    await postCustomerLedger(tx, {
      tenantId: actor.tenantId,
      customerId: customer.id,
      entryType: 'INVOICE',
      debit: invoice.grandTotal,
      voucherNumber: invoice.invoiceNumber,
      date,
      particulars: items.map((i) => `${i.productName} × ${i.quantity}`).join(', '),
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      createdBy: actor.name,
    })
  ).runningBalance;

  if (paid > 0 && mode) {
    const payment = await tx.payment.create({
      data: {
        tenantId: actor.tenantId,
        paymentNumber: await nextNumber(tx, actor.tenantId, 'RCPT'),
        customerId: customer.id,
        customerName: customer.name,
        source: 'LATE_ENTRY',
        invoiceId: invoice.id,
        mode,
        amount: paid,
        paymentDate: date,
        status: 'VERIFIED',
        enteredBy: actor.name,
        verifiedBy: actor.name,
        verifiedAt: new Date(),
        notes: `Received at billing counter against ${invoice.invoiceNumber}`,
      },
    });
    balance = (
      await postCustomerLedger(tx, {
        tenantId: actor.tenantId,
        customerId: customer.id,
        entryType: 'PAYMENT',
        credit: paid,
        voucherNumber: payment.paymentNumber,
        date,
        particulars: `${header.paymentMode} received against ${invoice.invoiceNumber}`,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        createdBy: actor.name,
      })
    ).runningBalance;
    if (mode === 'CASH') {
      const wallet = await getWallet(tx, actor.tenantId, 'COMPANY', COMPANY_WALLET.ownerId, COMPANY_WALLET.ownerName);
      await postWallet(tx, wallet.id, { type: 'RECEIPT', amount: paid, referenceType: 'PAYMENT', referenceId: payment.id, notes: `Counter sale ${invoice.invoiceNumber}`, performedBy: actor.name });
    }
    await postBookEntry(tx, {
      tenantId: actor.tenantId,
      ledgerType: mode === 'CASH' ? 'CASH' : 'BANK',
      accountName: mode === 'CASH' ? 'Company Cash' : 'Bank (Receipts)',
      entryType: 'PAYMENT',
      debit: paid,
      voucherNumber: payment.paymentNumber,
      date,
      particulars: `${header.paymentMode} from ${customer.name} (${invoice.invoiceNumber})`,
      referenceType: 'PAYMENT',
      referenceId: payment.id,
      createdBy: actor.name,
    });
  }
  const saved = await tx.invoice.update({ where: { id: invoice.id }, data: { balanceAfter: balance }, include: { items: true } });
  await audit(tx, actor, { action: 'INVOICE_CREATED', entityType: 'Invoice', entityId: invoice.id, reference: invoice.invoiceNumber, newValue: { grandTotal: invoice.grandTotal, paid } });
  effects.add('invoice message', () =>
    notifyCustomer(actor.tenantId, customer, 'INVOICE', { invoiceNumber: saved.invoiceNumber, date, amount: saved.grandTotal.toLocaleString('en-IN'), paid: paid.toLocaleString('en-IN'), outstanding: balance.toLocaleString('en-IN'), link: '' }, `Invoice ${saved.invoiceNumber}`)
  );
  return saved;
}

/** Apply an edit: replace lines, post the difference as a ledger adjustment. */
export async function applyInvoiceEdit(tx: Tx, actor: Actor, invoiceId: string, data: Row) {
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId } });
  if (!invoice) throw notFound('Invoice not found.');
  if (invoice.status === 'Cancelled') throw conflict('Cancelled invoices cannot be edited.');
  if (invoice.source === 'DELIVERY') throw conflict('Delivery invoices are generated from verified deliveries and cannot be edited. Use a ledger adjustment.');
  await assertDayOpen(tx, actor.tenantId, invoice.date);
  const items = normaliseItems(data.items);
  const header = headerFrom(data, items);
  const diff = round2(header.grandTotal - invoice.grandTotal);

  await tx.invoiceItem.deleteMany({ where: { invoiceId } });
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { ...header, status: invoiceStatus(header.grandTotal, invoice.paidAmount), items: { create: items } },
  });
  if (diff !== 0) {
    await postCustomerLedger(tx, {
      tenantId: actor.tenantId,
      customerId: invoice.customerId,
      entryType: 'ADJUSTMENT',
      debit: diff > 0 ? diff : 0,
      credit: diff < 0 ? -diff : 0,
      voucherNumber: invoice.invoiceNumber,
      date: businessDate(),
      particulars: `Invoice ${invoice.invoiceNumber} revised (₹${invoice.grandTotal} → ₹${header.grandTotal})`,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      createdBy: actor.name,
    });
  }
  await audit(tx, actor, { action: 'INVOICE_EDITED', entityType: 'Invoice', entityId: invoice.id, reference: invoice.invoiceNumber, oldValue: { grandTotal: invoice.grandTotal }, newValue: { grandTotal: header.grandTotal }, sensitive: true });
}

export async function requestOrApplyInvoiceEdit(tx: Tx, actor: Actor, invoiceId: string, data: Row, effects: Effects) {
  if (actor.role === 'SUPER_ADMIN') {
    await applyInvoiceEdit(tx, actor, invoiceId, data);
    return { applied: true };
  }
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId } });
  if (!invoice) throw notFound('Invoice not found.');
  const pending = await tx.approvalRequest.findFirst({ where: { tenantId: actor.tenantId, type: 'INVOICE_APPROVAL', referenceId: invoiceId, status: 'PENDING' } });
  if (pending) throw conflict('An edit for this invoice is already waiting for admin approval.');
  await createApproval(
    tx,
    {
      tenantId: actor.tenantId,
      type: 'INVOICE_APPROVAL',
      referenceType: 'INVOICE',
      referenceId: invoiceId,
      title: `Edit ${invoice.invoiceNumber} · ${invoice.customerName}`,
      summary: `Total ₹${invoice.grandTotal} → ₹${n(data.grandTotal)}`,
      payload: data,
      requestedById: actor.userId,
      requestedByName: actor.name,
    },
    effects
  );
  return { applied: false };
}

export async function cancelInvoice(tx: Tx, actor: Actor, invoiceId: string, reason: string) {
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId } });
  if (!invoice) throw notFound('Invoice not found.');
  if (invoice.status === 'Cancelled') return;
  if (invoice.source === 'DELIVERY') throw conflict('Delivery invoices cannot be cancelled. Use a ledger adjustment.');
  await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'Cancelled', notes: `${invoice.notes ? `${invoice.notes} · ` : ''}Cancelled: ${reason}` } });
  await postCustomerLedger(tx, {
    tenantId: actor.tenantId,
    customerId: invoice.customerId,
    entryType: 'REVERSAL',
    credit: invoice.grandTotal,
    voucherNumber: invoice.invoiceNumber,
    date: businessDate(),
    particulars: `Invoice ${invoice.invoiceNumber} cancelled: ${reason}`,
    referenceType: 'INVOICE',
    referenceId: invoice.id,
    createdBy: actor.name,
  });
  await audit(tx, actor, { action: 'INVOICE_CANCELLED', entityType: 'Invoice', entityId: invoice.id, reference: invoice.invoiceNumber, reason, sensitive: true });
}
