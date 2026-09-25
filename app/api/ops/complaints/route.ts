import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { createComplaint, updateComplaint } from '@/lib/server/registers';

/** Staff see all complaints; a customer sees their own. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  if (auth.role !== 'CUSTOMER' && !can(auth.role, 'ops.view')) throw forbidden();
  const rows = await prisma.complaint.findMany({
    where: { tenantId: auth.tenantId, ...(auth.role === 'CUSTOMER' ? { customerId: auth.customerId || '-' } : {}), ...(status ? { status: { in: status.split(',') } } : {}) },
    orderBy: [{ createdAt: 'desc' }],
    take: 500,
  });
  const staff = auth.role === 'CUSTOMER' ? [] : await prisma.user.findMany({ where: { tenantId: auth.tenantId, status: 'ACTIVE', role: { in: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_BOY'] } }, select: { id: true, name: true, role: true } });
  return ok({ rows, staff });
});

/** Raise a complaint (staff for any customer, a customer from the portal). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const body = await readJson(request);
  if (auth.role !== 'CUSTOMER' && !can(auth.role, 'ops.manage')) throw forbidden();
  const c = await createComplaint(auth.tenantId, auth, {
    customerId: auth.role === 'CUSTOMER' ? auth.customerId : optStr(body.customerId),
    customerName: optStr(body.customerName) || undefined,
    phone: optStr(body.phone),
    category: str(body.category, 'Type', { required: true }),
    priority: optStr(body.priority) || undefined,
    description: str(body.description, 'Description', { required: true, max: 1000 }),
    orderNumber: optStr(body.orderNumber),
    source: auth.role === 'CUSTOMER' ? 'CUSTOMER_PORTAL' : 'STAFF',
  });
  return ok(c, `Complaint ${c.complaintNumber} registered.`);
});

/** { id, action: assign | resolve | close | reopen, assignedToId?, resolution? } */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.manage', { write: true });
  const body = await readJson(request);
  const c = await updateComplaint(auth.tenantId, auth, str(body.id, 'Complaint', { required: true }), { action: str(body.action, 'Action', { required: true }) as 'assign', assignedToId: optStr(body.assignedToId), resolution: optStr(body.resolution) });
  return ok(c, 'Complaint updated.');
});
