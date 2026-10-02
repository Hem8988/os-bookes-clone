import type { Db, Tx } from '@/lib/db';

// Plant balance: money a distributor keeps with the oil company (IOCL / HPCL /
// BPCL). Advances are Payment vouchers on the supplier's ledger with no bill;
// each purchase bill is then settled from that money instead of a payment of
// its own. Computed from the source documents (not the lazily synced purchase
// vouchers) so it is right inside the transaction that saves a bill.

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The supplier's ledger balance, debit positive: + means our money is lying
 * with them (IOCL prints this as "CR"), − means we owe them.
 */
export async function plantBalance(db: Db | Tx, tenantId: string, supplierId: string) {
  const [account, bills, partyLedger] = await Promise.all([
    db.ledgerAccount.findUnique({ where: { tenantId_systemKey: { tenantId, systemKey: `PARTY:${supplierId}` } }, select: { id: true, openingBalance: true } }),
    db.purchaseBill.aggregate({ where: { tenantId, supplierId, status: { not: 'Cancelled' } }, _sum: { grandTotal: true } }),
    // Opening balance from the party master lives here (synced to the books later).
    db.ledgerEntry.aggregate({ where: { tenantId, ledgerType: 'CUSTOMER', customerId: supplierId }, _sum: { debit: true, credit: true } }),
  ]);
  let other = (partyLedger._sum.debit || 0) - (partyLedger._sum.credit || 0);
  if (account) {
    // Bills and party-ledger lines are counted from their sources above, not from their vouchers.
    const lines = await db.accountVoucherLine.aggregate({ where: { accountId: account.id, voucher: { cancelled: false, sourceType: { notIn: ['PURCHASE_BILL', 'CUSTOMER_LEDGER'] } } }, _sum: { debit: true, credit: true } });
    other += (account.openingBalance || 0) + (lines._sum.debit || 0) - (lines._sum.credit || 0);
  }
  return r2(other - (bills._sum.grandTotal || 0));
}

/**
 * Spread the supplier's unallocated advance over its bills, oldest first, and
 * refresh each bill's paid amount and status. Safe to run any time: it
 * recomputes the whole allocation, so cancelled deposits or bills unwind too.
 */
export async function settleFromAdvance(tx: Tx, tenantId: string, supplierId: string) {
  const bills = await tx.purchaseBill.findMany({ where: { tenantId, supplierId, status: { not: 'Cancelled' } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] });
  if (!bills.length) return;
  const paidByVoucher = await voucherPayments(tx, supplierId, bills.map((b) => b.id));
  // Advance not tied to any bill = ledger balance + what the bills still owe before any advance.
  let pool = (await plantBalance(tx, tenantId, supplierId)) + bills.reduce((s, b) => s + b.grandTotal - (paidByVoucher.get(b.id) || 0), 0);
  for (const b of bills) {
    const viaVoucher = paidByVoucher.get(b.id) || 0;
    const advance = r2(Math.max(0, Math.min(b.grandTotal - viaVoucher, pool)));
    pool -= advance;
    const paid = r2(viaVoucher + advance);
    const status = paid <= 0 ? 'Unpaid' : paid + 0.5 >= b.grandTotal ? 'Paid' : 'Partial';
    if (advance !== b.advanceAdjusted || paid !== b.paidAmount || status !== b.status) {
      await tx.purchaseBill.update({ where: { id: b.id }, data: { advanceAdjusted: advance, paidAmount: paid, status } });
    }
  }
}

/** Supplier-side debit of payment vouchers made against each bill. */
export async function voucherPayments(db: Db | Tx, supplierId: string, billIds: string[]) {
  const vouchers = await db.accountVoucher.findMany({ where: { againstBillId: { in: billIds }, cancelled: false }, select: { againstBillId: true, lines: { select: { debit: true, account: { select: { partyId: true } } } } } });
  const paid = new Map<string, number>();
  for (const v of vouchers) {
    const amount = v.lines.filter((l) => l.account.partyId === supplierId).reduce((s, l) => s + l.debit, 0);
    paid.set(v.againstBillId!, r2((paid.get(v.againstBillId!) || 0) + amount));
  }
  return paid;
}
