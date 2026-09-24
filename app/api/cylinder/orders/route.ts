import { transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { forbidden, handle, ok, optStr, readJson } from '@/lib/server/http';
import { createOrder, OrderSource } from '@/lib/server/orders';
import { prisma } from '@/lib/db';
import { withShortNames } from '@/lib/server/shortNames';

const ACTIVE_FOR_BOY = ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'SENT_BACK', 'PENDING_VERIFICATION', 'DELIVERED'];

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const where: Prisma.OrderWhereInput = { tenantId: auth.tenantId };

  const status = url.searchParams.get('status');
  if (status) where.status = { in: status.split(',') };
  const date = url.searchParams.get('date');
  if (date) where.requestedDeliveryDate = date;
  const search = url.searchParams.get('search')?.trim();
  if (search) where.OR = [{ orderNumber: { contains: search, mode: 'insensitive' } }, { customerName: { contains: search, mode: 'insensitive' } }, { customer: { shortName: { contains: search, mode: 'insensitive' } } }, { customerPhone: { contains: search } }];

  if (auth.role === 'DELIVERY_BOY') {
    where.assignedDeliveryBoyId = auth.userId;
    if (!status) {
      // Plus his own field orders still waiting on the office (rejections shown for 3 days).
      const recent = new Date(Date.now() - 3 * 86_400_000);
      where.AND = [
        {
          OR: [
            { status: { in: ACTIVE_FOR_BOY } },
            { source: 'DELIVERY_BOY', status: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
            { source: 'DELIVERY_BOY', status: 'REJECTED', updatedAt: { gte: recent } },
          ],
        },
      ];
    }
  } else if (auth.role === 'CUSTOMER') {
    where.customerId = auth.customerId || '-';
  } else {
    if (!can(auth.role, 'orders.view')) throw forbidden();
    const customerId = url.searchParams.get('customerId');
    if (customerId) where.customerId = customerId;
    const boy = url.searchParams.get('deliveryBoyId');
    if (boy) where.assignedDeliveryBoyId = boy === 'UNASSIGNED' ? null : boy;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      deliveries: { include: { items: true }, orderBy: { submittedAt: 'desc' } },
      customer: auth.role === 'DELIVERY_BOY' ? { select: { contactPerson: true, phone: true, whatsappNumber: true, balance: true, area: true } } : false,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(Number(url.searchParams.get('limit')) || 200, 500),
  });
  return ok(await withShortNames(auth.tenantId, orders));
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const body = await readJson(request);
  let source: OrderSource = body.source === 'ADMIN' ? 'ADMIN' : 'MANUAL';
  let customerId = String(body.customerId || '');
  let assignedDeliveryBoyId = optStr(body.assignedDeliveryBoyId);

  if (auth.role === 'CUSTOMER') {
    source = 'CUSTOMER_PORTAL';
    customerId = auth.customerId || '';
    assignedDeliveryBoyId = null;
  } else if (auth.role === 'DELIVERY_BOY') {
    source = 'DELIVERY_BOY';
    assignedDeliveryBoyId = auth.userId;
  } else if (!can(auth.role, 'orders.create')) {
    throw forbidden();
  }

  const effects = new Effects();
  const order = await transaction((tx) =>
    createOrder(
      tx,
      auth,
      {
        customerId,
        source,
        items: Array.isArray(body.items) ? (body.items as { productId: string; qty: number }[]).map((i) => ({ productId: String(i.productId), qty: Number(i.qty) })) : [],
        requestedDeliveryDate: optStr(body.requestedDeliveryDate) || undefined,
        deliveryAddressId: optStr(body.deliveryAddressId),
        priority: body.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
        notes: optStr(body.notes),
        assignedDeliveryBoyId,
      },
      effects
    )
  );
  effects.schedule();
  const fresh = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
  return ok(fresh, fresh?.status === 'PENDING_APPROVAL' ? `Order ${order.orderNumber} sent for approval.` : `Order ${order.orderNumber} created.`);
});
