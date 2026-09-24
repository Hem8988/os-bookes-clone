import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { customerToClient } from '@/lib/server/customers';
import { forbidden, handle, notFound, ok } from '@/lib/server/http';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Customer 360 (SRS §1.2): profile, orders, deliveries with proof, invoices,
 * ledger, payments and cylinder holding — so the next delivery boy knows the
 * customer's history.
 */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;

  if (auth.role === 'CUSTOMER' && auth.customerId !== id) throw forbidden();
  if (auth.role === 'DELIVERY_BOY') {
    const assigned = await prisma.order.count({ where: { tenantId: auth.tenantId, customerId: id, assignedDeliveryBoyId: auth.userId } });
    if (!assigned) throw forbidden('You can only view customers of orders assigned to you.');
  } else if (auth.role !== 'CUSTOMER' && !can(auth.role, 'customers.view')) {
    throw forbidden();
  }

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: { deliveryAddresses: true, partyRates: true, cylinderBalances: true, vouchers: true, followUps: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!customer) throw notFound('Customer not found.');

  // Delivery boys get operational history (orders, deliveries, cylinders, dues) but not the books.
  const books = auth.role !== 'DELIVERY_BOY';
  const [orders, deliveries, invoices, ledger, payments] = await Promise.all([
    prisma.order.findMany({ where: { customerId: id }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.delivery.findMany({ where: { customerId: id }, include: { items: true }, orderBy: { submittedAt: 'desc' }, take: 20 }),
    books ? prisma.invoice.findMany({ where: { customerId: id }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 20 }) : [],
    books ? prisma.ledgerEntry.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' }, take: 50 }) : [],
    books ? prisma.payment.findMany({ where: { customerId: id, ...(auth.role === 'CUSTOMER' ? { status: 'VERIFIED' } : {}) }, orderBy: { createdAt: 'desc' }, take: 20 }) : [],
  ]);

  const profile = customerToClient(customer as unknown as Record<string, unknown>) as Record<string, unknown>;
  if (auth.role === 'CUSTOMER' || auth.role === 'DELIVERY_BOY') {
    delete profile.internalNotes; // internal only (SRS §5.2)
    delete profile.followUps;
  }
  return ok({ customer: profile, orders, deliveries, invoices, ledger: ledger.map((e) => ({ ...e, balance: e.runningBalance })), payments });
});
