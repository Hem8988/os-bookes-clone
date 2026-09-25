import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { businessDate, forbidden, handle, ok } from '@/lib/server/http';
import { routePlan } from '@/lib/server/routePlan';

/** GET ?date&deliveryBoyId&start=lat,lng → ordered stops + Google Maps links. A delivery boy gets his own route. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  let deliveryBoyId = url.searchParams.get('deliveryBoyId');
  if (auth.role === 'DELIVERY_BOY') deliveryBoyId = auth.userId;
  else if (!can(auth.role, 'ops.view')) throw forbidden();
  const m = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(url.searchParams.get('start') || '');
  const start = m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date')! : businessDate();
  const [plan, boys] = await Promise.all([
    routePlan(auth.tenantId, { date, deliveryBoyId, start }),
    auth.role === 'DELIVERY_BOY' ? [] : prisma.user.findMany({ where: { tenantId: auth.tenantId, role: 'DELIVERY_BOY', status: 'ACTIVE' }, select: { id: true, name: true } }),
  ]);
  return ok({ ...plan, deliveryBoys: boys });
});
