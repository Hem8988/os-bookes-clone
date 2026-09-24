import { prisma } from '@/lib/db';
import type { Customer, Invoice } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, notFound, ok, readJson, str } from '@/lib/server/http';
import { INVOICE_REF_FIELDS, invoicePrintExtra, InvoicePrintExtra } from '@/lib/server/invoices';

type Ctx = { params: Promise<{ id: string }> };

/** Print details frozen on the invoice, or rebuilt from the customer / delivery for older invoices. */
async function printExtraFor(invoice: Invoice, customer: Customer | null): Promise<InvoicePrintExtra | null> {
  const frozen = ((invoice.extra as { print?: InvoicePrintExtra } | null)?.print ?? null) as InvoicePrintExtra | null;
  if (frozen || !customer) return frozen;
  const [order, delivery] = await Promise.all([
    invoice.orderId ? prisma.order.findFirst({ where: { id: invoice.orderId }, select: { orderNumber: true, deliveryAddress: true } }) : null,
    invoice.deliveryId ? prisma.delivery.findFirst({ where: { id: invoice.deliveryId }, include: { items: true } }) : null,
  ]);
  return invoicePrintExtra(customer, {
    shipTo: order?.deliveryAddress || null,
    orderNumber: order?.orderNumber,
    deliveryNumber: delivery?.deliveryNumber,
    deliveryBoy: delivery?.deliveryBoyName,
    cylinders: delivery?.items.map((i) => ({ productName: i.productName, delivered: i.deliveredQty, emptyReceived: i.emptyReceivedQty })),
  });
}

/**
 * Everything a printed tax invoice needs: the invoice, buyer address / PAN,
 * place of supply and delivery references. Details frozen on the invoice win;
 * invoices made before that existed fall back to the customer / delivery.
 */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: auth.tenantId }, include: { items: true } });
  if (!invoice) throw notFound('Invoice not found.');
  const allowed = can(auth.role, 'invoices.view') || (auth.role === 'CUSTOMER' && invoice.customerId === auth.customerId);
  if (!allowed) throw forbidden();

  const customer = await prisma.customer.findFirst({ where: { id: invoice.customerId, tenantId: auth.tenantId } });
  const print = await printExtraFor(invoice, customer);
  const extra = (customer?.extra as Record<string, unknown> | null) ?? {};
  const gstin = invoice.customerGstin || customer?.gstin || '';
  const customerPan = (typeof extra.pan === 'string' && extra.pan) || (gstin.length === 15 ? gstin.slice(2, 12) : '');

  return ok({ ...invoice, print, customerPan, canEditRefs: can(auth.role, 'invoices.manage') });
});

/** Save the hand-typed references (GRN / vehicle / challan / P.O. no.) shown on the print. */
export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'invoices.manage');
  const { id } = await ctx.params;
  const body = await readJson(request);
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!invoice) throw notFound('Invoice not found.');

  const customer = await prisma.customer.findFirst({ where: { id: invoice.customerId, tenantId: auth.tenantId } });
  const before = await printExtraFor(invoice, customer);
  const refs = Object.fromEntries(INVOICE_REF_FIELDS.map((f) => [f, str(body[f], f, { max: 60 })]));
  const print = { ...(before ?? {}), ...refs };
  const extra = { ...((invoice.extra as Record<string, unknown> | null) ?? {}), print };

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({ where: { id }, data: { extra: extra as object } });
    await audit(tx, auth, {
      action: 'INVOICE_REFS_UPDATED',
      entityType: 'Invoice',
      entityId: id,
      reference: invoice.invoiceNumber,
      oldValue: Object.fromEntries(INVOICE_REF_FIELDS.map((f) => [f, before?.[f] ?? ''])),
      newValue: refs,
    });
  });
  return ok(print, 'Invoice details saved.');
});
