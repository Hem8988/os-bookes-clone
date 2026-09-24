import type { Tx } from '@/lib/db';
import type { Customer } from '@/lib/generated/prisma/client';
import { addDays, round2 } from './http';
import { isInterState, splitGst } from './pricing';
import { nextInvoiceNumber } from './sequence';
import { getSetting } from './settings';
import { PAYMENT_TERMS } from '@/lib/settings';
import { stateLabel } from '@/lib/gst';

export interface InvoiceLineInput {
  productId: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  /** GST-inclusive rate per unit. */
  unitPrice: number;
  taxRate: number;
}

/** Print details frozen on the invoice (buyer address, place of supply, references). */
export interface InvoicePrintExtra {
  billTo: { address: string; city: string | null; state: string | null; stateCode: string | null; pincode: string | null; email: string | null };
  shipTo: string | null;
  placeOfSupply: string;
  orderNumber?: string;
  deliveryNumber?: string;
  deliveryBoy?: string;
  cylinders?: { productName: string; delivered: number; emptyReceived: number }[];
  /** Typed in by the office from the print screen; challanNumber overrides deliveryNumber. */
  grnNumber?: string;
  vehicleNumber?: string;
  challanNumber?: string;
  poNumber?: string;
}

/** Print references the office can fill in by hand. */
export const INVOICE_REF_FIELDS = ['grnNumber', 'vehicleNumber', 'challanNumber', 'poNumber'] as const;

export function invoicePrintExtra(
  customer: Pick<Customer, 'address' | 'city' | 'state' | 'stateCode' | 'pincode' | 'email' | 'gstin'>,
  more: Omit<InvoicePrintExtra, 'billTo' | 'placeOfSupply'> = { shipTo: null }
): InvoicePrintExtra {
  return {
    billTo: { address: customer.address, city: customer.city, state: customer.state, stateCode: customer.stateCode, pincode: customer.pincode, email: customer.email },
    placeOfSupply: stateLabel(customer.stateCode, customer.gstin, customer.state),
    ...more,
  };
}

export function dueDateFor(customer: Pick<Customer, 'paymentTerms' | 'creditDays'>, date: string) {
  const term = PAYMENT_TERMS.find((t) => t.value === customer.paymentTerms);
  return addDays(date, customer.creditDays ?? term?.days ?? 0);
}

/** Build and store a GST invoice from GST-inclusive lines (delivery invoices). */
export async function createInvoiceFromLines(
  tx: Tx,
  input: {
    tenantId: string;
    customer: Customer;
    date: string;
    lines: InvoiceLineInput[];
    source: 'DELIVERY' | 'MANUAL';
    orderId?: string;
    deliveryId?: string;
    paymentMode: string;
    salesmanId?: string;
    salesmanName?: string;
    notes?: string;
    createdBy: string;
    print?: Omit<InvoicePrintExtra, 'billTo' | 'placeOfSupply'>;
  }
) {
  const company = await getSetting(input.tenantId, 'company');
  const igst = isInterState(company.stateCode, input.customer.stateCode, input.customer.gstin);
  const items = input.lines
    .filter((l) => l.quantity > 0)
    .map((l) => {
      const total = round2(l.quantity * l.unitPrice);
      const gst = splitGst(total, l.taxRate, igst);
      return {
        productId: l.productId,
        productName: l.productName,
        hsnCode: l.hsnCode,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
        taxableAmount: gst.taxable,
        cgstAmount: gst.cgst,
        sgstAmount: gst.sgst,
        igstAmount: gst.igst,
        totalAmount: total,
      };
    });
  const sum = (key: 'taxableAmount' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'totalAmount') => round2(items.reduce((s, i) => s + i[key], 0));
  const exact = sum('totalAmount');
  const grandTotal = Math.round(exact);

  return tx.invoice.create({
    data: {
      tenantId: input.tenantId,
      invoiceNumber: await nextInvoiceNumber(tx, input.tenantId, input.date, company.invoicePrefix),
      date: input.date,
      dueDate: dueDateFor(input.customer, input.date),
      customerId: input.customer.id,
      customerName: input.customer.name,
      customerGstin: input.customer.gstin,
      customerPhone: input.customer.phone,
      salesmanId: input.salesmanId,
      salesmanName: input.salesmanName,
      orderId: input.orderId,
      deliveryId: input.deliveryId,
      source: input.source,
      subTotal: sum('taxableAmount'),
      totalCgst: sum('cgstAmount'),
      totalSgst: sum('sgstAmount'),
      totalIgst: sum('igstAmount'),
      roundOff: round2(grandTotal - exact),
      grandTotal,
      paymentMode: input.paymentMode,
      status: 'Unpaid',
      isIgst: igst,
      notes: input.notes,
      createdBy: input.createdBy,
      extra: { print: invoicePrintExtra(input.customer, input.print) } as object,
      items: { create: items },
    },
    include: { items: true },
  });
}

export function invoiceStatus(grandTotal: number, paid: number): 'Paid' | 'Partial' | 'Unpaid' {
  if (paid <= 0) return 'Unpaid';
  return paid + 0.5 >= grandTotal ? 'Paid' : 'Partial';
}
