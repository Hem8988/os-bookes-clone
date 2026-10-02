import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, ok, readJson, str } from '@/lib/server/http';
import { truckCode, truckGodown } from '@/lib/server/inventory';

/**
 * Trucks to pick on a purchase bill, an empties dispatch or a stock transfer:
 * our own vehicles (with their stock location, if they hold stock) plus every
 * truck number used on earlier loads, each with its last driver.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!can(auth.role, 'inventory.view') && !can(auth.role, 'books.view') && !can(auth.role, 'stock.transfer.request')) throw forbidden();
  const [own, used, godowns] = await Promise.all([
    prisma.vehicle.findMany({ where: { tenantId: auth.tenantId, active: true }, select: { number: true, type: true, driverName: true }, orderBy: { number: 'asc' } }),
    prisma.inventoryTransaction.findMany({
      where: { tenantId: auth.tenantId, vehicleNumber: { not: null } },
      select: { vehicleNumber: true, driverName: true, fromName: true, toName: true, toType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      distinct: ['vehicleNumber'],
      take: 300,
    }),
    prisma.warehouse.findMany({ where: { tenantId: auth.tenantId, active: true, code: { startsWith: 'TRK-' } }, select: { id: true, code: true } }),
  ]);
  const godownOf = new Map(godowns.map((g) => [g.code, g.id]));
  const trucks = new Map<string, { number: string; driverName: string | null; label: string; own: boolean; godownId: string | null }>();
  for (const t of used) {
    const number = t.vehicleNumber!;
    trucks.set(number, { number, driverName: t.driverName, label: (t.toType === 'WAREHOUSE' ? t.fromName : t.toName) || '', own: false, godownId: null });
  }
  for (const v of own) {
    const number = v.number.trim().replace(/\s+/g, ' ').toUpperCase();
    trucks.set(number, { number, driverName: v.driverName || trucks.get(number)?.driverName || null, label: `Own ${v.type}`, own: true, godownId: godownOf.get(truckCode(number)) ?? null });
  }
  return ok([...trucks.values()].sort((a, b) => Number(b.own) - Number(a.own) || a.number.localeCompare(b.number)));
});

/** Use one of our trucks as a stock location (mobile godown); returns that location. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, undefined, { write: true });
  if (!can(auth.role, 'stock.transfer.request') && !can(auth.role, 'books.manage') && !can(auth.role, 'inventory.receive')) throw forbidden();
  const body = await readJson(request);
  const number = str(body.vehicleNumber, 'Truck number', { required: true, max: 20 });
  // "Keep the load in my truck" on a purchase bill: add the truck to Vehicles if it isn't there yet.
  const plain = truckCode(number).slice(4);
  if (body.addVehicle === true && !(await prisma.vehicle.findFirst({ where: { tenantId: auth.tenantId, number: plain } }))) {
    const v = await prisma.vehicle.create({ data: { tenantId: auth.tenantId, number: plain, type: 'Truck', notes: 'Added from a purchase bill (holds stock)' } });
    await audit(prisma, auth, { action: 'VEHICLE_ADDED', entityType: 'Vehicle', entityId: v.id, reference: plain });
  }
  const before = await prisma.warehouse.findFirst({ where: { tenantId: auth.tenantId, code: truckCode(number), active: true }, select: { id: true } });
  const godown = await truckGodown(prisma, auth.tenantId, number);
  if (!before) await audit(prisma, auth, { action: 'TRUCK_GODOWN_OPENED', entityType: 'Warehouse', entityId: godown.id, reference: godown.name });
  return ok({ id: godown.id, name: godown.name, code: godown.code });
});
