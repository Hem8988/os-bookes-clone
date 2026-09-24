import type { Tx } from '@/lib/db';
import { createApproval } from './approvals';
import { audit, Actor } from './audit';
import { assertDayOpen } from './dayLocks';
import type { Effects } from './effects';
import { badRequest, businessDate, conflict, dateStr, notFound, round2 } from './http';
import { invoiceStatus } from './invoices';
import { postBookEntry, postCustomerLedger } from './ledger';
import { notifyCustomer } from './notify';
import { nextNumber } from './sequence';
import { isStoredFile } from './storage';
import { COMPANY_WALLET, getWallet, postWallet } from './wallet';

export interface LatePaymentInput {
  customerId: string;
  amount: number;
  mode: 'CASH' | 'ONLINE' | 'CHEQUE';
  paymentDate?: string;
  invoiceId?: string | null;
  transactionId?: string | null;
  chequeNumber?: string | null;
  chequeBank?: string | null;
  chequeDate?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
}

/**
 * A payment received after delivery (SRS §11.5): entered by the accountant,
 * then verified before it reaches the ledger. Gateway payments use the same
 * path with source GATEWAY.
 */
export async function recordPayment(tx: Tx, actor: Actor, input: LatePaymentInput, source: 'LATE_ENTRY' | 'GATEWAY', effects: Effects) {
  const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId: actor.tenantId } });
  if (!customer) throw notFound('Customer not found.');
  const amount = round2(Number(input.amount));
  if (!(amount > 0)) throw badRequest('Amount must be greater than zero.');
  if (!['CASH', 'ONLINE', 'CHEQUE'].includes(input.mode)) throw badRequest('Choose Cash, Online or Cheque.');
  if (input.mode === 'ONLINE' && !input.transactionId?.trim()) throw badRequest('Transaction ID is required for online payments.');
  if (input.mode === 'CHEQUE' && (!input.chequeNumber?.trim() || !input.chequeBank?.trim() || !input.chequeDate)) throw badRequest('Cheque number, bank and date are required.');
  if (input.proofUrl && !isStoredFile(input.proofUrl)) throw badRequest('Invalid proof file.');
  const paymentDate = input.paymentDate ? dateStr(input.paymentDate, 'Payment date') : businessDate();
  if (paymentDate > businessDate()) throw badRequest('Payment date cannot be in the future.');
  await assertDayOpen(tx, actor.tenantId, paymentDate);

  if (input.invoiceId) {
    const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, customerId: customer.id } });
    if (!invoice) throw badRequest('Invoice does not belong to this customer.');
  }

  const payment = await tx.payment.create({
    data: {
      tenantId: actor.tenantId,
      paymentNumber: await nextNumber(tx, actor.tenantId, 'RCPT'),
      customerId: customer.id,
      customerName: customer.name,
      source,
      invoiceId: input.invoiceId || null,
      mode: input.mode,
      amount,
      paymentDate,
      transactionId: input.transactionId || null,
      chequeNumber: input.chequeNumber || null,
      chequeBank: input.chequeBank || null,
      chequeDate: input.chequeDate || null,
      proofUrl: input.proofUrl || null,
      notes: input.notes || null,
      enteredBy: actor.name,
    },
  });
  await createApproval(
    tx,
    {
      tenantId: actor.tenantId,
      type: 'PAYMENT_VERIFICATION',
      referenceType: 'PAYMENT',
      referenceId: payment.id,
      title: `${payment.paymentNumber} · ${customer.name}`,
      summary: `${input.mode} ₹${amount.toLocaleString('en-IN')} on ${paymentDate}${input.transactionId ? ` · Txn ${input.transactionId}` : ''}${input.chequeNumber ? ` · Chq ${input.chequeNumber}` : ''}`,
      payload: { customerId: customer.id, amount, mode: input.mode, source },
      requestedById: actor.userId === 'system' ? null : actor.userId,
      requestedByName: actor.name,
    },
    effects
  );
  await audit(tx, actor, { action: 'PAYMENT_ENTERED', entityType: 'Payment', entityId: payment.id, reference: payment.paymentNumber, newValue: { amount, mode: input.mode, customer: customer.name } });
  return payment;
}

export async function verifyPayment(tx: Tx, actor: Actor, paymentId: string, effects: Effects) {
  const payment = await tx.payment.findFirst({ where: { id: paymentId, tenantId: actor.tenantId } });
  if (!payment) throw notFound('Payment not found.');
  if (payment.status !== 'PENDING_VERIFICATION') throw conflict('Payment is already processed.');
  await assertDayOpen(tx, actor.tenantId, payment.paymentDate);

  await tx.payment.update({ where: { id: payment.id }, data: { status: 'VERIFIED', verifiedBy: actor.name, verifiedAt: new Date() } });
  const entry = await postCustomerLedger(tx, {
    tenantId: actor.tenantId,
    customerId: payment.customerId,
    entryType: 'PAYMENT',
    credit: payment.amount,
    voucherNumber: payment.paymentNumber,
    date: payment.paymentDate,
    particulars: `${payment.mode} payment received${payment.transactionId ? ` (Txn ${payment.transactionId})` : ''}${payment.chequeNumber ? ` (Chq ${payment.chequeNumber}, ${payment.chequeBank})` : ''}`,
    referenceType: 'PAYMENT',
    referenceId: payment.id,
    createdBy: actor.name,
  });

  if (payment.mode === 'CASH') {
    const wallet = await getWallet(tx, actor.tenantId, 'COMPANY', COMPANY_WALLET.ownerId, COMPANY_WALLET.ownerName);
    await postWallet(tx, wallet.id, { type: 'RECEIPT', amount: payment.amount, referenceType: 'PAYMENT', referenceId: payment.id, notes: `Cash from ${payment.customerName}`, performedBy: actor.name });
  }
  await postBookEntry(tx, {
    tenantId: actor.tenantId,
    ledgerType: payment.mode === 'CASH' ? 'CASH' : 'BANK',
    accountName: payment.mode === 'CASH' ? 'Company Cash' : 'Bank (Receipts)',
    entryType: 'PAYMENT',
    debit: payment.amount,
    voucherNumber: payment.paymentNumber,
    date: payment.paymentDate,
    particulars: `${payment.mode} from ${payment.customerName}`,
    referenceType: 'PAYMENT',
    referenceId: payment.id,
    createdBy: actor.name,
  });

  if (payment.invoiceId) {
    const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
    if (invoice && invoice.status !== 'Cancelled') {
      const paid = round2(invoice.paidAmount + payment.amount);
      await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: paid, status: invoiceStatus(invoice.grandTotal, paid) } });
    }
  }
  await audit(tx, actor, { action: 'PAYMENT_VERIFIED', entityType: 'Payment', entityId: payment.id, reference: payment.paymentNumber, newValue: { amount: payment.amount, outstanding: entry.runningBalance } });

  const customer = await tx.customer.findUniqueOrThrow({ where: { id: payment.customerId } });
  effects.add('payment received message', () =>
    notifyCustomer(actor.tenantId, customer, 'PAYMENT_RECEIVED', { amount: payment.amount.toLocaleString('en-IN'), mode: payment.mode, outstanding: entry.runningBalance.toLocaleString('en-IN'), paymentNumber: payment.paymentNumber }, `Payment ${payment.paymentNumber} received`)
  );
}

export async function rejectPayment(tx: Tx, actor: Actor, paymentId: string, reason: string) {
  if (!reason.trim()) throw badRequest('Reason is mandatory.');
  const payment = await tx.payment.findFirst({ where: { id: paymentId, tenantId: actor.tenantId } });
  if (!payment) throw notFound('Payment not found.');
  if (payment.status !== 'PENDING_VERIFICATION') throw conflict('Payment is already processed.');
  await tx.payment.update({ where: { id: payment.id }, data: { status: 'REJECTED', rejectionReason: reason, verifiedBy: actor.name, verifiedAt: new Date() } });
  await audit(tx, actor, { action: 'PAYMENT_REJECTED', entityType: 'Payment', entityId: payment.id, reference: payment.paymentNumber, reason });
}
