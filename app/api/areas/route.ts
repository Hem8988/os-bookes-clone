import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { conflict, handle, ok, optStr, readJson, str } from '@/lib/server/http';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const areas = await prisma.area.findMany({ where: { tenantId: auth.tenantId }, include: { route: true }, orderBy: { name: 'asc' } });
  return ok(areas);
});

/** Create or update an area (drives route / delivery boy assignment). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'masters.manage', { write: true });
  const body = await readJson(request);
  const id = optStr(body.id);
  const code = str(body.code, 'Code', { required: true, max: 20 }).toUpperCase();
  const clash = await prisma.area.findFirst({ where: { tenantId: auth.tenantId, code, NOT: id ? { id } : undefined } });
  if (clash) throw conflict(`Area code ${code} already exists.`);
  const data = { code, name: str(body.name, 'Name', { required: true, max: 100 }), routeId: optStr(body.routeId), active: body.active !== false };
  const area = id ? await prisma.area.update({ where: { id }, data, include: { route: true } }) : await prisma.area.create({ data: { ...data, tenantId: auth.tenantId }, include: { route: true } });
  await audit(prisma, auth, { action: id ? 'AREA_UPDATED' : 'AREA_CREATED', entityType: 'Area', entityId: area.id, reference: area.name });
  return ok(area, 'Area saved.');
});
