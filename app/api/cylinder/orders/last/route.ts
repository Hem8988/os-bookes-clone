import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, ok } from '@/lib/server/http';

/** A customer's most recent (not rejected / cancelled) order, for "repeat last order". */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  let customerId = new URL(request.url).searchParams.get('customerId') || '';
  if (auth.role === 'CUSTOMER') customerId = auth.customerId || '-';
  else if (auth.role !== 'DELIVERY_BOY' && !can(auth.role, 'orders.view') && !can(auth.role, 'orders.create')) throw forbidden();
  if (!customerId) return ok(null);

  const order = await prisma.order.findFirst({
    where: { tenantId: auth.tenantId, customerId, status: { notIn: ['REJECTED', 'CANCELLED'] } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!order) return ok(null);
  return ok({
    orderNumber: order.orderNumber,
    date: order.requestedDeliveryDate,
    items: order.items.filter((i) => i.productId && i.orderedQty > 0).map((i) => ({ productId: i.productId, qty: i.orderedQty })),
  });
});
