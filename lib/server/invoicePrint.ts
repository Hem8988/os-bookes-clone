import { prisma } from '@/lib/db';
import type { Customer, Invoice, InvoiceItem } from '@/lib/generated/prisma/client';
import { deliveryBoyVehicle } from './orders';
import { invoicePrintExtra, InvoicePrintExtra } from './invoices';

// What a printed tax invoice needs, shared by the staff / customer print API and the public
// invoice page opened from WhatsApp (/i/<token>).

/**
 * Print details frozen on the invoice, or rebuilt from the customer / delivery for older invoices.
 * References missing from the print (GRN / PO and their dates, challan, vehicle) are filled from the delivery.
 */
export async function printExtraFor(invoice: Invoice, customer: Customer | null): Promise<InvoicePrintExtra | null> {
  const frozen = ((invoice.extra as { print?: InvoicePrintExtra } | null)?.print ?? null) as InvoicePrintExtra | null;
  if (!frozen && !customer) return null;
  const [order, delivery] = await Promise.all([
    invoice.orderId ? prisma.order.findFirst({ where: { id: invoice.orderId, tenantId: invoice.tenantId }, select: { orderNumber: true, deliveryAddress: true, vehicleNumber: true } }) : null,
    invoice.deliveryId ? prisma.delivery.findFirst({ where: { id: invoice.deliveryId, tenantId: invoice.tenantId }, include: { items: true } }) : null,
  ]);
  const print =
    frozen ??
    invoicePrintExtra(customer!, {
      shipTo: order?.deliveryAddress || null,
      orderNumber: order?.orderNumber,
      deliveryNumber: delivery?.deliveryNumber,
      deliveryBoy: delivery?.deliveryBoyName,
      cylinders: delivery?.items.map((i) => ({ productName: i.productName, delivered: i.deliveredQty, emptyReceived: i.emptyReceivedQty })),
    });
  if (!delivery) return print;
  return {
    ...print,
    challanNumber: print.challanNumber || delivery.challanNumber || undefined,
    grnNumber: print.grnNumber || delivery.grnNumber || undefined,
    grnDate: print.grnDate || delivery.grnDate || undefined,
    poNumber: print.poNumber || delivery.poNumber || undefined,
    poDate: print.poDate || delivery.poDate || undefined,
    vehicleNumber: print.vehicleNumber || order?.vehicleNumber || (await deliveryBoyVehicle(prisma, invoice.tenantId, delivery.deliveryBoyId, delivery.deliveryBoyName)) || undefined,
  };
}

/**
 * Paperwork printed after the invoice: the delivery challan, the delivery proof and how
 * it was paid (UPI / bank screenshot, cheque photo, receipts entered later against it).
 */
export async function invoiceAttachments(invoice: Invoice) {
  const [delivery, payments] = await Promise.all([
    invoice.deliveryId
      ? prisma.delivery.findFirst({ where: { id: invoice.deliveryId, tenantId: invoice.tenantId }, select: { deliveryNumber: true, challanNumber: true, challanUrl: true, deliveryProofUrl: true, paymentProofUrl: true, chequePhotoUrl: true, paymentMode: true, paymentAmount: true } })
      : null,
    prisma.payment.findMany({ where: { tenantId: invoice.tenantId, invoiceId: invoice.id, proofUrl: { not: null }, status: { not: 'REJECTED' } }, select: { paymentNumber: true, mode: true, amount: true, proofUrl: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const list: { kind: 'challan' | 'delivery' | 'payment'; label: string; url: string }[] = [];
  const add = (kind: 'challan' | 'delivery' | 'payment', label: string, url: string | null | undefined) => {
    if (url && !list.some((a) => a.url === url)) list.push({ kind, label, url });
  };
  if (delivery) {
    add('challan', `Delivery challan${delivery.challanNumber ? ` ${delivery.challanNumber}` : ''} · ${delivery.deliveryNumber}`, delivery.challanUrl);
    add('payment', `Payment ${delivery.paymentMode} ₹${delivery.paymentAmount.toLocaleString('en-IN')} · ${delivery.deliveryNumber}`, delivery.paymentProofUrl);
    add('payment', `Cheque · ${delivery.deliveryNumber}`, delivery.chequePhotoUrl);
    add('delivery', `Delivery proof · ${delivery.deliveryNumber}`, delivery.deliveryProofUrl);
  }
  for (const p of payments) add('payment', `Payment ${p.paymentNumber} · ${p.mode} ₹${p.amount.toLocaleString('en-IN')}`, p.proofUrl);
  return list;
}

/**
 * Everything a printed tax invoice needs: the invoice, buyer address / PAN, place of supply,
 * delivery references and IRN / e-way bill. `attachments`: the paperwork photos; with
 * `publicToken` their links go through the public invoice link (/api/public/invoice/<token>/file/<n>).
 */
export async function invoicePrintData(invoice: Invoice & { items: InvoiceItem[] }, opts: { canEditRefs: boolean; attachments: boolean; publicToken?: string }) {
  const customer = await prisma.customer.findFirst({ where: { id: invoice.customerId, tenantId: invoice.tenantId } });
  const print = await printExtraFor(invoice, customer);
  const extra = (customer?.extra as Record<string, unknown> | null) ?? {};
  const gstin = invoice.customerGstin || customer?.gstin || '';
  const customerPan = (typeof extra.pan === 'string' && extra.pan) || (gstin.length === 15 ? gstin.slice(2, 12) : '');

  // IRN / e-way bill details saved from Books → E-invoice.
  const saved = (invoice.extra as Record<string, unknown> | null) ?? {};
  const pick = (k: string) => (typeof saved[k] === 'string' && saved[k] ? (saved[k] as string) : undefined);
  const einv = { irn: pick('irn') || ((print as { irn?: string } | null)?.irn ?? undefined), ackNo: pick('ackNo'), ackDate: pick('ackDate'), signedQr: pick('signedQr'), ewbNo: pick('ewbNo'), ewbDate: pick('ewbDate'), ewbValidUpto: pick('ewbValidUpto') };
  return {
    ...invoice,
    print: print ? { ...print, ...einv } : null,
    customerPan,
    canEditRefs: opts.canEditRefs,
    attachments: opts.attachments
      ? (await invoiceAttachments(invoice)).map((a, i) =>
          // Public page: protected files are served through the invoice's signed link.
          opts.publicToken ? { ...a, url: `/api/public/invoice/${encodeURIComponent(opts.publicToken)}/file/${i}` } : a
        )
      : [],
  };
}
