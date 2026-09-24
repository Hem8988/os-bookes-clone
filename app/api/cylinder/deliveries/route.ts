import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { PaymentMode, submitDelivery } from '@/lib/server/deliveries';
import { Effects } from '@/lib/server/effects';
import { forbidden, handle, ok, optStr, readJson, str } from '@/lib/server/http';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const where: Prisma.DeliveryWhereInput = { tenantId: auth.tenantId };
  if (auth.role === 'DELIVERY_BOY') where.deliveryBoyId = auth.userId;
  else if (auth.role === 'CUSTOMER') where.customerId = auth.customerId || '-';
  else if (!can(auth.role, 'deliveries.view')) throw forbidden();

  const date = url.searchParams.get('date');
  if (date) where.deliveryDate = date;
  const status = url.searchParams.get('status');
  if (status) where.status = { in: status.split(',') };
  const boy = url.searchParams.get('deliveryBoyId');
  if (boy && auth.role !== 'DELIVERY_BOY') where.deliveryBoyId = boy;

  const deliveries = await prisma.delivery.findMany({ where, include: { items: true }, orderBy: { submittedAt: 'desc' }, take: 300 });
  return ok(deliveries);
});

/** Delivery boy submits a delivery (online or from the offline sync queue). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute', { write: true });
  const body = await readJson(request);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const effects = new Effects();
  const result = await transaction((tx) =>
    submitDelivery(
      tx,
      auth,
      {
        orderId: str(body.orderId, 'Order', { required: true }),
        clientRef: optStr(body.clientRef),
        deliveredAt: optStr(body.deliveredAt),
        items: Array.isArray(body.items)
          ? (body.items as Record<string, unknown>[]).map((i) => ({ productId: String(i.productId), deliveredQty: Number(i.deliveredQty || 0), emptyReceivedQty: Number(i.emptyReceivedQty || 0) }))
          : [],
        paymentMode: String(body.paymentMode || '') as PaymentMode,
        paymentAmount: Number(body.paymentAmount || 0),
        transactionId: optStr(body.transactionId),
        chequeNumber: optStr(body.chequeNumber),
        chequeBank: optStr(body.chequeBank),
        chequeDate: optStr(body.chequeDate),
        paymentProofUrl: optStr(body.paymentProofUrl),
        chequePhotoUrl: optStr(body.chequePhotoUrl),
        deliveryProofUrl: str(body.deliveryProofUrl, 'Delivery proof photo'),
        latitude: num(body.latitude),
        longitude: num(body.longitude),
        remarks: optStr(body.remarks),
      },
      effects
    )
  );
  effects.schedule();
  return ok(result.delivery, result.duplicate ? 'Already synced.' : `Delivery ${result.delivery.deliveryNumber} submitted for verification.`);
});
