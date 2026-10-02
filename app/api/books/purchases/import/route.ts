import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { parseIoclInvoice, pdfText } from '@/lib/server/books/invoicePdf';
import { badRequest, handle, ok } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';

/** Read a plant's invoice PDF (multipart: file) into purchase-bill fields. Nothing is saved. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage');
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw badRequest('Choose the invoice PDF.');
  if (file.size > 5 * 1024 * 1024) throw badRequest('The PDF is larger than 5 MB.');
  const company = await getSetting(auth.tenantId, 'company');
  const parsed = parseIoclInvoice(await pdfText(new Uint8Array(await file.arrayBuffer())), company.gstin);
  const supplier = parsed.supplierGstin ? await prisma.customer.findFirst({ where: { tenantId: auth.tenantId, gstin: parsed.supplierGstin }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }) : null;
  const duplicate =
    supplier && parsed.invoiceNo
      ? await prisma.purchaseBill.findFirst({ where: { tenantId: auth.tenantId, supplierId: supplier.id, supplierInvoiceNo: parsed.invoiceNo, status: { not: 'Cancelled' } }, select: { billNumber: true } })
      : null;
  return ok({ ...parsed, supplierId: supplier?.id ?? null, duplicateOf: duplicate?.billNumber ?? null });
});
