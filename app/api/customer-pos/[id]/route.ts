import { prisma, transaction } from '@/lib/db';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { poToClient, setPoStatus, updateCustomerPo } from '@/lib/server/customerPos';
import { conflict, forbidden, handle, notFound, ok, optStr, readJson } from '@/lib/server/http';

type Ctx = { params: Promise<{ id: string }> };

async function load(tenantId: string, id: string) {
  const po = await prisma.customerPo.findFirst({
    where: { id, tenantId },
    include: {
      items: true,
      customer: { select: { name: true, shortName: true, customerCode: true } },
      orders: { select: { id: true, orderNumber: true, status: true, requestedDeliveryDate: true, totalAmount: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!po) throw notFound('PO not found.');
  return po;
}

export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const po = await load(auth.tenantId, id);
  if (!(can(auth.role, 'orders.view') || (auth.role === 'CUSTOMER' && po.customerId === auth.customerId))) throw forbidden();
  return ok(poToClient(po));
});

/** body.action: edit (default) | accept | cancel | reopen. A customer may only edit their own PO before the office accepts it. */
export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const { id } = await ctx.params;
  const body = await readJson(request);
  const po = await load(auth.tenantId, id);
  const own = auth.role === 'CUSTOMER' && po.customerId === auth.customerId;
  if (!can(auth.role, 'orders.create') && !own) throw forbidden();
  const action = String(body.action || 'edit');
  if (action === 'edit') {
    await transaction((tx) => updateCustomerPo(tx, auth, id, { ...body, customerId: po.customerId }));
    return ok(poToClient(await load(auth.tenantId, id)), `PO ${po.poNumber} updated.`);
  }
  if (auth.role === 'CUSTOMER') throw forbidden();
  if (action !== 'accept' && action !== 'cancel' && action !== 'reopen') throw forbidden('Unknown action.');
  await transaction((tx) => setPoStatus(tx, auth, id, action, optStr(body.reason)));
  return ok(poToClient(await load(auth.tenantId, id)), `PO ${po.poNumber} ${action === 'accept' ? 'accepted' : action === 'cancel' ? 'cancelled' : 'reopened'}.`);
});

/** Delete a PO entered by mistake — only while no order uses it. */
export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'orders.create', { write: true });
  const { id } = await ctx.params;
  const po = await load(auth.tenantId, id);
  if (po.orders.length) throw conflict('Orders are linked to this PO — cancel it instead.');
  await transaction(async (tx) => {
    await tx.customerPo.delete({ where: { id } });
    await audit(tx, auth, { action: 'CUSTOMER_PO_DELETE', entityType: 'CustomerPo', entityId: id, reference: po.poNumber, oldValue: po });
  });
  return ok(null, `PO ${po.poNumber} deleted.`);
});
