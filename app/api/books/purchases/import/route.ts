import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { checkAgainstQr, parseIoclInvoice, pdfText, readEinvoiceQr } from '@/lib/server/books/invoicePdf';
import { plantBalance } from '@/lib/server/books/plantBalance';
import { badRequest, handle, ok } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';
import { storeFile } from '@/lib/server/storage';

/**
 * Read a plant's invoice PDF (multipart: file) into purchase-bill fields and
 * keep a copy of the PDF for the bill. No bill is saved here.
 */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw badRequest('Choose the invoice PDF.');
  if (file.size > 5 * 1024 * 1024) throw badRequest('The PDF is larger than 5 MB.');
  const bytes = Buffer.from(await file.arrayBuffer());
  const company = await getSetting(auth.tenantId, 'company');
  // pdf.js takes ownership of the array it is given, so each reader gets its own copy.
  const parsed = parseIoclInvoice(await pdfText(new Uint8Array(bytes)), company.gstin);
  const qr = await readEinvoiceQr(new Uint8Array(bytes));
  const problems = checkAgainstQr(parsed, qr);
  const own = company.gstin?.trim().toUpperCase();
  if (qr && own && qr.buyerGstin !== own) problems.push(`This invoice is billed to GSTIN ${qr.buyerGstin}, not to your GSTIN ${own}.`);

  const supplier = parsed.supplierGstin ? await prisma.customer.findFirst({ where: { tenantId: auth.tenantId, gstin: parsed.supplierGstin }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }) : null;
  const irn = qr?.irn.toLowerCase() || parsed.irn;
  const keys = [irn && { irn }, parsed.sapDocNo && { sapDocNo: parsed.sapDocNo }, supplier && parsed.invoiceNo && { supplierId: supplier.id, supplierInvoiceNo: parsed.invoiceNo }].filter(Boolean) as object[];
  const duplicate = keys.length ? await prisma.purchaseBill.findFirst({ where: { tenantId: auth.tenantId, status: { not: 'Cancelled' }, OR: keys }, select: { billNumber: true } }) : null;
  // Our books' plant balance now, to compare with the balance printed on the invoice.
  const booksBalance = supplier ? await plantBalance(prisma, auth.tenantId, supplier.id) : null;
  const pdf = duplicate ? null : await storeFile(auth.tenantId, bytes);

  return ok({
    ...parsed,
    irn,
    irnDate: qr?.irnDate ?? null,
    einvoiceQr: qr?.raw ?? null,
    qrVerified: !!qr && problems.length === 0,
    problems,
    invoicePdfUrl: pdf?.url ?? null,
    supplierId: supplier?.id ?? null,
    duplicateOf: duplicate?.billNumber ?? null,
    booksBalance,
  });
});
