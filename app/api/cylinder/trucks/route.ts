import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, ok } from '@/lib/server/http';

/**
 * Trucks to pick on a purchase bill or an empties dispatch: our own vehicles
 * plus every truck number used on earlier loads, each with its last driver.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!can(auth.role, 'inventory.view') && !can(auth.role, 'books.view')) throw forbidden();
  const [own, used] = await Promise.all([
    prisma.vehicle.findMany({ where: { tenantId: auth.tenantId, active: true }, select: { number: true, type: true, driverName: true }, orderBy: { number: 'asc' } }),
    prisma.inventoryTransaction.findMany({
      where: { tenantId: auth.tenantId, vehicleNumber: { not: null } },
      select: { vehicleNumber: true, driverName: true, fromName: true, toName: true, toType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      distinct: ['vehicleNumber'],
      take: 300,
    }),
  ]);
  const trucks = new Map<string, { number: string; driverName: string | null; label: string; own: boolean }>();
  for (const t of used) {
    const number = t.vehicleNumber!;
    trucks.set(number, { number, driverName: t.driverName, label: (t.toType === 'WAREHOUSE' ? t.fromName : t.toName) || '', own: false });
  }
  for (const v of own) {
    const number = v.number.trim().replace(/\s+/g, ' ').toUpperCase();
    trucks.set(number, { number, driverName: v.driverName || trucks.get(number)?.driverName || null, label: `Own ${v.type}`, own: true });
  }
  return ok([...trucks.values()].sort((a, b) => Number(b.own) - Number(a.own) || a.number.localeCompare(b.number)));
});
