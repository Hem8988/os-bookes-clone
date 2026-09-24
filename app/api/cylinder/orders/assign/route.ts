import { prisma, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { badRequest, handle, ok, readJson, str } from '@/lib/server/http';
import { assignOrders } from '@/lib/server/orders';

/** Bulk assign / reassign several approved orders to one delivery boy. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'orders.assign', { write: true });
  const body = await readJson(request);
  const ids = Array.isArray(body.orderIds) ? body.orderIds.map(String) : [];
  if (ids.length === 0) throw badRequest('Select at least one order.');
  const deliveryBoyId = str(body.deliveryBoyId, 'Delivery boy', { required: true });
  const effects = new Effects();
  await transaction(async (tx) => {
    const orders = await tx.order.findMany({ where: { id: { in: ids }, tenantId: auth.tenantId } });
    if (orders.length !== ids.length) throw badRequest('Some orders were not found.');
    await assignOrders(tx, auth, orders, deliveryBoyId, effects);
  });
  effects.schedule();
  return ok(await prisma.order.findMany({ where: { id: { in: ids } } }), `${ids.length} order(s) assigned.`);
});
