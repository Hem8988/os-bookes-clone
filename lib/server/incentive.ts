import { prisma } from '@/lib/db';
import { monthRange } from '@/lib/books';

// Delivery incentive is earned only once the customer has paid for the delivery.
// A customer's payments settle their dues oldest first (FIFO, like receivables
// ageing), so payments taken on account or by field collection count too. The
// incentive lands in the month the delivery's invoice became fully paid.

/** Deliveries before this date were paid incentive on verification (the old rule). */
export const PAID_INCENTIVE_FROM = '2026-10-01';

const SLACK = 0.5; // same rounding tolerance as invoiceStatus()

/**
 * For each invoice of these customers: the date it became fully paid, or null
 * while anything on it is still due. A cheque bounce or refund reopens it.
 */
export async function invoicePaidDates(tenantId: string, customerIds: string[]) {
  const paidOn = new Map<string, string | null>();
  if (!customerIds.length) return paidOn;
  const entries = await prisma.ledgerEntry.findMany({
    where: { tenantId, ledgerType: 'CUSTOMER', customerId: { in: customerIds } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { customerId: true, entryType: true, referenceType: true, referenceId: true, date: true, debit: true, credit: true },
  });
  const byCustomer = new Map<string, typeof entries>();
  entries.forEach((e) => {
    if (!e.customerId) return;
    const list = byCustomer.get(e.customerId) || [];
    list.push(e);
    byCustomer.set(e.customerId, list);
  });

  for (const list of byCustomer.values()) {
    // Dues in the order they arose; an invoice's later edits and cancellation adjust its own amount.
    const dues: { invoiceId: string | null; date: string; amount: number }[] = [];
    const invoiceDue = new Map<string, (typeof dues)[number]>();
    // Money in (+) and money given back or bounced (−).
    const receipts: { date: string; amount: number }[] = [];
    for (const e of list) {
      if (e.referenceType === 'INVOICE' && e.referenceId) {
        let due = invoiceDue.get(e.referenceId);
        if (!due) {
          due = { invoiceId: e.referenceId, date: e.date, amount: 0 };
          dues.push(due);
          invoiceDue.set(e.referenceId, due);
        }
        due.amount += e.debit - e.credit;
        continue;
      }
      if (e.debit > 0) {
        if (e.entryType === 'REVERSAL' || e.entryType === 'REFUND') receipts.push({ date: e.date, amount: -e.debit });
        else dues.push({ invoiceId: null, date: e.date, amount: e.debit });
      }
      if (e.credit > 0) receipts.push({ date: e.date, amount: e.credit });
    }

    // Due k is covered once total receipts reach the sum of every due up to and including it.
    let cumulative = 0;
    const targets = dues.map((d) => (cumulative += Math.max(0, d.amount)));
    const coveredOn: (string | null)[] = dues.map(() => null);
    let k = 0;
    let received = 0;
    let best = 0;
    for (; k < dues.length && targets[k] <= SLACK; k++) coveredOn[k] = dues[k].date;
    for (const r of receipts) {
      received += r.amount;
      best = Math.max(best, received);
      for (; k < dues.length && best + SLACK >= targets[k]; k++) coveredOn[k] = r.date;
    }
    dues.forEach((d, i) => {
      if (!d.invoiceId) return;
      // Still covered today (a bounce after the fact reopens it); paid no earlier than it was billed.
      const stillPaid = received + SLACK >= targets[i];
      const on = coveredOn[i];
      paidOn.set(d.invoiceId, stillPaid && on ? (on > d.date ? on : d.date) : null);
    });
  }
  return paidOn;
}

export interface IncentiveDelivery {
  id: string;
  deliveryNumber: string;
  customerName: string;
  deliveryDate: string;
  cylinders: number;
  invoiceNumber: string | null;
  amount: number;
  paidOn: string | null;
}

/** A delivery boy's deliveries paid for in `month` (earn incentive) and those still awaiting payment. */
export async function deliveryIncentive(tenantId: string, deliveryBoyId: string, month: string) {
  const { from, to } = monthRange(month);
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId, deliveryBoyId, status: 'VERIFIED', deliveryDate: { gte: PAID_INCENTIVE_FROM, lte: to } },
    select: { id: true, deliveryNumber: true, customerId: true, customerName: true, deliveryDate: true, deliveredQtyTotal: true, invoiceAmount: true },
    orderBy: { deliveryDate: 'asc' },
  });
  const invoices = deliveries.length
    ? await prisma.invoice.findMany({ where: { tenantId, deliveryId: { in: deliveries.map((d) => d.id) } }, select: { id: true, deliveryId: true, invoiceNumber: true, grandTotal: true, status: true } })
    : [];
  const invoiceFor = new Map(invoices.map((i) => [i.deliveryId as string, i]));
  const paidDates = await invoicePaidDates(tenantId, [...new Set(deliveries.map((d) => d.customerId))]);

  const paid: IncentiveDelivery[] = [];
  const pending: IncentiveDelivery[] = [];
  for (const d of deliveries) {
    const inv = invoiceFor.get(d.id);
    if (inv?.status === 'Cancelled') continue;
    // No invoice or nothing to pay: earned on delivery.
    const paidOn = !inv || inv.grandTotal <= SLACK ? d.deliveryDate : paidDates.get(inv.id) ?? null;
    const row = { id: d.id, deliveryNumber: d.deliveryNumber, customerName: d.customerName, deliveryDate: d.deliveryDate, cylinders: Math.round(d.deliveredQtyTotal), invoiceNumber: inv?.invoiceNumber ?? null, amount: inv?.grandTotal ?? d.invoiceAmount, paidOn };
    if (paidOn && paidOn >= from && paidOn <= to) paid.push(row);
    else if (!paidOn) pending.push(row);
  }
  return {
    paid,
    pending,
    deliveries: paid.length,
    cylinders: paid.reduce((s, d) => s + d.cylinders, 0),
    pendingCylinders: pending.reduce((s, d) => s + d.cylinders, 0),
  };
}
