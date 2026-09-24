import { prisma, transaction } from '@/lib/db';
import { verifyGatewaySignature } from '@/lib/paymentGateway';
import { systemActor } from '@/lib/server/audit';
import { rateLimit } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { ApiError, clientIp, handle, ok } from '@/lib/server/http';
import { recordPayment } from '@/lib/server/payments';

/**
 * Payment gateway webhook (V2 online payment links). The signature is
 * verified, and the payment still goes to the accountant's verification
 * queue before it touches the ledger (SRS §2.3).
 */
export const POST = handle(async (request: Request) => {
  rateLimit(`gateway:${clientIp(request)}`, 60, 60_000);
  const raw = await request.text();
  if (!verifyGatewaySignature(raw, request.headers.get('x-payment-signature'))) throw new ApiError(401, 'Invalid signature.', 'BAD_SIGNATURE');
  const body = JSON.parse(raw) as { invoiceNumber?: string; transactionId?: string; amount?: number; status?: string };
  if (body.status !== 'SUCCESS' || !body.transactionId || !body.invoiceNumber || !(Number(body.amount) > 0)) return ok({ ignored: true });

  const invoice = await prisma.invoice.findFirst({ where: { invoiceNumber: body.invoiceNumber } });
  if (!invoice) throw new ApiError(404, 'Invoice not found.', 'NOT_FOUND');
  const duplicate = await prisma.payment.findFirst({ where: { tenantId: invoice.tenantId, transactionId: body.transactionId } });
  if (duplicate) return ok({ duplicate: true });

  const effects = new Effects();
  const payment = await transaction((tx) =>
    recordPayment(
      tx,
      systemActor(invoice.tenantId, 'Payment Gateway'),
      { customerId: invoice.customerId, amount: Number(body.amount), mode: 'ONLINE', invoiceId: invoice.id, transactionId: body.transactionId, notes: 'Online payment link' },
      'GATEWAY',
      effects
    )
  );
  effects.schedule();
  return ok({ paymentNumber: payment.paymentNumber });
});
