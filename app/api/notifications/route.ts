import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { handle, ok, readJson } from '@/lib/server/http';

/** In-app notification bell. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { userId: auth.userId, readAt: null } }),
  ]);
  return ok({ items, unread });
});

/** { ids?: string[] } — mark some or all as read. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request);
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : null;
  await prisma.notification.updateMany({ where: { userId: auth.userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  return ok(null);
});
