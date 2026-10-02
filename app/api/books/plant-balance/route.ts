import { prisma, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { partyAccount, systemAccount } from '@/lib/server/books/accounts';
import { createManualVoucher } from '@/lib/server/books/entries';
import { plantBalance } from '@/lib/server/books/plantBalance';
import { badRequest, handle, num, ok, optStr, readJson, str } from '@/lib/server/http';

/** Plant balance (money lying with the supplier) for every supplier with bills or advances. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const [billed, ledgers] = await Promise.all([
    prisma.purchaseBill.findMany({ where: { tenantId: auth.tenantId }, distinct: ['supplierId'], select: { supplierId: true } }),
    prisma.ledgerAccount.findMany({ where: { tenantId: auth.tenantId, groupName: 'Sundry Creditors', partyId: { not: null }, lines: { some: { voucher: { cancelled: false } } } }, select: { partyId: true } }),
  ]);
  const ids = [...new Set([...billed.map((b) => b.supplierId), ...ledgers.map((l) => l.partyId!)])];
  const suppliers = await prisma.customer.findMany({ where: { tenantId: auth.tenantId, type: 'Vendor', id: { in: ids } }, select: { id: true, name: true } });
  const rows = await Promise.all(
    suppliers.map(async (s) => {
      const [balance, open] = await Promise.all([
        plantBalance(prisma, auth.tenantId, s.id),
        prisma.purchaseBill.aggregate({ where: { tenantId: auth.tenantId, supplierId: s.id, status: { in: ['Unpaid', 'Partial'] } }, _sum: { grandTotal: true, paidAmount: true }, _count: true }),
      ]);
      return { supplierId: s.id, name: s.name, balance, unpaidBills: open._count, unpaidAmount: Math.round(((open._sum.grandTotal || 0) - (open._sum.paidAmount || 0)) * 100) / 100 };
    })
  );
  return ok(rows.sort((a, b) => a.name.localeCompare(b.name)));
});

/**
 * Put money into the plant balance: a Payment from cash / bank to the supplier
 * with no bill, or (opening) the advance already lying with the supplier
 * before these books started. Unpaid bills are then settled from it, oldest first.
 */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const supplierId = str(body.supplierId, 'Supplier', { required: true });
  const amount = num(body.amount, 'Amount', { min: 0, required: true });
  if (amount <= 0) throw badRequest('Enter the amount.');
  const date = str(body.date, 'Date', { required: true });
  const opening = body.opening === true;
  const reference = optStr(body.reference);
  const voucher = await transaction(async (tx) => {
    const supplier = await tx.customer.findFirst({ where: { id: supplierId, tenantId: auth.tenantId } });
    if (!supplier) throw badRequest('Supplier not found.');
    const party = await partyAccount(tx, supplier);
    const other = opening ? await systemAccount(tx, auth.tenantId, 'CAPITAL') : await tx.ledgerAccount.findFirst({ where: { id: str(body.fromAccountId, 'Paid from', { required: true }), tenantId: auth.tenantId } });
    if (!other) throw badRequest('Choose the cash / bank ledger the money went from.');
    return createManualVoucher(tx, auth, {
      voucherType: opening ? 'JOURNAL' : 'PAYMENT',
      date,
      narration: opening ? `Opening plant balance with ${supplier.name}${reference ? ` · ${reference}` : ''}` : `Advance to ${supplier.name} (plant balance)${reference ? ` · ${reference}` : ''}`,
      lines: [
        { accountId: party.id, debit: amount },
        { accountId: other.id, credit: amount },
      ],
    });
  });
  return ok(voucher, `${voucher.voucherNumber} saved — plant balance updated.`);
});
