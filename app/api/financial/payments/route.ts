import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { forbidden, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { recordPayment } from '@/lib/server/payments';
import { withShortNames } from '@/lib/server/shortNames';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const where: Prisma.PaymentWhereInput = { tenantId: auth.tenantId };
  if (auth.role === 'CUSTOMER') {
    where.customerId = auth.customerId || '-';
    where.status = 'VERIFIED';
  } else {
    if (!can(auth.role, 'ledger.view')) throw forbidden();
    const customerId = url.searchParams.get('customerId');
    if (customerId) where.customerId = customerId;
    const status = url.searchParams.get('status');
    if (status) where.status = status;
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (from || to) where.paymentDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }
  return ok(await withShortNames(auth.tenantId, await prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 })));
});

/** Late payment entry by accounts → Payment Verification queue (SRS §11.5). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'payments.enter', { write: true });
  const body = await readJson(request);
  const effects = new Effects();
  const payment = await transaction((tx) =>
    recordPayment(
      tx,
      auth,
      {
        customerId: str(body.customerId, 'Customer', { required: true }),
        amount: Number(body.amount),
        mode: String(body.mode || '') as 'CASH' | 'ONLINE' | 'CHEQUE',
        paymentDate: optStr(body.paymentDate) || undefined,
        invoiceId: optStr(body.invoiceId),
        transactionId: optStr(body.transactionId),
        chequeNumber: optStr(body.chequeNumber),
        chequeBank: optStr(body.chequeBank),
        chequeDate: optStr(body.chequeDate),
        proofUrl: optStr(body.proofUrl),
        notes: optStr(body.notes),
      },
      'LATE_ENTRY',
      effects
    )
  );
  effects.schedule();
  return ok(payment, `Payment ${payment.paymentNumber} saved and sent for verification.`);
});
