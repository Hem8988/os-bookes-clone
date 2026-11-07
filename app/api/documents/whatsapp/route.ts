import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { rateLimit, requireAuth } from '@/lib/server/auth';
import { ApiError, badRequest, handle, notFound, ok } from '@/lib/server/http';
import { customerWhatsAppNumbers, sendToFirstOnWhatsApp, sendWhatsAppMedia } from '@/lib/server/messaging/whatsapp';
import { publicMediaUrl } from '@/lib/server/messaging/publicMedia';
import { storeFile } from '@/lib/server/storage';

const MAX_PDF_BYTES = 8 * 1024 * 1024;

const field = (form: FormData, key: string, max: number) => {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
};

/**
 * Send a printed customer document (delivery challan, quotation, credit note) as a PDF to the
 * customer's WhatsApp. Multipart: file (PDF, made in the browser), customerId or customerName,
 * title ("Delivery Challan DC-2026-101"), caption (optional).
 */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'invoices.manage', { write: true });
  rateLimit(`doc-wa:${auth.userId}`, 20, 60_000);
  const form = await request.formData().catch(() => null);
  if (!form) throw badRequest('The document PDF is missing.');

  const customerId = field(form, 'customerId', 60);
  const customerName = field(form, 'customerName', 200);
  if (!customerId && !customerName) throw badRequest('Choose the customer first.');
  // Older documents (challans) keep only the customer's name; it must point to exactly one customer.
  const matches = await prisma.customer.findMany({
    where: { tenantId: auth.tenantId, type: 'Customer', ...(customerId ? { id: customerId } : { name: customerName }) },
    select: { id: true, name: true, phone: true, whatsappNumber: true },
    take: 2,
  });
  if (matches.length === 0) throw notFound(`Customer "${customerName || customerId}" was not found.`);
  if (matches.length > 1) throw badRequest(`More than one customer is named "${customerName}". Send it from WhatsApp → Chats instead.`);
  const customer = matches[0];
  const numbers = customerWhatsAppNumbers(customer);
  if (!numbers.length) throw badRequest(`${customer.name} has no WhatsApp or mobile number. Add it on the customer first.`);

  const file = form.get('file');
  if (!file || typeof file === 'string') throw badRequest('The document PDF is missing.');
  if (file.size > MAX_PDF_BYTES) throw badRequest('The document PDF is too large.');
  const stored = await storeFile(auth.tenantId, Buffer.from(await file.arrayBuffer()));
  if (stored.mime !== 'application/pdf') throw badRequest('Only a PDF can be sent here.');

  const title = field(form, 'title', 120) || 'Document';
  const caption = [title, field(form, 'caption', 500)].filter(Boolean).join('\n');
  // The WhatsApp number first; when it is not on WhatsApp, the customer's mobile.
  const r = await sendToFirstOnWhatsApp(numbers, (to) =>
    sendWhatsAppMedia(
      auth.tenantId,
      to,
      { kind: 'document', link: publicMediaUrl(stored.url) || stored.url, storedUrl: stored.url, caption, filename: `${title.replace(/[^\w-]+/g, '-').replace(/-+$/, '')}.pdf` },
      { sentBy: auth.name, priority: true }
    )
  );
  const phone = r.phone;
  if (!r.ok) throw new ApiError(502, `WhatsApp did not take the document: ${r.error || 'unknown error'}`, 'SEND_FAILED');

  await audit(prisma, auth, { action: 'DOCUMENT_WHATSAPP_SENT', entityType: 'Customer', entityId: customer.id, reference: `${title} → ${phone}` });
  return ok({ sent: true, simulated: !!r.simulated, phone }, r.simulated ? 'WhatsApp is not set up, so the document was only logged.' : `${title} sent on WhatsApp to ${customer.name}.`);
});
