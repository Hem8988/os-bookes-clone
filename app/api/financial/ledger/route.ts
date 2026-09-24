import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { createApproval } from '@/lib/server/approvals';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { badRequest, businessDate, forbidden, handle, notFound, ok, readJson, round2, str } from '@/lib/server/http';
import { postCustomerLedger } from '@/lib/server/ledger';

/**
 * Ledgers. ?customerId → that customer's statement (customers see only their
 * own); ?type=CASH|BANK|CUSTOMER → book view for accounts.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const where: Prisma.LedgerEntryWhereInput = { tenantId: auth.tenantId };
  const customerId = auth.role === 'CUSTOMER' ? auth.customerId : url.searchParams.get('customerId');
  if (auth.role !== 'CUSTOMER' && !can(auth.role, 'ledger.view')) throw forbidden();
  if (customerId) {
    where.customerId = customerId;
  } else {
    where.ledgerType = url.searchParams.get('type') || 'CUSTOMER';
  }
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (from || to) where.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  const entries = await prisma.ledgerEntry.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 2000 });
  const customer = customerId ? await prisma.customer.findFirst({ where: { id: customerId, tenantId: auth.tenantId }, select: { id: true, name: true, balance: true, creditLimit: true, openingBalance: true } }) : null;
  return ok({ customer, entries: entries.map((e) => ({ ...e, balance: e.runningBalance })) });
});

/**
 * Manual customer balance adjustment: applied directly by the Super Admin,
 * requested (→ approval) by the accountant (SRS §4 matrix).
 */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const direct = can(auth.role, 'ledger.adjust');
  if (!direct && !can(auth.role, 'ledger.adjust.request')) throw forbidden();
  const body = await readJson(request);
  const customerId = str(body.customerId, 'Customer', { required: true });
  const amount = round2(Number(body.amount));
  if (!amount) throw badRequest('Enter a non-zero amount (+ increases outstanding, − reduces it).');
  const reason = str(body.reason, 'Reason', { required: true, max: 300 });
  const effects = new Effects();
  const message = await transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId: auth.tenantId } });
    if (!customer) throw notFound('Customer not found.');
    if (direct) {
      await postCustomerLedger(tx, {
        tenantId: auth.tenantId,
        customerId,
        entryType: 'ADJUSTMENT',
        debit: amount > 0 ? amount : 0,
        credit: amount < 0 ? -amount : 0,
        voucherNumber: `ADJ-${Date.now().toString(36).toUpperCase()}`,
        date: businessDate(),
        particulars: `Manual adjustment: ${reason}`,
        referenceType: 'MANUAL',
        createdBy: auth.name,
      });
      await audit(tx, auth, { action: 'CUSTOMER_BALANCE_ADJUSTED', entityType: 'Customer', entityId: customerId, reference: customer.customerCode, oldValue: { balance: customer.balance }, newValue: { balance: round2(customer.balance + amount) }, reason, sensitive: true });
      return 'Adjustment posted.';
    }
    await createApproval(
      tx,
      {
        tenantId: auth.tenantId,
        type: 'LEDGER_ADJUSTMENT',
        referenceType: 'CUSTOMER',
        referenceId: customerId,
        title: `${customer.name}: ${amount > 0 ? '+' : ''}₹${amount.toLocaleString('en-IN')}`,
        summary: reason,
        payload: { customerId, amount, reason },
        requestedById: auth.userId,
        requestedByName: auth.name,
      },
      effects
    );
    return 'Adjustment sent to the admin for approval.';
  });
  effects.schedule();
  return ok(null, message);
});
