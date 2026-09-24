import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { submitCash } from '@/lib/server/cash';
import { Effects } from '@/lib/server/effects';
import { forbidden, handle, ok, optStr, readJson, str } from '@/lib/server/http';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const where: Prisma.CashSubmissionWhereInput = { tenantId: auth.tenantId };
  if (auth.role === 'DELIVERY_BOY') where.deliveryBoyId = auth.userId;
  else if (!can(auth.role, 'wallet.viewAll')) throw forbidden();
  const date = url.searchParams.get('date');
  if (date) where.date = date;
  const status = url.searchParams.get('status');
  if (status) where.status = status;
  return ok(await prisma.cashSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }));
});

/** Delivery boy hands over cash to an accountant/admin. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute', { write: true });
  const body = await readJson(request);
  const effects = new Effects();
  const submission = await transaction((tx) =>
    submitCash(tx, auth, { amount: Number(body.amount), receiverId: str(body.receiverId, 'Receiver', { required: true }), proofUrl: optStr(body.proofUrl) }, effects)
  );
  effects.schedule();
  return ok(submission, `₹${submission.amount.toLocaleString('en-IN')} submitted to ${submission.receiverName} for confirmation.`);
});
