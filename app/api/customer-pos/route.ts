import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { createCustomerPo, poToClient } from '@/lib/server/customerPos';
import { notifyRoles } from '@/lib/server/notify';
import { forbidden, handle, ok, readJson } from '@/lib/server/http';

/** Customer POs: the office sees all (filter by customer / status), a customer only their own. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const where: Prisma.CustomerPoWhereInput = { tenantId: auth.tenantId };
  if (auth.role === 'CUSTOMER') where.customerId = auth.customerId || '-';
  else {
    if (!can(auth.role, 'orders.view')) throw forbidden();
    const customerId = url.searchParams.get('customerId');
    if (customerId) where.customerId = customerId;
  }
  const status = url.searchParams.get('status');
  // OPEN also covers PARTIAL: both can still be supplied against.
  if (status) where.status = { in: status.split(',').flatMap((s) => (s === 'OPEN' ? ['OPEN', 'PARTIAL'] : [s])) };
  const search = url.searchParams.get('search')?.trim();
  if (search) where.OR = [{ poNumber: { contains: search, mode: 'insensitive' } }, { customer: { name: { contains: search, mode: 'insensitive' } } }, { customer: { shortName: { contains: search, mode: 'insensitive' } } }];
  const rows = await prisma.customerPo.findMany({
    where,
    include: { items: true, customer: { select: { name: true, shortName: true, customerCode: true } }, _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(url.searchParams.get('limit')) || 200, 500),
  });
  return ok(rows.map(poToClient));
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const body = await readJson(request);
  let customerId = String(body.customerId || '');
  if (auth.role === 'CUSTOMER') customerId = auth.customerId || '';
  else if (!can(auth.role, 'orders.create')) throw forbidden();
  const po = await transaction((tx) => createCustomerPo(tx, auth, { ...body, customerId }));
  if (auth.role === 'CUSTOMER') {
    void notifyRoles(auth.tenantId, ['SUPER_ADMIN', 'MANAGER'], { title: `New PO ${po.poNumber}`, body: `${auth.name} uploaded a purchase order. Check and accept it.`, link: '/admin?tab=customer-pos' }).catch(() => {});
  }
  return ok(po, auth.role === 'CUSTOMER' ? `PO ${po.poNumber} sent to the office.` : `PO ${po.poNumber} saved.`);
});
