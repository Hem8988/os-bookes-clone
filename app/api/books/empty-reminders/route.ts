import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, businessDate, handle, ok, readJson } from '@/lib/server/http';
import { notifyCustomer } from '@/lib/server/notify';
import { emptyCylinderAgeing } from '@/lib/server/ownerReport';

/** Remind customers with overdue empties (all overdue, or the ids given). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const only = Array.isArray(body.customerIds) ? new Set((body.customerIds as unknown[]).map(String)) : null;
  const rows = (await emptyCylinderAgeing(auth.tenantId, businessDate())).filter((r) => r.overdue && (!only || only.has(r.customerId)));
  if (!rows.length) throw badRequest('No customer has overdue empty cylinders.');
  const byCustomer = new Map<string, { cylinders: number; days: number }>();
  rows.forEach((r) => {
    const x = byCustomer.get(r.customerId) || { cylinders: 0, days: 0 };
    x.cylinders += r.holding;
    x.days = Math.max(x.days, r.daysSinceReturn);
    byCustomer.set(r.customerId, x);
  });
  const customers = await prisma.customer.findMany({ where: { tenantId: auth.tenantId, id: { in: [...byCustomer.keys()] } } });
  for (const c of customers) {
    const x = byCustomer.get(c.id)!;
    await notifyCustomer(auth.tenantId, c, 'EMPTY_CYLINDER_REMINDER', { cylinders: x.cylinders, days: x.days }, 'Empty cylinders to return');
  }
  await audit(prisma, auth, { action: 'EMPTY_REMINDERS_SENT', entityType: 'Customer', reference: `${customers.length} customers`, newValue: customers.map((c) => c.name) });
  return ok({ sent: customers.length }, `Reminder sent to ${customers.length} customer(s).`);
});
