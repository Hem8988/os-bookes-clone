import type { Tx } from '@/lib/db';
import { notFound, round2 } from './http';

export interface CustomerLedgerInput {
  tenantId: string;
  customerId: string;
  entryType: 'OPENING' | 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT' | 'REVERSAL' | 'CREDIT_NOTE' | 'REFUND';
  debit?: number;
  credit?: number;
  voucherNumber: string;
  date: string;
  particulars: string;
  referenceType?: string;
  referenceId?: string;
  createdBy: string;
}

/**
 * Post one customer-ledger line and update the customer's running
 * outstanding atomically. The customer row is locked for the duration of the
 * transaction so concurrent postings cannot interleave balances.
 */
export async function postCustomerLedger(tx: Tx, input: CustomerLedgerInput) {
  await tx.$executeRaw`SELECT id FROM customers WHERE id = ${input.customerId} FOR UPDATE`;
  const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw notFound('Customer not found.');

  const debit = round2(input.debit || 0);
  const credit = round2(input.credit || 0);
  const runningBalance = round2(customer.balance + debit - credit);

  await tx.customer.update({ where: { id: customer.id }, data: { balance: runningBalance } });
  return tx.ledgerEntry.create({
    data: {
      tenantId: input.tenantId,
      ledgerType: 'CUSTOMER',
      customerId: customer.id,
      accountName: customer.name,
      entryType: input.entryType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      voucherNumber: input.voucherNumber,
      date: input.date,
      particulars: input.particulars,
      debit,
      credit,
      runningBalance,
      createdBy: input.createdBy,
    },
  });
}

/** Company cash / bank book line (running balance per account). */
export async function postBookEntry(
  tx: Tx,
  input: {
    tenantId: string;
    ledgerType: 'CASH' | 'BANK';
    accountName: string;
    entryType: string;
    debit?: number;
    credit?: number;
    voucherNumber: string;
    date: string;
    particulars: string;
    referenceType?: string;
    referenceId?: string;
    createdBy: string;
  }
) {
  const last = await tx.ledgerEntry.findFirst({
    where: { tenantId: input.tenantId, ledgerType: input.ledgerType, accountName: input.accountName },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const debit = round2(input.debit || 0);
  const credit = round2(input.credit || 0);
  return tx.ledgerEntry.create({
    data: {
      tenantId: input.tenantId,
      ledgerType: input.ledgerType,
      accountName: input.accountName,
      entryType: input.entryType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      voucherNumber: input.voucherNumber,
      date: input.date,
      particulars: input.particulars,
      debit,
      credit,
      runningBalance: round2((last?.runningBalance || 0) + debit - credit),
      createdBy: input.createdBy,
    },
  });
}
