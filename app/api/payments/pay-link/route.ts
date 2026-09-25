import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, notFound, ok, readJson, str } from '@/lib/server/http';
import { sendWhatsAppText } from '@/lib/server/messaging/whatsapp';
import { paymentLinkFor } from '@/lib/server/paymentLinks';
import { getSetting } from '@/lib/server/settings';

/** { invoiceId, send? } → an online payment link for the unpaid amount; send=true also WhatsApps it to the customer. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request);
  const invoiceId = str(body.invoiceId, 'Invoice', { required: true });
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: auth.tenantId }, select: { customerId: true } });
  if (!invoice) throw notFound('Invoice not found.');
  if (auth.role === 'CUSTOMER' ? invoice.customerId !== auth.customerId : !can(auth.role, 'invoices.view')) throw forbidden();
  const link = await paymentLinkFor(auth.tenantId, invoiceId);
  let sent: boolean | null = null;
  if (body.send === true && auth.role !== 'CUSTOMER') {
    const company = await getSetting(auth.tenantId, 'company');
    const text = `Namaste 🙏\n${company.name}: invoice ${link.invoiceNumber} — ₹${link.amount.toLocaleString('en-IN')} is due.\nPay online: ${link.url}${link.upiUrl && link.provider === 'UPI' && link.url !== link.upiUrl ? `\nUPI: ${company.upiId}` : ''}\nThank you!`;
    sent = link.phone ? (await sendWhatsAppText(auth.tenantId, link.phone, text, 'PAYMENT_LINK')).ok : false;
  }
  return ok({ ...link, sent }, sent ? 'Payment link sent on WhatsApp.' : sent === false ? 'Link created, but WhatsApp could not be sent.' : 'Payment link ready.');
});
