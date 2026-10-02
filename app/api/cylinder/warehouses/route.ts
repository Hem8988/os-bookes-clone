import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { autoCode, conflict, handle, ok, optStr, readJson, str } from '@/lib/server/http';

export const GET = handle(async (request: Request) => {
  // Delivery boys need the list to request stock issue / return.
  const auth = await requireAuth(request, ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_BOY']);
  return ok(await prisma.warehouse.findMany({ where: { tenantId: auth.tenantId, ...(auth.role === 'DELIVERY_BOY' ? { active: true } : {}) }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }));
});

/** Create or update a godown / branch warehouse. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage', { write: true });
  const body = await readJson(request);
  const id = optStr(body.id);
  const name = str(body.name, 'Name', { required: true, max: 100 });
  const code = await autoCode(body.code, name, async (c) => !!(await prisma.warehouse.findFirst({ where: { tenantId: auth.tenantId, code: c, NOT: id ? { id } : undefined } })));
  const data = { code, name, address: optStr(body.address), active: body.active !== false };
  const clash = await prisma.warehouse.findFirst({ where: { tenantId: auth.tenantId, code, NOT: id ? { id } : undefined } });
  if (clash) throw conflict(`Warehouse code ${code} already exists.`);
  const warehouse = id
    ? await prisma.warehouse.update({ where: { id }, data })
    : await prisma.warehouse.create({ data: { ...data, tenantId: auth.tenantId, isDefault: (await prisma.warehouse.count({ where: { tenantId: auth.tenantId } })) === 0 } });
  await audit(prisma, auth, { action: id ? 'WAREHOUSE_UPDATED' : 'WAREHOUSE_CREATED', entityType: 'Warehouse', entityId: warehouse.id, reference: warehouse.name });
  return ok(warehouse, 'Warehouse saved.');
});
