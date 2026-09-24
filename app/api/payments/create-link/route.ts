import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { buildUpiLink } from '@/lib/paymentGateway';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, forbidden, handle, notFound, ok, readJson, round2, str } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';

/** UPI pay link for an invoice's unpaid amount (shown as a QR code). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request);
  const invoice = await prisma.invoice.findFirst({ where: { id: str(body.invoiceId, 'Invoice', { required: true }), tenantId: auth.tenantId } });
  if (!invoice) throw notFound('Invoice not found.');
  if (auth.role === 'CUSTOMER' ? invoice.customerId !== auth.customerId : !can(auth.role, 'invoices.view')) throw forbidden();
  const company = await getSetting(auth.tenantId, 'company');
  if (!company.upiId) throw badRequest('UPI ID is not configured in Settings → Company.');
  const amount = round2(Math.max(invoice.grandTotal - invoice.paidAmount, 0));
  if (amount <= 0) throw badRequest('This invoice is already paid.');
  return ok({ upiUrl: buildUpiLink(company.upiId, company.name, amount, invoice.invoiceNumber), amount, upiId: company.upiId, invoiceNumber: invoice.invoiceNumber });
});
