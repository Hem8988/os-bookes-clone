import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, ok, readJson } from '@/lib/server/http';

/** Register this browser for web-push notifications. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const body = await readJson<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>(request);
  if (!body.endpoint?.startsWith('https://') || !body.keys?.p256dh || !body.keys?.auth) throw badRequest('Invalid push subscription.');
  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: { userId: auth.userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    update: { userId: auth.userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
  });
  return ok(null);
});
