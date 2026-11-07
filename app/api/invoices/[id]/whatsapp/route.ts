import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { rateLimit, requireAuth } from '@/lib/server/auth';
import { ApiError, badRequest, handle, notFound, ok } from '@/lib/server/http';
import { sendWhatsAppMedia } from '@/lib/server/messaging/whatsapp';
import { publicMediaUrl } from '@/lib/server/messaging/publicMedia';
import { storeFile } from '@/lib/server/storage';

type Ctx = { params: Promise<{ id: string }> };

const MAX_PDF_BYTES = 8 * 1024 * 1024;

/**
 * Send the invoice PDF to the customer's WhatsApp (multipart field "file").
 * The PDF is made in the browser from the printed sheet, so it looks exactly like the print.
 * It goes from the company number to the customer's WhatsApp number (else their phone).
 */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'invoices.manage', { write: true });
  rateLimit(`invoice-wa:${auth.userId}`, 20, 60_000);
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true, invoiceNumber: true, grandTotal: true, paidAmount: true, status: true, customerId: true, customerName: true },
  });
  if (!invoice) throw notFound('Invoice not found.');
  if (invoice.status === 'Cancelled') throw badRequest('This invoice is cancelled.');
  const customer = invoice.customerId ? await prisma.customer.findFirst({ where: { id: invoice.customerId, tenantId: auth.tenantId }, select: { name: true, phone: true, whatsappNumber: true } }) : null;
  const phone = customer?.whatsappNumber || customer?.phone;
  if (!phone) throw badRequest('This customer has no WhatsApp or mobile number. Add it on the customer first.');

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw badRequest('The invoice PDF is missing.');
  if (file.size > MAX_PDF_BYTES) throw badRequest('The invoice PDF is too large.');
  const stored = await storeFile(auth.tenantId, Buffer.from(await file.arrayBuffer()));
  if (stored.mime !== 'application/pdf') throw badRequest('Only a PDF can be sent here.');

  const due = Math.max(0, Math.round((invoice.grandTotal - invoice.paidAmount) * 100) / 100);
  const caption = `Invoice ${invoice.invoiceNumber} — ₹${invoice.grandTotal.toLocaleString('en-IN')}${due > 0 ? `\nBalance due: ₹${due.toLocaleString('en-IN')}` : '\nFully paid ✅'}`;
  const r = await sendWhatsAppMedia(
    auth.tenantId,
    phone,
    { kind: 'document', link: publicMediaUrl(stored.url) || stored.url, storedUrl: stored.url, caption, filename: `Invoice-${invoice.invoiceNumber.replace(/[^\w-]+/g, '-')}.pdf` },
    { sentBy: auth.name, priority: true }
  );
  if (!r.ok) throw new ApiError(502, `WhatsApp did not take the invoice: ${r.error || 'unknown error'}`, 'SEND_FAILED');

  await prisma.invoice.update({ where: { id: invoice.id }, data: { sentAt: new Date() } });
  await audit(prisma, auth, { action: 'INVOICE_WHATSAPP_SENT', entityType: 'Invoice', entityId: invoice.id, reference: `${invoice.invoiceNumber} → ${phone}` });
  return ok({ sent: true, simulated: !!r.simulated, phone }, r.simulated ? 'WhatsApp is not set up, so the invoice was only logged.' : `Invoice PDF sent on WhatsApp to ${phone}.`);
});
