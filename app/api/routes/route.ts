import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, conflict, handle, ok, optStr, readJson, str } from '@/lib/server/http';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const routes = await prisma.route.findMany({ where: { tenantId: auth.tenantId }, include: { areas: true }, orderBy: { name: 'asc' } });
  return ok(routes);
});

/** Create or update a delivery route with its default delivery boy. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'masters.manage', { write: true });
  const body = await readJson(request);
  const id = optStr(body.id);
  const code = str(body.code, 'Code', { required: true, max: 20 }).toUpperCase();
  const clash = await prisma.route.findFirst({ where: { tenantId: auth.tenantId, code, NOT: id ? { id } : undefined } });
  if (clash) throw conflict(`Route code ${code} already exists.`);
  const boyId = optStr(body.defaultDeliveryBoyId);
  if (boyId && !(await prisma.user.findFirst({ where: { id: boyId, tenantId: auth.tenantId, role: 'DELIVERY_BOY' } }))) throw badRequest('Delivery boy not found.');
  const data = { code, name: str(body.name, 'Name', { required: true, max: 100 }), defaultDeliveryBoyId: boyId, active: body.active !== false };
  const route = id ? await prisma.route.update({ where: { id }, data, include: { areas: true } }) : await prisma.route.create({ data: { ...data, tenantId: auth.tenantId }, include: { areas: true } });
  await audit(prisma, auth, { action: id ? 'ROUTE_UPDATED' : 'ROUTE_CREATED', entityType: 'Route', entityId: route.id, reference: route.name });
  return ok(route, 'Route saved.');
});
