import { prisma, type Tx } from '@/lib/db';
import type { Delivery, DeliveryItem } from '@/lib/generated/prisma/client';
import { createApproval } from './approvals';
import { audit, Actor } from './audit';
import { assertDayOpen, assertDeliveryDayOpen } from './dayLocks';
import type { Effects } from './effects';
import { ApiError, badRequest, businessDate, conflict, forbidden, notFound, round2 } from './http';
import { moveStock, StockLocation } from './inventory';
import { createInvoiceFromLines, invoiceStatus } from './invoices';
import { postBookEntry, postCustomerLedger } from './ledger';
import { notifyCustomer, notifyRoles, notifyUsers } from './notify';
import { setOrderStatus } from './orders';
import { nextNumber } from './sequence';
import { getSetting } from './settings';
import { isStoredFile } from './storage';
import { getWallet, postWallet } from './wallet';

export const PAYMENT_MODES = ['CASH', 'ONLINE', 'CHEQUE', 'CREDIT'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface DeliveryInput {
  orderId: string;
  clientRef?: string | null;
  deliveredAt?: string | null; // ISO timestamp from the (possibly offline) device
  items: { productId: string; deliveredQty: number; emptyReceivedQty: number }[];
  paymentMode: PaymentMode;
  paymentAmount: number;
  transactionId?: string | null;
  chequeNumber?: string | null;
  chequeBank?: string | null;
  chequeDate?: string | null;
  paymentProofUrl?: string | null;
  chequePhotoUrl?: string | null;
  deliveryProofUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  remarks?: string | null;
}

const OPEN_FOR_DELIVERY = ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'];

function resolveDeliveryDate(deliveredAt?: string | null) {
  if (!deliveredAt) return businessDate();
  const at = new Date(deliveredAt);
  if (Number.isNaN(at.getTime())) throw badRequest('Invalid delivery time.');
  const ageHours = (Date.now() - at.getTime()) / 3_600_000;
  if (ageHours < -0.25) throw badRequest('Delivery time cannot be in the future.');
  if (ageHours > 48) throw badRequest('Offline entries older than 48 hours cannot be synced — contact the office.');
  return businessDate(at);
}

function validatePayment(input: DeliveryInput) {
  if (!PAYMENT_MODES.includes(input.paymentMode)) throw badRequest('Choose a payment mode.');
  if (!input.deliveryProofUrl || !isStoredFile(input.deliveryProofUrl)) throw badRequest('Delivery proof photo is mandatory.');
  const amount = Number(input.paymentAmount || 0);
  if (amount < 0) throw badRequest('Payment amount cannot be negative.');
  if (input.paymentMode !== 'CREDIT' && amount <= 0) throw badRequest('Enter the amount collected.');
  if (input.paymentMode === 'ONLINE') {
    if (!input.transactionId?.trim()) throw badRequest('Transaction ID is required for online payment.');
    if (!input.paymentProofUrl || !isStoredFile(input.paymentProofUrl)) throw badRequest('Payment screenshot is required for online payment.');
  }
  if (input.paymentMode === 'CHEQUE') {
    if (!input.chequeNumber?.trim() || !input.chequeBank?.trim() || !input.chequeDate) throw badRequest('Cheque number, bank and date are required.');
    if (!input.chequePhotoUrl || !isStoredFile(input.chequePhotoUrl)) throw badRequest('Cheque photo is required.');
  }
  return input.paymentMode === 'CREDIT' ? 0 : round2(amount);
}

/** Physical effects of a delivery: stock moves and cash in the boy's wallet. */
async function applyPhysicalEffects(tx: Tx, actor: Actor, delivery: Delivery & { items: DeliveryItem[] }, reverse: boolean) {
  const boy: StockLocation = { type: 'DELIVERY_BOY', id: delivery.deliveryBoyId, name: delivery.deliveryBoyName };
  const customer: StockLocation = { type: 'CUSTOMER', id: delivery.customerId, name: delivery.customerName };
  const base = { tenantId: actor.tenantId, referenceType: 'DELIVERY', referenceId: delivery.id, referenceNumber: delivery.deliveryNumber, performedBy: actor.name };
  const full = delivery.items.map((i) => ({ productId: i.productId, productName: i.productName, fullQty: i.deliveredQty }));
  const empty = delivery.items.map((i) => ({ productId: i.productId, productName: i.productName, emptyQty: i.emptyReceivedQty }));

  if (!reverse) {
    await moveStock(tx, { ...base, type: 'SALE', from: boy, to: customer, lines: full, reason: `Delivered on ${delivery.deliveryNumber}` });
    await moveStock(tx, { ...base, type: 'EMPTY_RETURN', from: customer, to: boy, lines: empty, reason: `Empties collected on ${delivery.deliveryNumber}` });
  } else {
    // Undo a sent-back delivery before the corrected entry is applied.
    await reverseDeliveryStock(tx, actor.tenantId, boy, customer, delivery.items, { ...base, reason: `Reversal of ${delivery.deliveryNumber} (revision ${delivery.revision})` });
  }

  if (delivery.paymentMode === 'CASH' && delivery.paymentAmount > 0) {
    const wallet = await getWallet(tx, actor.tenantId, 'DELIVERY_BOY', delivery.deliveryBoyId, delivery.deliveryBoyName);
    await postWallet(tx, wallet.id, {
      type: reverse ? 'REVERSAL' : 'COLLECTION',
      amount: reverse ? -delivery.paymentAmount : delivery.paymentAmount,
      referenceType: 'DELIVERY',
      referenceId: delivery.id,
      notes: `${reverse ? 'Reversal of' : 'Cash collected on'} ${delivery.deliveryNumber} (${delivery.customerName})`,
      performedBy: actor.name,
    });
  }
}

async function reverseDeliveryStock(
  tx: Tx,
  tenantId: string,
  boy: StockLocation,
  customer: StockLocation,
  items: DeliveryItem[],
  base: { referenceType: string; referenceId: string; referenceNumber: string; performedBy: string; reason: string }
) {
  for (const item of items) {
    const line = { productId: item.productId, productName: item.productName };
    // Full cylinders come back to the boy; empties go back to the customer.
    await moveStock(tx, { tenantId, ...base, type: 'REVERSAL', to: boy, lines: [{ ...line, fullQty: item.deliveredQty }] });
    await moveStock(tx, { tenantId, ...base, type: 'REVERSAL', from: boy, lines: [{ ...line, emptyQty: item.emptyReceivedQty }], allowNegative: true });
    await tx.customerCylinderBalance.update({
      where: { tenantId_customerId_productId: { tenantId, customerId: customer.id, productId: item.productId } },
      data: {
        deliveredQtyTotal: { decrement: item.deliveredQty },
        emptyReceivedTotal: { decrement: item.emptyReceivedQty },
        currentBalance: { increment: item.emptyReceivedQty - item.deliveredQty },
      },
    });
    // Customer-side record of the reversal (full given back, empties returned to customer).
    await tx.inventoryTransaction.create({
      data: {
        tenantId,
        transactionType: 'REVERSAL',
        fromType: 'CUSTOMER',
        fromId: customer.id,
        fromName: customer.name,
        ...line,
        fullQty: item.deliveredQty,
        emptyQty: item.emptyReceivedQty,
        referenceType: base.referenceType,
        referenceId: base.referenceId,
        referenceNumber: base.referenceNumber,
        reason: base.reason,
        performedBy: base.performedBy,
      },
    });
  }
}

/**
 * Delivery boy submits (or re-submits after correction) a delivery.
 * Stock and wallet change immediately; invoice and ledger wait for the
 * accountant's verification.
 */
export async function submitDelivery(tx: Tx, actor: Actor, input: DeliveryInput, effects: Effects) {
  if (input.clientRef) {
    const existing = await tx.delivery.findUnique({ where: { tenantId_clientRef: { tenantId: actor.tenantId, clientRef: input.clientRef } }, include: { items: true } });
    if (existing) return { delivery: existing, duplicate: true };
  }

  const order = await tx.order.findFirst({ where: { id: input.orderId, tenantId: actor.tenantId }, include: { items: true, deliveries: { include: { items: true } } } });
  if (!order) throw notFound('Order not found.');
  if (order.assignedDeliveryBoyId !== actor.userId) throw forbidden('This order is not assigned to you.');

  const sentBack = order.deliveries.find((d) => d.status === 'SENT_BACK');
  if (!sentBack && !OPEN_FOR_DELIVERY.includes(order.status)) throw conflict(`Order ${order.orderNumber} is ${order.status.replace(/_/g, ' ').toLowerCase()}.`);

  const deliveryDate = sentBack ? sentBack.deliveryDate : resolveDeliveryDate(input.deliveredAt);
  await assertDayOpen(tx, actor.tenantId, deliveryDate);
  if (!sentBack) await assertDeliveryDayOpen(tx, actor.tenantId, actor.userId, deliveryDate);

  const security = await getSetting(actor.tenantId, 'security');
  if (security.deliveryLocationRequired && !security.locationOverride && (input.latitude == null || input.longitude == null)) {
    throw new ApiError(400, 'Location is required for delivery. Please allow location access.', 'LOCATION_REQUIRED');
  }

  const paymentAmount = validatePayment(input);

  // Delivery lines must match the order's products.
  const lines = order.items.map((oi) => {
    const entered = input.items.find((i) => i.productId === oi.productId);
    const deliveredQty = Number(entered?.deliveredQty || 0);
    const emptyReceivedQty = Number(entered?.emptyReceivedQty || 0);
    if (deliveredQty < 0 || emptyReceivedQty < 0 || !Number.isInteger(deliveredQty) || !Number.isInteger(emptyReceivedQty)) {
      throw badRequest('Quantities must be whole numbers.');
    }
    return {
      productId: oi.productId,
      productName: oi.productName,
      orderedQty: oi.orderedQty,
      deliveredQty,
      emptyReceivedQty,
      unitPrice: oi.unitPrice,
      taxRate: oi.taxRate,
      totalAmount: round2(deliveredQty * oi.unitPrice),
    };
  });
  if (input.items.some((i) => !order.items.find((oi) => oi.productId === i.productId))) throw badRequest('A product in the delivery is not part of this order.');
  const deliveredQtyTotal = lines.reduce((s, l) => s + l.deliveredQty, 0);
  const emptyReceivedTotal = lines.reduce((s, l) => s + l.emptyReceivedQty, 0);
  if (deliveredQtyTotal === 0 && emptyReceivedTotal === 0) throw badRequest('Enter delivered or empty cylinder quantity.');
  const invoiceAmount = round2(lines.reduce((s, l) => s + l.totalAmount, 0));

  // Variance flags for the accountant (SRS §9.3, success criteria < 1 %).
  const operations = await getSetting(actor.tenantId, 'operations');
  const notes: string[] = [];
  for (const l of lines) {
    const diffPct = l.orderedQty ? (Math.abs(l.deliveredQty - l.orderedQty) / l.orderedQty) * 100 : 0;
    if (l.deliveredQty !== l.orderedQty && diffPct >= operations.varianceTolerancePercent) notes.push(`${l.productName}: ordered ${l.orderedQty}, delivered ${l.deliveredQty}`);
    if (l.emptyReceivedQty !== l.deliveredQty) notes.push(`${l.productName}: delivered ${l.deliveredQty} full, received ${l.emptyReceivedQty} empty`);
  }
  if (input.paymentMode !== 'CREDIT' && Math.abs(paymentAmount - invoiceAmount) >= 1) {
    notes.push(`Collected ₹${paymentAmount} against bill ₹${invoiceAmount}${paymentAmount < invoiceAmount ? ' (balance on credit)' : ' (extra towards old dues)'}`);
  }

  const data = {
    deliveryDate,
    deliveredQtyTotal,
    emptyReceivedTotal,
    hasVariance: notes.length > 0,
    varianceNotes: notes.join('; ') || null,
    invoiceAmount,
    paymentMode: input.paymentMode,
    paymentAmount,
    transactionId: input.transactionId || null,
    chequeNumber: input.chequeNumber || null,
    chequeBank: input.chequeBank || null,
    chequeDate: input.chequeDate || null,
    paymentProofUrl: input.paymentProofUrl || null,
    chequePhotoUrl: input.chequePhotoUrl || null,
    deliveryProofUrl: input.deliveryProofUrl,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    remarks: input.remarks || null,
    status: 'PENDING_VERIFICATION',
  };

  let delivery: Delivery & { items: DeliveryItem[] };
  if (sentBack) {
    await applyPhysicalEffects(tx, actor, sentBack, true);
    await tx.deliveryItem.deleteMany({ where: { deliveryId: sentBack.id } });
    delivery = await tx.delivery.update({
      where: { id: sentBack.id },
      data: { ...data, clientRef: input.clientRef || sentBack.clientRef, revision: { increment: 1 }, sentBackReason: null, items: { create: lines } },
      include: { items: true },
    });
  } else {
    delivery = await tx.delivery.create({
      data: {
        ...data,
        tenantId: actor.tenantId,
        deliveryNumber: await nextNumber(tx, actor.tenantId, 'DEL'),
        clientRef: input.clientRef || null,
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        deliveryBoyId: actor.userId,
        deliveryBoyName: actor.name,
        items: { create: lines },
      },
      include: { items: true },
    });
  }
  await applyPhysicalEffects(tx, actor, delivery, false);

  if (!sentBack) await setOrderStatus(tx, order, 'DELIVERED', actor.name, `Delivery ${delivery.deliveryNumber}`);
  await setOrderStatus(tx, order, 'PENDING_VERIFICATION', actor.name, sentBack ? `Corrected entry (revision ${delivery.revision})` : undefined);

  await createApproval(
    tx,
    {
      tenantId: actor.tenantId,
      type: 'DELIVERY_VERIFICATION',
      referenceType: 'DELIVERY',
      referenceId: delivery.id,
      title: `${delivery.deliveryNumber} · ${delivery.customerName}${sentBack ? ' (corrected)' : ''}`,
      summary: `${deliveredQtyTotal} delivered / ${emptyReceivedTotal} empty · ${input.paymentMode} ₹${paymentAmount.toLocaleString('en-IN')} of ₹${invoiceAmount.toLocaleString('en-IN')}${notes.length ? ' · VARIANCE' : ''}`,
      payload: { orderNumber: order.orderNumber, deliveryNumber: delivery.deliveryNumber, hasVariance: notes.length > 0 },
      requestedById: actor.userId,
      requestedByName: actor.name,
    },
    effects
  );
  await audit(tx, actor, { action: sentBack ? 'DELIVERY_RESUBMITTED' : 'DELIVERY_SUBMITTED', entityType: 'Delivery', entityId: delivery.id, reference: delivery.deliveryNumber, newValue: { deliveredQtyTotal, emptyReceivedTotal, paymentMode: input.paymentMode, paymentAmount } });

  const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } });
  const provisionalOutstanding = round2(customer.balance + invoiceAmount - paymentAmount);
  effects.add('delivery completed message', () =>
    notifyCustomer(actor.tenantId, customer, 'DELIVERY_COMPLETED', {
      deliveryNumber: delivery.deliveryNumber,
      deliveredQty: deliveredQtyTotal,
      emptyQty: emptyReceivedTotal,
      paymentSummary: input.paymentMode === 'CREDIT' ? `Credit ₹${invoiceAmount}` : `${input.paymentMode} ₹${paymentAmount}`,
      outstanding: provisionalOutstanding.toLocaleString('en-IN'),
    })
  );
  return { delivery, duplicate: false };
}

/** Accountant approves a delivery: invoice → ledger → payment → completed. */
export async function verifyDelivery(tx: Tx, actor: Actor, deliveryId: string, note: string | null, effects: Effects) {
  const delivery = await tx.delivery.findFirst({ where: { id: deliveryId, tenantId: actor.tenantId }, include: { items: true, order: true } });
  if (!delivery) throw notFound('Delivery not found.');
  if (delivery.status !== 'PENDING_VERIFICATION') throw conflict('Delivery is not waiting for verification.');
  await assertDayOpen(tx, actor.tenantId, delivery.deliveryDate);

  const order = delivery.order;
  const customer = await tx.customer.findUniqueOrThrow({ where: { id: delivery.customerId } });
  await tx.delivery.update({ where: { id: delivery.id }, data: { status: 'VERIFIED', verifiedBy: actor.name, verifiedAt: new Date(), verificationNotes: note } });
  await setOrderStatus(tx, order, 'VERIFIED', actor.name, note || undefined);

  // A pickup-only visit (empties collected, nothing delivered) has no invoice.
  const delivered = delivery.items.some((i) => i.deliveredQty > 0);
  let invoice: Awaited<ReturnType<typeof createInvoiceFromLines>> | null = null;
  let balance = customer.balance;
  if (delivered) {
    const products = await tx.product.findMany({ where: { id: { in: delivery.items.map((i) => i.productId) } } });
    invoice = await createInvoiceFromLines(tx, {
      tenantId: actor.tenantId,
      customer,
      date: delivery.deliveryDate,
      lines: delivery.items.map((i) => {
        const p = products.find((x) => x.id === i.productId);
        return { productId: i.productId, productName: i.productName, hsnCode: p?.hsnCode || '27111900', quantity: i.deliveredQty, unit: p?.unit || 'PCS', unitPrice: i.unitPrice, taxRate: i.taxRate };
      }),
      source: 'DELIVERY',
      orderId: order.id,
      deliveryId: delivery.id,
      paymentMode: delivery.paymentMode,
      salesmanId: delivery.deliveryBoyId,
      salesmanName: delivery.deliveryBoyName,
      notes: `Delivery ${delivery.deliveryNumber} · Order ${order.orderNumber}`,
      createdBy: actor.name,
      print: {
        shipTo: order.deliveryAddress || null,
        orderNumber: order.orderNumber,
        deliveryNumber: delivery.deliveryNumber,
        deliveryBoy: delivery.deliveryBoyName,
        cylinders: delivery.items.map((i) => ({ productName: i.productName, delivered: i.deliveredQty, emptyReceived: i.emptyReceivedQty })),
      },
    });
    await setOrderStatus(tx, order, 'INVOICED', actor.name, invoice.invoiceNumber);
    balance = (
      await postCustomerLedger(tx, {
        tenantId: actor.tenantId,
        customerId: customer.id,
        entryType: 'INVOICE',
        debit: invoice.grandTotal,
        voucherNumber: invoice.invoiceNumber,
        date: delivery.deliveryDate,
        particulars: `${delivery.items.filter((i) => i.deliveredQty > 0).map((i) => `${i.productName} × ${i.deliveredQty}`).join(', ')} (${delivery.deliveryNumber})`,
        referenceType: 'INVOICE',
        referenceId: invoice.id,
        createdBy: actor.name,
      })
    ).runningBalance;
  }

  let payment = null;
  if (delivery.paymentMode !== 'CREDIT' && delivery.paymentAmount > 0) {
    payment = await tx.payment.create({
      data: {
        tenantId: actor.tenantId,
        paymentNumber: await nextNumber(tx, actor.tenantId, 'RCPT'),
        customerId: customer.id,
        customerName: customer.name,
        source: 'DELIVERY',
        deliveryId: delivery.id,
        invoiceId: invoice?.id,
        mode: delivery.paymentMode,
        amount: delivery.paymentAmount,
        paymentDate: delivery.deliveryDate,
        transactionId: delivery.transactionId,
        chequeNumber: delivery.chequeNumber,
        chequeBank: delivery.chequeBank,
        chequeDate: delivery.chequeDate,
        proofUrl: delivery.paymentProofUrl || delivery.chequePhotoUrl,
        status: 'VERIFIED',
        enteredBy: delivery.deliveryBoyName,
        verifiedBy: actor.name,
        verifiedAt: new Date(),
      },
    });
    balance = (
      await postCustomerLedger(tx, {
        tenantId: actor.tenantId,
        customerId: customer.id,
        entryType: 'PAYMENT',
        credit: delivery.paymentAmount,
        voucherNumber: payment.paymentNumber,
        date: delivery.deliveryDate,
        particulars: `${delivery.paymentMode} received on ${delivery.deliveryNumber}${delivery.transactionId ? ` (Txn ${delivery.transactionId})` : ''}${delivery.chequeNumber ? ` (Chq ${delivery.chequeNumber})` : ''}`,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        createdBy: actor.name,
      })
    ).runningBalance;
    if (delivery.paymentMode === 'ONLINE' || delivery.paymentMode === 'CHEQUE') {
      await postBookEntry(tx, {
        tenantId: actor.tenantId,
        ledgerType: 'BANK',
        accountName: 'Bank (Receipts)',
        entryType: 'PAYMENT',
        debit: delivery.paymentAmount,
        voucherNumber: payment.paymentNumber,
        date: delivery.deliveryDate,
        particulars: `${delivery.paymentMode} from ${customer.name} (${delivery.deliveryNumber})`,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        createdBy: actor.name,
      });
    }
  }

  const finalBalance = balance;
  let updatedInvoice = null;
  if (invoice) {
    const paid = Math.min(delivery.paymentAmount, invoice.grandTotal);
    updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: paid,
        balanceAfter: finalBalance,
        status: invoiceStatus(invoice.grandTotal, paid),
        paymentSummary: { mode: delivery.paymentMode, amount: delivery.paymentAmount, transactionId: delivery.transactionId, chequeNumber: delivery.chequeNumber, credit: round2(Math.max(invoice.grandTotal - delivery.paymentAmount, 0)) },
      },
    });
  }
  await setOrderStatus(tx, order, 'LEDGER_POSTED', actor.name);
  await setOrderStatus(tx, order, 'COMPLETED', actor.name);
  await audit(tx, actor, {
    action: 'DELIVERY_VERIFIED',
    entityType: 'Delivery',
    entityId: delivery.id,
    reference: `${delivery.deliveryNumber}${invoice ? ` → ${invoice.invoiceNumber}` : ' (empty pickup)'}`,
    newValue: { invoice: invoice?.invoiceNumber, amount: invoice?.grandTotal ?? 0, outstanding: finalBalance },
  });

  if (updatedInvoice) {
    const inv = updatedInvoice;
    const appUrl = process.env.APP_URL || '';
    effects.add('invoice message', async () => {
      await notifyCustomer(
        actor.tenantId,
        customer,
        'INVOICE',
        { invoiceNumber: inv.invoiceNumber, date: inv.date, amount: inv.grandTotal.toLocaleString('en-IN'), paid: inv.paidAmount.toLocaleString('en-IN'), outstanding: finalBalance.toLocaleString('en-IN'), link: appUrl ? `${appUrl}/customer?invoice=${inv.id}` : '' },
        `Invoice ${inv.invoiceNumber}`
      );
      await prisma.invoice.update({ where: { id: inv.id }, data: { sentAt: new Date() } });
    });
  }
  if (payment) {
    const p = payment;
    effects.add('payment message', () =>
      notifyCustomer(actor.tenantId, customer, 'PAYMENT_RECEIVED', { amount: p.amount.toLocaleString('en-IN'), mode: p.mode, outstanding: finalBalance.toLocaleString('en-IN'), paymentNumber: p.paymentNumber })
    );
  }
  return updatedInvoice;
}

/** Accountant rejects: the delivery goes back to the boy for correction. */
export async function sendBackDelivery(tx: Tx, actor: Actor, deliveryId: string, reason: string, effects: Effects) {
  if (!reason.trim()) throw badRequest('Reason is mandatory when sending a delivery back.');
  const delivery = await tx.delivery.findFirst({ where: { id: deliveryId, tenantId: actor.tenantId }, include: { order: true } });
  if (!delivery) throw notFound('Delivery not found.');
  if (delivery.status !== 'PENDING_VERIFICATION') throw conflict('Delivery is not waiting for verification.');
  await tx.delivery.update({ where: { id: delivery.id }, data: { status: 'SENT_BACK', sentBackReason: reason } });
  await setOrderStatus(tx, delivery.order, 'SENT_BACK', actor.name, reason);
  await audit(tx, actor, { action: 'DELIVERY_SENT_BACK', entityType: 'Delivery', entityId: delivery.id, reference: delivery.deliveryNumber, reason });
  effects.add('notify boy about correction', () =>
    notifyUsers(actor.tenantId, [delivery.deliveryBoyId], { title: 'Delivery sent back for correction', body: `${delivery.deliveryNumber} (${delivery.customerName}): ${reason}`, link: '/delivery' })
  );
  effects.add('notify managers', () => notifyRoles(actor.tenantId, ['MANAGER'], { title: 'Delivery sent back', body: `${delivery.deliveryNumber}: ${reason}` }));
}
