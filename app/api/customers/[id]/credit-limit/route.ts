import { prisma, transaction } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, notFound, ok, readJson } from '@/lib/server/http';
import { EDITABLE_ORDER } from '@/lib/server/orders';

type Ctx = { params: Promise<{ id: string }> };

/** ₹1,000 crore: anything above is a typing slip, not a real limit. */
const MAX_LIMIT = 10_000_000_000;

/** Credit limit and outstanding, for the quick "change credit limit" box on the orders screen. */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'customers.view');
  const { id } = await ctx.params;
  const c = await prisma.customer.findFirst({ where: { id, tenantId: auth.tenantId }, select: { id: true, name: true, shortName: true, creditLimit: true, balance: true } });
  if (!c) throw notFound('Customer not found.');
  return ok(c);
});

/**
 * Change the credit limit, then re-check the customer's orders that are not
 * out for delivery yet, so their "credit limit" flag follows the new limit.
 */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'customers.manage', { write: true });
  const { id } = await ctx.params;
  const body = await readJson(request);
  const limit = Number(body.creditLimit);
  if (!Number.isFinite(limit) || limit < 0) throw badRequest('Enter a credit limit of 0 or more (0 = no limit).');
  if (limit > MAX_LIMIT) throw badRequest('Credit limit looks wrong — keep it up to ₹1,000 crore (or 0 for no limit).');

  const result = await transaction(async (tx) => {
    const before = await tx.customer.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!before) throw notFound('Customer not found.');
    const customer = await tx.customer.update({ where: { id }, data: { creditLimit: limit, updatedBy: auth.name } });
    const open = await tx.order.findMany({ where: { tenantId: auth.tenantId, customerId: id, status: { in: EDITABLE_ORDER } }, select: { id: true, totalAmount: true, isCreditOverLimit: true } });
    let cleared = 0;
    for (const o of open) {
      const over = limit > 0 && customer.balance + o.totalAmount > limit;
      if (over !== o.isCreditOverLimit) {
        await tx.order.update({ where: { id: o.id }, data: { isCreditOverLimit: over, updatedBy: auth.name } });
        if (!over) cleared++;
      }
    }
    await audit(tx, auth, {
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: id,
      reference: `${customer.customerCode} ${customer.name}`,
      oldValue: { creditLimit: before.creditLimit },
      newValue: { creditLimit: limit },
      sensitive: true,
    });
    return { creditLimit: limit, cleared };
  });
  return ok(result, result.cleared ? `Credit limit saved. ${result.cleared} pending order(s) are within the limit now.` : 'Credit limit saved.');
});
