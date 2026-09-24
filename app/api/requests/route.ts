import { prisma, transaction } from '@/lib/db';
import { createApproval } from '@/lib/server/approvals';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { badRequest, handle, ok, readJson, str } from '@/lib/server/http';

const KINDS: Record<string, string> = {
  EXTRA_CYLINDERS: 'Extra cylinders',
  CASH_ADVANCE: 'Cash advance',
  VEHICLE_ISSUE: 'Vehicle issue',
  OTHER: 'Other',
};

/** Delivery boy's own field requests and their status. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute');
  const rows = await prisma.approvalRequest.findMany({ where: { tenantId: auth.tenantId, requestedById: auth.userId, type: 'FIELD_REQUEST' }, orderBy: { createdAt: 'desc' }, take: 50 });
  return ok(rows);
});

/** Raise a request to the manager (goes to the approval queue as FIELD_REQUEST). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute', { write: true });
  const body = await readJson(request);
  const kind = String(body.kind || '');
  if (!KINDS[kind]) throw badRequest('Choose a request type.');
  const note = str(body.note, 'Details', { required: true, max: 500 });
  const qty = Number(body.qty || 0);
  const amount = Number(body.amount || 0);
  const effects = new Effects();
  const item = await transaction((tx) =>
    createApproval(
      tx,
      {
        tenantId: auth.tenantId,
        type: 'FIELD_REQUEST',
        referenceType: 'FIELD_REQUEST',
        title: `${KINDS[kind]} — ${auth.name}`,
        summary: `${note}${qty ? ` · Qty ${qty}` : ''}${amount ? ` · ₹${amount}` : ''}`,
        payload: { kind, note, qty, amount },
        requestedById: auth.userId,
        requestedByName: auth.name,
      },
      effects
    )
  );
  effects.schedule();
  return ok(item, 'Request sent to the manager.');
});
