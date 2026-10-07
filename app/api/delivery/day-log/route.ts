import { prisma, transaction } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { requestDayReopen } from '@/lib/server/closing';
import { closeDay, daySummary, returnStock, returnTargets, startDay, type ReturnTarget } from '@/lib/server/deliveryDays';
import { Effects } from '@/lib/server/effects';
import { badRequest, businessDate, forbidden, handle, ok, readJson, str } from '@/lib/server/http';

/** Delivery boy's day: summary (GET) and Start / Close / request re-open (POST). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || businessDate();
  let deliveryBoyId = auth.userId;
  // Day-end hand-over choices (trucks, other delivery boys) for the boy himself.
  if (url.searchParams.get('targets') && auth.role === 'DELIVERY_BOY') return ok(await returnTargets(prisma, auth.tenantId, auth.userId));
  if (auth.role !== 'DELIVERY_BOY') {
    if (!can(auth.role, 'wallet.viewAll') && !can(auth.role, 'orders.assign')) throw forbidden();
    const requested = url.searchParams.get('deliveryBoyId');
    if (!requested) {
      const days = await prisma.deliveryDay.findMany({ where: { tenantId: auth.tenantId, date }, orderBy: { deliveryBoyName: 'asc' } });
      return ok(days);
    }
    deliveryBoyId = requested;
  }
  return ok(await daySummary(prisma, auth.tenantId, deliveryBoyId, date));
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute', { write: true });
  const body = await readJson(request);
  const action = String(body.action || '');
  const effects = new Effects();
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const result = await transaction(async (tx) => {
    if (action === 'START_DAY') return startDay(tx, auth, { latitude: num(body.latitude), longitude: num(body.longitude) });
    if (action === 'CLOSE_DAY') return closeDay(tx, auth);
    if (action === 'RETURN_STOCK') {
      const to = String(body.to || 'GODOWN');
      const target: ReturnTarget =
        to === 'TRUCK' ? { kind: 'TRUCK', vehicleNumber: str(body.vehicleNumber, 'Truck', { required: true, max: 20 }) }
        : to === 'BOY' ? { kind: 'BOY', deliveryBoyId: str(body.deliveryBoyId, 'Delivery boy', { required: true }) }
        : { kind: 'GODOWN' };
      return returnStock(tx, auth, target, effects);
    }
    if (action === 'REQUEST_REOPEN') {
      return requestDayReopen(tx, auth, { scope: 'DELIVERY_DAY', date: str(body.date, 'Date', { required: true }), reason: str(body.reason, 'Reason', { required: true, max: 300 }) }, effects);
    }
    throw badRequest('Unknown action.');
  });
  effects.schedule();
  const messages: Record<string, string> = { START_DAY: 'Day started.', CLOSE_DAY: 'Day closed. Entries are now locked.', RETURN_STOCK: 'Stock hand-over sent — the admin accepts it.', REQUEST_REOPEN: 'Re-open request sent to admin.' };
  return ok(result, messages[action]);
});
