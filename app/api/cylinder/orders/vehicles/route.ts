import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, ok } from '@/lib/server/http';
import { deliveryBoyVehicle } from '@/lib/server/orders';

/** Active vehicles to pick when creating / assigning an order, with the delivery boy each one is given to. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const isBoy = auth.role === 'DELIVERY_BOY';
  if (!isBoy && !can(auth.role, 'orders.create') && !can(auth.role, 'orders.assign')) throw forbidden();
  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: auth.tenantId, active: true },
    select: { id: true, number: true, type: true, driverUserId: true, driverName: true },
    orderBy: { number: 'asc' },
  });
  // Delivery boy app: also his own vehicle, to pre-fill his field orders.
  if (isBoy) return ok({ vehicles, mine: await deliveryBoyVehicle(prisma, auth.tenantId, auth.userId, auth.name) });
  return ok(vehicles);
});
