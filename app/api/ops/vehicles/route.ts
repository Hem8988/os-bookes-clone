import { prisma, transaction } from '@/lib/db';
import { fyStart } from '@/lib/books';
import { requireAuth } from '@/lib/server/auth';
import { businessDate, handle, num, ok, optStr, readJson, str } from '@/lib/server/http';
import { addVehicleLog, saveVehicle, vehicleAlerts, vehicleCosts, VehicleInput } from '@/lib/server/registers';

/** Vehicles with recent logs, document alerts and FY-to-date cost per km. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.view');
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || businessDate();
  const from = url.searchParams.get('from') || fyStart(to);
  const [vehicles, alerts, costs, drivers] = await Promise.all([
    prisma.vehicle.findMany({ where: { tenantId: auth.tenantId }, include: { logs: { orderBy: { date: 'desc' }, take: 20 } }, orderBy: { number: 'asc' } }),
    vehicleAlerts(auth.tenantId),
    vehicleCosts(auth.tenantId, from, to),
    prisma.user.findMany({ where: { tenantId: auth.tenantId, role: 'DELIVERY_BOY', status: 'ACTIVE' }, select: { id: true, name: true } }),
  ]);
  return ok({ vehicles, alerts, costs, drivers, from, to });
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.manage', { write: true });
  const body = await readJson(request);
  return ok(await saveVehicle(auth.tenantId, body as unknown as VehicleInput, auth, optStr(body.id)), 'Vehicle saved.');
});

/** Add a fuel / service / repair log (with an amount it is booked as an expense). */
export const PUT = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.manage', { write: true });
  const body = await readJson(request);
  const log = await transaction((tx) =>
    addVehicleLog(tx, auth, {
      vehicleId: str(body.vehicleId, 'Vehicle', { required: true }),
      date: str(body.date, 'Date', { required: true }),
      kind: str(body.kind, 'Type', { required: true }),
      odometer: body.odometer ? num(body.odometer, 'Odometer', { min: 0 }) : null,
      litres: body.litres ? num(body.litres, 'Litres', { min: 0 }) : null,
      amount: num(body.amount, 'Amount', { min: 0 }),
      paidFrom: (optStr(body.paidFrom) || 'CASH') as 'CASH',
      paidAccountId: optStr(body.paidAccountId),
      supplierId: optStr(body.supplierId),
      notes: optStr(body.notes),
    })
  );
  return ok(log, log.expenseEntryId ? 'Saved and booked as an expense.' : 'Saved.');
});
