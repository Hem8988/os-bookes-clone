import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { requireAuth } from '@/lib/server/auth';
import { deliveryBoyCustomers } from '@/lib/server/customers';
import { Effects } from '@/lib/server/effects';
import { businessDate, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { recordFieldCollection } from '@/lib/server/payments';

/** Payment-only visits: all the delivery boy's customers (dues first, advance from anyone), and what he collected today. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute');
  const search = new URL(request.url).searchParams.get('search')?.trim();
  const where: Prisma.CustomerWhereInput = { tenantId: auth.tenantId, type: 'Customer', status: 'ACTIVE', AND: [await deliveryBoyCustomers(prisma, auth.tenantId, auth.userId)] };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortName: { contains: search, mode: 'insensitive' } },
      { customerCode: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }
  const [customers, collections] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: { id: true, customerCode: true, name: true, shortName: true, phone: true, address: true, area: true, balance: true },
      orderBy: search ? { name: 'asc' } : { balance: 'desc' },
      take: 200,
    }),
    prisma.payment.findMany({
      where: { tenantId: auth.tenantId, source: 'FIELD', collectedById: auth.userId, paymentDate: businessDate() },
      select: { id: true, paymentNumber: true, customerId: true, customerName: true, mode: true, amount: true, status: true, rejectionReason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return ok({ customers, collections });
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute', { write: true });
  const body = await readJson(request);
  const effects = new Effects();
  const payment = await transaction((tx) =>
    recordFieldCollection(
      tx,
      auth,
      {
        customerId: str(body.customerId, 'Customer', { required: true }),
        amount: Number(body.amount),
        mode: String(body.mode || '') as 'CASH' | 'ONLINE' | 'CHEQUE',
        transactionId: optStr(body.transactionId),
        chequeNumber: optStr(body.chequeNumber),
        chequeBank: optStr(body.chequeBank),
        chequeDate: optStr(body.chequeDate),
        proofUrl: optStr(body.proofUrl),
        notes: optStr(body.notes),
      },
      effects
    )
  );
  effects.schedule();
  return ok(payment, `₹${payment.amount.toLocaleString('en-IN')} collected (${payment.paymentNumber}) — sent to accounts for verification.`);
});
