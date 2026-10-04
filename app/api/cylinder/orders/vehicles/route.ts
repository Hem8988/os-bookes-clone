import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, ok } from '@/lib/server/http';

/** Active vehicles to pick when creating / assigning an order, with the delivery boy each one is given to. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!can(auth.role, 'orders.create') && !can(auth.role, 'orders.assign')) throw forbidden();
  return ok(
    await prisma.vehicle.findMany({
      where: { tenantId: auth.tenantId, active: true },
      select: { id: true, number: true, type: true, driverUserId: true, driverName: true },
      orderBy: { number: 'asc' },
    })
  );
});
