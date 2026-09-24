import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, notFound, ok } from '@/lib/server/http';

/**
 * Cylinder movement history. With ?customerId → that customer's cylinder
 * ledger with running balance (Opening + Delivered − Empty ± Adjustment);
 * otherwise the latest inventory transactions for the stock screens.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const customerId = auth.role === 'CUSTOMER' ? auth.customerId : url.searchParams.get('customerId');

  if (customerId) {
    if (auth.role !== 'CUSTOMER' && !can(auth.role, 'customers.view') && auth.role !== 'DELIVERY_BOY') throw forbidden();
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: auth.tenantId }, include: { cylinderBalances: true } });
    if (!customer) throw notFound('Customer not found.');
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { tenantId: auth.tenantId, OR: [{ fromType: 'CUSTOMER', fromId: customerId }, { toType: 'CUSTOMER', toId: customerId }] },
      orderBy: { createdAt: 'asc' },
    });
    const running = new Map<string, number>();
    customer.cylinderBalances.forEach((b) => running.set(b.productId, b.openingQty));
    const history = transactions
      .filter((t) => t.transactionType !== 'OPENING')
      .map((t) => {
        const change =
          t.transactionType === 'SALE'
            ? t.fullQty
            : t.transactionType === 'EMPTY_RETURN'
              ? -t.emptyQty
              : t.transactionType === 'ADJUSTMENT'
                ? t.fullQty
                : t.transactionType === 'REVERSAL'
                  ? t.emptyQty - t.fullQty
                  : 0;
        const balance = (running.get(t.productId) || 0) + change;
        running.set(t.productId, balance);
        return { id: t.id, date: t.createdAt, type: t.transactionType, productName: t.productName, full: t.fullQty, empty: t.emptyQty, change, balance, reference: t.referenceNumber, reason: t.reason, by: t.performedBy };
      });
    return ok({ customer: { id: customer.id, name: customer.name }, balances: customer.cylinderBalances, history: history.reverse() });
  }

  if (!can(auth.role, 'inventory.view')) throw forbidden();
  const where: Prisma.InventoryTransactionWhereInput = { tenantId: auth.tenantId };
  const type = url.searchParams.get('type');
  if (type) where.transactionType = { in: type.split(',') };
  const locationId = url.searchParams.get('locationId');
  if (locationId) where.OR = [{ fromId: locationId }, { toId: locationId }];
  const transactions = await prisma.inventoryTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(Number(url.searchParams.get('limit')) || 200, 1000) });
  return ok(transactions);
});
