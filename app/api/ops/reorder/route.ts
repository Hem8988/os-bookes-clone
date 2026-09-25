import { requireAuth } from '@/lib/server/auth';
import { badRequest, businessDate, handle, num, ok, readJson, str } from '@/lib/server/http';
import { createReorder, reorderPlan, ReorderMode, setReorderSetting } from '@/lib/server/reorder';

/** GET ?days=7 → customers and when their usual refill is due. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.view');
  const days = Math.min(60, Math.max(0, Number(new URL(request.url).searchParams.get('days') ?? 7) || 0));
  return ok(await reorderPlan(auth.tenantId, businessDate(), days));
});

/** { customerId } → create the usual order now (goes for approval). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.manage', { write: true });
  const body = await readJson(request);
  const order = await createReorder(auth, str(body.customerId, 'Customer', { required: true }));
  return ok(order, `Order ${order.orderNumber} created${order.status === 'PENDING_APPROVAL' ? ' — waiting for approval' : ''}.`);
});

/** { customerId, mode: OFF | SUGGEST | REMIND | ORDER, everyDays? } */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.manage', { write: true });
  const body = await readJson(request);
  const mode = str(body.mode, 'Mode', { required: true }) as ReorderMode;
  if (!['OFF', 'SUGGEST', 'REMIND', 'ORDER'].includes(mode)) throw badRequest('Unknown mode.');
  await setReorderSetting(auth, str(body.customerId, 'Customer', { required: true }), { mode, everyDays: body.everyDays ? num(body.everyDays, 'Every (days)', { min: 1 }) : null });
  return ok(null, 'Saved.');
});
