import { prisma, transaction } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { badRequest, forbidden, handle, notFound, ok, readJson, str } from '@/lib/server/http';
import { acceptOrder, assignOrders, cancelOrder, dispatchOrder } from '@/lib/server/orders';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: { items: true, statusLogs: { orderBy: { createdAt: 'asc' } }, deliveries: { include: { items: true } } },
  });
  if (!order) throw notFound('Order not found.');
  const allowed =
    can(auth.role, 'orders.view') ||
    (auth.role === 'DELIVERY_BOY' && order.assignedDeliveryBoyId === auth.userId) ||
    (auth.role === 'CUSTOMER' && order.customerId === auth.customerId);
  if (!allowed) throw forbidden();
  const approvals = can(auth.role, 'approvals.view')
    ? await prisma.approvalRequest.findMany({ where: { tenantId: auth.tenantId, referenceId: { in: [order.id, ...order.deliveries.map((d) => d.id)] } }, include: { logs: true }, orderBy: { createdAt: 'asc' } })
    : [];
  return ok({ ...order, approvals });
});

/**
 * Lifecycle actions. Approve/reject go through the approval queue
 * (/api/cylinder/approval-queue); these are the operational steps.
 */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const { id } = await ctx.params;
  const body = await readJson(request);
  const action = String(body.action || '');
  const effects = new Effects();

  const result = await transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!order) throw notFound('Order not found.');
    switch (action) {
      case 'assign':
        if (!can(auth.role, 'orders.assign')) throw forbidden();
        await assignOrders(tx, auth, [order], str(body.deliveryBoyId, 'Delivery boy', { required: true }), effects);
        return 'Delivery boy assigned.';
      case 'accept':
        if (auth.role !== 'DELIVERY_BOY') throw forbidden();
        await acceptOrder(tx, auth, order);
        return 'Order accepted.';
      case 'dispatch':
        if (auth.role !== 'DELIVERY_BOY') throw forbidden();
        await dispatchOrder(tx, auth, order, effects);
        return 'Marked out for delivery.';
      case 'cancel':
        if (!can(auth.role, 'orders.approve')) throw forbidden();
        await cancelOrder(tx, auth, order, str(body.reason, 'Reason', { required: true, max: 300 }));
        return 'Order cancelled.';
      default:
        throw badRequest('Unknown action.');
    }
  });
  effects.schedule();
  return ok(await prisma.order.findUnique({ where: { id }, include: { items: true } }), result);
});
