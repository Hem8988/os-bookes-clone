import { prisma } from '@/lib/db';
import { requireAuth, rateLimit } from '@/lib/server/auth';
import { badRequest, handle, ok, readJson } from '@/lib/server/http';

/** Latest position of every delivery boy (manager / admin). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'tracking.view');
  const locations = await prisma.deliveryLocation.findMany({ where: { tenantId: auth.tenantId }, orderBy: { recordedAt: 'desc' } });
  return ok(locations);
});

/** Location ping from the delivery app while the day is running. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute');
  rateLimit(`gps:${auth.userId}`, 12, 60_000);
  const body = await readJson(request);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw badRequest('Invalid location.');
  const opt = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const data = { latitude, longitude, accuracy: opt(body.accuracy), speedKmh: opt(body.speedKmh), batteryPercent: opt(body.batteryPercent), recordedAt: new Date(), deliveryBoyName: auth.name };
  await prisma.deliveryLocation.upsert({
    where: { tenantId_deliveryBoyId: { tenantId: auth.tenantId, deliveryBoyId: auth.userId } },
    create: { tenantId: auth.tenantId, deliveryBoyId: auth.userId, ...data },
    update: data,
  });
  return ok(null);
});
