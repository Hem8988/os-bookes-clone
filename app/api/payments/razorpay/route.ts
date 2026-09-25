import { prisma, transaction } from '@/lib/db';
import { systemActor } from '@/lib/server/audit';
import { rateLimit } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { ApiError, clientIp, handle, ok } from '@/lib/server/http';
import { verifyRazorpay } from '@/lib/server/paymentLinks';
import { recordPayment } from '@/lib/server/payments';

/**
 * Razorpay webhook (event "payment_link.paid"). Set the URL
 * <APP_URL>/api/payments/razorpay and RAZORPAY_WEBHOOK_SECRET in Razorpay →
 * Settings → Webhooks. The payment goes to the accountant's verification
 * queue like any other online payment.
 */
export const POST = handle(async (request: Request) => {
  rateLimit(`razorpay:${clientIp(request)}`, 120, 60_000);
  const raw = await request.text();
  if (!verifyRazorpay(raw, request.headers.get('x-razorpay-signature'))) throw new ApiError(401, 'Invalid signature.', 'BAD_SIGNATURE');
  const body = JSON.parse(raw) as { event?: string; payload?: { payment_link?: { entity?: { notes?: Record<string, string> } }; payment?: { entity?: { id?: string; amount?: number; method?: string } } } };
  if (body.event !== 'payment_link.paid') return ok({ ignored: true });
  const notes = body.payload?.payment_link?.entity?.notes || {};
  const pay = body.payload?.payment?.entity;
  if (!notes.invoiceId || !pay?.id || !(Number(pay.amount) > 0)) return ok({ ignored: true });

  const invoice = await prisma.invoice.findFirst({ where: { id: notes.invoiceId, ...(notes.tenantId ? { tenantId: notes.tenantId } : {}) } });
  if (!invoice) throw new ApiError(404, 'Invoice not found.', 'NOT_FOUND');
  const duplicate = await prisma.payment.findFirst({ where: { tenantId: invoice.tenantId, transactionId: pay.id } });
  if (duplicate) return ok({ duplicate: true });

  const effects = new Effects();
  const payment = await transaction((tx) =>
    recordPayment(
      tx,
      systemActor(invoice.tenantId, 'Razorpay'),
      { customerId: invoice.customerId, amount: Number(pay.amount) / 100, mode: 'ONLINE', invoiceId: invoice.id, transactionId: pay.id, notes: `Razorpay payment link (${pay.method || 'online'})` },
      'GATEWAY',
      effects
    )
  );
  effects.schedule();
  return ok({ paymentNumber: payment.paymentNumber });
});
