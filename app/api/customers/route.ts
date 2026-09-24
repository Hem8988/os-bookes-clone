import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { createCustomer, customerToClient } from '@/lib/server/customers';
import { forbidden, handle, ok, readJson } from '@/lib/server/http';

/** Customer search for pickers (orders, payments, field orders). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!can(auth.role, 'customers.view') && auth.role !== 'DELIVERY_BOY') throw forbidden();
  const url = new URL(request.url);
  const where: Prisma.CustomerWhereInput = { tenantId: auth.tenantId, type: url.searchParams.get('type') === 'Vendor' ? 'Vendor' : 'Customer' };
  const status = url.searchParams.get('status');
  where.status = status ? status : auth.role === 'DELIVERY_BOY' ? 'ACTIVE' : { in: ['ACTIVE', 'INACTIVE', 'BLOCKED'] };
  const area = url.searchParams.get('area');
  if (area) where.area = area;
  const search = url.searchParams.get('search')?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { tradeName: { contains: search, mode: 'insensitive' } },
      { customerCode: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { whatsappNumber: { contains: search } },
      { gstin: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (auth.role === 'DELIVERY_BOY') {
    const rows = await prisma.customer.findMany({
      where,
      select: { id: true, customerCode: true, name: true, phone: true, address: true, area: true, defaultProductIds: true, deliveryAddresses: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
    return ok(rows);
  }
  const rows = await prisma.customer.findMany({ where, include: { deliveryAddresses: true, cylinderBalances: true }, orderBy: { name: 'asc' }, take: 500 });
  return ok(rows.map((c) => customerToClient(c as unknown as Record<string, unknown>)));
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'customers.manage', { write: true });
  const body = await readJson(request);
  const customer = await transaction((tx) => createCustomer(tx, auth, body));
  return ok(customer, `Customer ${customer.customerCode} created.`);
});
