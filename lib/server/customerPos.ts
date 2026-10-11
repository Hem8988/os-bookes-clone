import type { Tx } from '@/lib/db';
import type { CustomerPo, CustomerPoItem } from '@/lib/generated/prisma/client';
import { audit, type Actor } from './audit';
import { badRequest, businessDate, conflict, dateStr, forbidden, notFound, optStr, round2, str } from './http';
import { isStoredFile } from './storage';

// Purchase orders received from customers. The office (or the customer, from the
// portal) saves the PO; orders are then supplied against it and every verified
// delivery counts its quantities down until the PO is fulfilled.

export const PO_STATUSES = ['RECEIVED', 'OPEN', 'PARTIAL', 'FULFILLED', 'EXPIRED', 'CANCELLED'] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

/** Statuses an order can still be supplied against. */
const SUPPLIABLE: PoStatus[] = ['OPEN', 'PARTIAL'];

type PoWithItems = CustomerPo & { items: CustomerPoItem[] };

/** A PO quotes the basic rate; our orders and invoices carry the GST-inclusive rate (kept to 4 decimals so line totals match the PO). */
export const inclusiveRate = (basic: number, taxRate: number) => Math.round(basic * (1 + taxRate / 100) * 10_000) / 10_000;

/** Things on the PO the office should look at before supplying against it. */
export function poWarnings(po: PoWithItems, today = businessDate()): string[] {
  const warnings: string[] = [];
  if (SUPPLIABLE.includes(po.status as PoStatus) && po.validTill && po.validTill < today) warnings.push(`PO validity ended on ${po.validTill}.`);
  if (po.deliveryDate && po.validTill && po.deliveryDate > po.validTill) warnings.push(`Delivery date ${po.deliveryDate} is after the PO validity (${po.validTill}).`);
  if (po.poTotal && po.totalAmount && Math.abs(po.poTotal - po.totalAmount) > 1) warnings.push(`PO total ₹${po.poTotal.toFixed(2)} does not match the items with GST (₹${po.totalAmount.toFixed(2)}).`);
  if (po.items.some((i) => !i.rate) && po.items.some((i) => i.rate)) warnings.push('Some items have no rate — the customer’s normal rate will apply to them.');
  return warnings;
}

/** Status as shown: an open PO past its validity date reads as EXPIRED. */
export function effectiveStatus(po: Pick<CustomerPo, 'status' | 'validTill'>, today = businessDate()): PoStatus {
  if (SUPPLIABLE.includes(po.status as PoStatus) && po.validTill && po.validTill < today) return 'EXPIRED';
  return po.status as PoStatus;
}

export function poToClient(po: PoWithItems & { customer?: { name: string; shortName: string | null; customerCode: string } | null; _count?: { orders: number } }) {
  return {
    ...po,
    status: effectiveStatus(po),
    warnings: poWarnings(po),
    items: po.items.map((i) => ({ ...i, pendingQty: Math.max(0, round2(i.qty - i.deliveredQty)) })),
  };
}

export interface PoInput {
  customerId: string;
  poNumber?: unknown;
  poDate?: unknown;
  validTill?: unknown;
  deliveryDate?: unknown;
  deliveryAddressId?: unknown;
  paymentTerms?: unknown;
  vendorCode?: unknown;
  refNumber?: unknown;
  poTotal?: unknown;
  fileUrl?: unknown;
  notes?: unknown;
  items?: unknown;
}

/** PO lines; rates are the office's call, so a customer's own entry never sets them. */
async function readItems(tx: Tx, actor: Actor, raw: unknown) {
  const tenantId = actor.tenantId;
  const lines = Array.isArray(raw) ? (raw as { productId?: unknown; qty?: unknown; rate?: unknown; itemCode?: unknown }[]) : [];
  const items: { productId: string; productName: string; itemCode: string | null; qty: number; rate: number; taxRate: number }[] = [];
  for (const line of lines) {
    const productId = String(line.productId || '');
    const qty = Number(line.qty);
    if (!productId && !qty) continue;
    if (!Number.isFinite(qty) || qty <= 0) throw badRequest('Each PO line needs a quantity above 0.');
    const rate = actor.role === 'CUSTOMER' ? 0 : Number(line.rate) || 0;
    if (rate < 0) throw badRequest('Rate cannot be negative.');
    if (items.some((i) => i.productId === productId)) throw badRequest('A product is listed twice in the PO.');
    const product = await tx.product.findFirst({ where: { id: productId, tenantId }, select: { id: true, name: true, taxRate: true } });
    if (!product) throw badRequest('One of the PO products was not found.');
    items.push({ productId: product.id, productName: product.name, itemCode: optStr(line.itemCode)?.slice(0, 40) ?? null, qty, rate, taxRate: product.taxRate });
  }
  return items;
}

const linesTotal = (items: { qty: number; rate: number; taxRate: number }[]) => round2(items.reduce((s, i) => s + i.qty * inclusiveRate(i.rate, i.taxRate), 0));

async function readHeader(tx: Tx, customerId: string, input: PoInput) {
  const poNumber = str(input.poNumber, 'PO number', { required: true, max: 60 }).toUpperCase();
  const poDate = dateStr(input.poDate, 'PO date');
  const validTill = optStr(input.validTill);
  if (validTill && dateStr(validTill, 'Valid till') < poDate) throw badRequest('Valid till cannot be before the PO date.');
  const fileUrl = optStr(input.fileUrl);
  if (fileUrl && !isStoredFile(fileUrl)) throw badRequest('Upload the PO copy again.');
  const notes = optStr(input.notes)?.slice(0, 500) ?? null;
  const deliveryDate = optStr(input.deliveryDate);
  if (deliveryDate) dateStr(deliveryDate, 'Delivery date');
  const deliveryAddressId = optStr(input.deliveryAddressId);
  if (deliveryAddressId && !(await tx.customerAddress.findFirst({ where: { id: deliveryAddressId, customerId }, select: { id: true } }))) throw badRequest('Delivery address not found.');
  const poTotal = input.poTotal === undefined || input.poTotal === null || input.poTotal === '' ? null : Number(input.poTotal);
  if (poTotal !== null && (!Number.isFinite(poTotal) || poTotal < 0)) throw badRequest('PO total must be a number.');
  const text = (v: unknown, max: number) => optStr(v)?.slice(0, max) ?? null;
  return { poNumber, poDate, validTill, deliveryDate, deliveryAddressId, paymentTerms: text(input.paymentTerms, 120), vendorCode: text(input.vendorCode, 40), refNumber: text(input.refNumber, 120), poTotal, fileUrl, notes };
}

/** New PO. From the portal it waits as RECEIVED until the office accepts it. */
export async function createCustomerPo(tx: Tx, actor: Actor, input: PoInput) {
  const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId: actor.tenantId, type: 'Customer' }, select: { id: true, name: true } });
  if (!customer) throw notFound('Customer not found.');
  const header = await readHeader(tx, customer.id, input);
  const items = await readItems(tx, actor, input.items);
  const fromPortal = actor.role === 'CUSTOMER';
  if (!items.length && !header.fileUrl) throw badRequest('Add the PO items or upload the PO copy.');
  const po = await tx.customerPo.create({
    data: {
      tenantId: actor.tenantId,
      customerId: customer.id,
      ...header,
      source: fromPortal ? 'CUSTOMER_PORTAL' : 'ADMIN',
      status: fromPortal ? 'RECEIVED' : 'OPEN',
      totalAmount: linesTotal(items),
      createdBy: actor.name,
      items: { create: items },
    },
    include: { items: true },
  });
  await audit(tx, actor, { action: 'CUSTOMER_PO_CREATE', entityType: 'CustomerPo', entityId: po.id, reference: po.poNumber, details: `${customer.name} · ${items.length} item(s)` });
  return po;
}

/** Edit header and lines. Delivered quantities stay with their product; a line cannot drop below what has gone out. */
export async function updateCustomerPo(tx: Tx, actor: Actor, id: string, input: PoInput) {
  const po = await tx.customerPo.findFirst({ where: { id, tenantId: actor.tenantId }, include: { items: true } });
  if (!po) throw notFound('PO not found.');
  if (actor.role === 'CUSTOMER' && po.status !== 'RECEIVED') throw forbidden('The office has already accepted this PO — ask them to change it.');
  if (po.status === 'CANCELLED') throw conflict('This PO is cancelled.');
  const header = await readHeader(tx, po.customerId, input);
  const items = await readItems(tx, actor, input.items);
  for (const old of po.items) {
    if (old.deliveredQty <= 0) continue;
    const kept = items.find((i) => i.productId === old.productId);
    if (!kept) throw badRequest(`${old.productName} has deliveries against this PO and cannot be removed.`);
    if (kept.qty < old.deliveredQty) throw badRequest(`${old.productName}: ${old.deliveredQty} already delivered — quantity cannot be lower.`);
  }
  await tx.customerPoItem.deleteMany({ where: { poId: po.id } });
  const saved = await tx.customerPo.update({
    where: { id: po.id },
    data: {
      ...header,
      totalAmount: linesTotal(items),
      items: { create: items.map((i) => ({ ...i, deliveredQty: po.items.find((o) => o.productId === i.productId)?.deliveredQty ?? 0 })) },
    },
    include: { items: true },
  });
  await refreshPoStatus(tx, saved.id);
  await audit(tx, actor, { action: 'CUSTOMER_PO_UPDATE', entityType: 'CustomerPo', entityId: po.id, reference: saved.poNumber, oldValue: po, newValue: saved });
  return saved;
}

/** Office accepts a PO the customer uploaded, or cancels / reopens one. */
export async function setPoStatus(tx: Tx, actor: Actor, id: string, action: 'accept' | 'cancel' | 'reopen', reason: string | null) {
  const po = await tx.customerPo.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!po) throw notFound('PO not found.');
  if (action === 'accept') {
    if (po.status !== 'RECEIVED') throw conflict('Only a PO received from the customer can be accepted.');
    await tx.customerPo.update({ where: { id }, data: { status: 'OPEN' } });
  } else if (action === 'cancel') {
    if (po.status === 'CANCELLED') throw conflict('This PO is already cancelled.');
    await tx.customerPo.update({ where: { id }, data: { status: 'CANCELLED', notes: reason ? [po.notes, `Cancelled: ${reason}`].filter(Boolean).join(' · ') : po.notes } });
  } else {
    if (po.status !== 'CANCELLED' && po.status !== 'FULFILLED') throw conflict('Only a cancelled or fulfilled PO can be reopened.');
    await tx.customerPo.update({ where: { id }, data: { status: 'OPEN' } });
    await refreshPoStatus(tx, id, true);
  }
  await audit(tx, actor, { action: `CUSTOMER_PO_${action.toUpperCase()}`, entityType: 'CustomerPo', entityId: id, reference: po.poNumber, reason: reason ?? undefined });
}

/** OPEN / PARTIAL / FULFILLED from the delivered quantities (RECEIVED and CANCELLED are left alone unless forced). */
export async function refreshPoStatus(tx: Tx, poId: string, force = false) {
  const po = await tx.customerPo.findUniqueOrThrow({ where: { id: poId }, include: { items: true } });
  if (!force && (po.status === 'RECEIVED' || po.status === 'CANCELLED')) return po.status;
  const delivered = po.items.some((i) => i.deliveredQty > 0);
  const done = po.items.length > 0 && po.items.every((i) => i.deliveredQty >= i.qty);
  const status: PoStatus = done ? 'FULFILLED' : delivered ? 'PARTIAL' : 'OPEN';
  if (status !== po.status) await tx.customerPo.update({ where: { id: poId }, data: { status } });
  return status;
}

/**
 * Check an order against its PO. Returns the GST-inclusive PO rate per product (products without a
 * PO rate keep the customer's normal rate) and the delivery address (site) the PO is for.
 * A PO without lines only carries its number; one with lines limits products and quantities.
 */
export async function poForOrder(tx: Tx, tenantId: string, customerId: string, poId: string, deliveryDate: string, lines: { productId: string; qty: number }[]) {
  const po = await tx.customerPo.findFirst({ where: { id: poId, tenantId }, include: { items: true } });
  if (!po || po.customerId !== customerId) throw badRequest('PO not found for this customer.');
  const status = effectiveStatus(po, deliveryDate);
  if (!SUPPLIABLE.includes(status)) throw badRequest(`PO ${po.poNumber} is ${status.toLowerCase()} — orders cannot be placed against it.`);
  if (po.items.length) {
    for (const line of lines) {
      const item = po.items.find((i) => i.productId === line.productId);
      if (!item) throw badRequest(`One of the products is not in PO ${po.poNumber}.`);
      const pending = round2(item.qty - item.deliveredQty);
      if (line.qty > pending) throw badRequest(`PO ${po.poNumber}: only ${pending} ${item.productName} left.`);
    }
  }
  return { rates: new Map(po.items.filter((i) => i.rate > 0).map((i) => [i.productId, inclusiveRate(i.rate, i.taxRate)])), deliveryAddressId: po.deliveryAddressId };
}

/** A verified delivery counts down the PO; returns what the invoice prints from it. */
export async function applyDeliveryToPo(tx: Tx, poId: string, delivered: { productId: string; deliveredQty: number }[]) {
  const po = await tx.customerPo.findUnique({ where: { id: poId }, include: { items: true } });
  if (!po) return null;
  for (const d of delivered) {
    const item = po.items.find((i) => i.productId === d.productId);
    if (item && d.deliveredQty > 0) await tx.customerPoItem.update({ where: { id: item.id }, data: { deliveredQty: { increment: d.deliveredQty } } });
  }
  await refreshPoStatus(tx, po.id);
  const itemCodes = Object.fromEntries(po.items.filter((i) => i.itemCode).map((i) => [i.productName, i.itemCode as string]));
  return { poNumber: po.poNumber, poDate: po.poDate, vendorCode: po.vendorCode, itemCodes };
}
