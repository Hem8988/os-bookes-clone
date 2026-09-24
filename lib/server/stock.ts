import type { Tx } from '@/lib/db';
import { createApproval } from './approvals';
import { audit, Actor } from './audit';
import type { Effects } from './effects';
import { badRequest, conflict, forbidden, notFound } from './http';
import { adjustCustomerHolding, adjustLocationStock, getDefaultWarehouse, moveStock, resolveLocation, StockLocation } from './inventory';
import { nextNumber } from './sequence';

export const TRANSFER_TYPES = ['WAREHOUSE_TO_DRIVER', 'DRIVER_TO_DRIVER', 'DRIVER_TO_WAREHOUSE', 'WAREHOUSE_TO_WAREHOUSE'] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

const ENDPOINTS: Record<TransferType, ['WAREHOUSE' | 'DELIVERY_BOY', 'WAREHOUSE' | 'DELIVERY_BOY']> = {
  WAREHOUSE_TO_DRIVER: ['WAREHOUSE', 'DELIVERY_BOY'],
  DRIVER_TO_DRIVER: ['DELIVERY_BOY', 'DELIVERY_BOY'],
  DRIVER_TO_WAREHOUSE: ['DELIVERY_BOY', 'WAREHOUSE'],
  WAREHOUSE_TO_WAREHOUSE: ['WAREHOUSE', 'WAREHOUSE'],
};

const MOVEMENT: Record<TransferType, 'ISSUE' | 'RETURN' | 'TRANSFER'> = {
  WAREHOUSE_TO_DRIVER: 'ISSUE',
  DRIVER_TO_DRIVER: 'TRANSFER',
  DRIVER_TO_WAREHOUSE: 'RETURN',
  WAREHOUSE_TO_WAREHOUSE: 'TRANSFER',
};

async function productLines(tx: Tx, tenantId: string, items: { productId: string; fullQty?: number; emptyQty?: number }[]) {
  const lines = [];
  for (const item of items) {
    const fullQty = Number(item.fullQty || 0);
    const emptyQty = Number(item.emptyQty || 0);
    if (fullQty < 0 || emptyQty < 0 || !Number.isInteger(fullQty) || !Number.isInteger(emptyQty)) throw badRequest('Quantities must be whole numbers.');
    if (fullQty === 0 && emptyQty === 0) continue;
    const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
    if (!product) throw badRequest('Product not found.');
    lines.push({ productId: product.id, productName: product.name, fullQty, emptyQty });
  }
  if (lines.length === 0) throw badRequest('Enter at least one quantity.');
  return lines;
}

/**
 * Stock transfer request (SRS §10.4). Nothing moves until a manager/admin
 * approves it. Delivery boys may only request transfers involving themselves.
 */
export async function requestTransfer(
  tx: Tx,
  actor: Actor,
  input: { transferType: TransferType; fromId: string; toId: string; items: { productId: string; fullQty?: number; emptyQty?: number }[]; notes?: string | null },
  effects: Effects
) {
  if (!ENDPOINTS[input.transferType]) throw badRequest('Invalid transfer type.');
  const [fromType, toType] = ENDPOINTS[input.transferType];
  const from = await resolveLocation(tx, actor.tenantId, fromType, input.fromId);
  const to = await resolveLocation(tx, actor.tenantId, toType, input.toId);
  if (from.type === to.type && from.id === to.id) throw badRequest('Source and destination must be different.');
  if (actor.role === 'DELIVERY_BOY' && from.id !== actor.userId && to.id !== actor.userId) throw forbidden('You can only request transfers to or from yourself.');
  const lines = await productLines(tx, actor.tenantId, input.items);

  const transfer = await tx.stockTransfer.create({
    data: {
      tenantId: actor.tenantId,
      transferNumber: await nextNumber(tx, actor.tenantId, 'ST'),
      transferType: input.transferType,
      fromType: from.type,
      fromId: from.id,
      fromName: from.name,
      toType: to.type,
      toId: to.id,
      toName: to.name,
      requestedBy: actor.name,
      notes: input.notes || null,
      items: { create: lines },
    },
    include: { items: true },
  });
  await createApproval(
    tx,
    {
      tenantId: actor.tenantId,
      type: 'STOCK_TRANSFER',
      referenceType: 'STOCK_TRANSFER',
      referenceId: transfer.id,
      title: `${transfer.transferNumber} · ${from.name} → ${to.name}`,
      summary: lines.map((l) => `${l.productName}: ${l.fullQty} full / ${l.emptyQty} empty`).join(', '),
      requestedById: actor.userId,
      requestedByName: actor.name,
    },
    effects
  );
  return transfer;
}

export async function approveTransfer(tx: Tx, actor: Actor, transferId: string) {
  const transfer = await tx.stockTransfer.findFirst({ where: { id: transferId, tenantId: actor.tenantId }, include: { items: true } });
  if (!transfer) throw notFound('Transfer not found.');
  if (transfer.status !== 'PENDING_APPROVAL') throw conflict('Transfer is already processed.');
  await moveStock(tx, {
    tenantId: actor.tenantId,
    type: MOVEMENT[transfer.transferType as TransferType],
    from: { type: transfer.fromType as StockLocation['type'], id: transfer.fromId, name: transfer.fromName },
    to: { type: transfer.toType as StockLocation['type'], id: transfer.toId, name: transfer.toName },
    lines: transfer.items,
    referenceType: 'TRANSFER',
    referenceId: transfer.id,
    referenceNumber: transfer.transferNumber,
    reason: transfer.notes || `Stock transfer ${transfer.transferNumber}`,
    performedBy: actor.name,
  });
  await tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'APPROVED', approvedBy: actor.name, approvedAt: new Date() } });
  await audit(tx, actor, { action: 'STOCK_TRANSFER_APPROVED', entityType: 'StockTransfer', entityId: transfer.id, reference: transfer.transferNumber });
}

export async function rejectTransfer(tx: Tx, actor: Actor, transferId: string, reason: string) {
  const transfer = await tx.stockTransfer.findFirst({ where: { id: transferId, tenantId: actor.tenantId } });
  if (!transfer) throw notFound('Transfer not found.');
  if (transfer.status !== 'PENDING_APPROVAL') throw conflict('Transfer is already processed.');
  await tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'REJECTED', rejectionReason: reason } });
}

export interface AdjustmentInput {
  target: 'LOCATION' | 'CUSTOMER';
  locationType?: 'WAREHOUSE' | 'DELIVERY_BOY';
  locationId?: string;
  customerId?: string;
  productId: string;
  fullDelta?: number;
  emptyDelta?: number;
  defectiveDelta?: number;
  qtyDelta?: number;
  reason: string;
}

async function describeAdjustment(tx: Tx, tenantId: string, input: AdjustmentInput) {
  const product = await tx.product.findFirst({ where: { id: input.productId, tenantId } });
  if (!product) throw badRequest('Product not found.');
  if (input.target === 'CUSTOMER') {
    const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId } });
    if (!customer) throw badRequest('Customer not found.');
    const qty = Number(input.qtyDelta || 0);
    if (!qty) throw badRequest('Enter the quantity to add or remove.');
    return { product, customer, text: `${customer.name}: ${product.name} ${qty > 0 ? '+' : ''}${qty} held` };
  }
  const location = await resolveLocation(tx, tenantId, input.locationType || 'WAREHOUSE', input.locationId || '');
  const [f, e, d] = [Number(input.fullDelta || 0), Number(input.emptyDelta || 0), Number(input.defectiveDelta || 0)];
  if (!f && !e && !d) throw badRequest('Enter at least one quantity change.');
  return { product, location, text: `${location.name}: ${product.name} full ${f >= 0 ? '+' : ''}${f}, empty ${e >= 0 ? '+' : ''}${e}, defective ${d >= 0 ? '+' : ''}${d}` };
}

export async function applyAdjustment(tx: Tx, actor: Actor, input: AdjustmentInput, referenceId?: string) {
  const info = await describeAdjustment(tx, actor.tenantId, input);
  if (input.target === 'CUSTOMER' && info.customer) {
    await adjustCustomerHolding(tx, { tenantId: actor.tenantId, customerId: info.customer.id, customerName: info.customer.name, productId: info.product.id, productName: info.product.name, qtyDelta: Number(input.qtyDelta), reason: input.reason, performedBy: actor.name, referenceId });
  } else if (info.location) {
    await adjustLocationStock(tx, {
      tenantId: actor.tenantId,
      location: info.location,
      productId: info.product.id,
      productName: info.product.name,
      fullDelta: Number(input.fullDelta || 0),
      emptyDelta: Number(input.emptyDelta || 0),
      defectiveDelta: Number(input.defectiveDelta || 0),
      type: 'ADJUSTMENT',
      reason: input.reason,
      performedBy: actor.name,
      referenceId,
    });
  }
  await audit(tx, actor, { action: 'STOCK_ADJUSTED', entityType: 'Stock', reference: info.text, reason: input.reason, newValue: input, sensitive: true });
}

/** Admin applies directly; everyone else goes through the approval queue. */
export async function requestAdjustment(tx: Tx, actor: Actor, input: AdjustmentInput, effects: Effects) {
  if (!input.reason?.trim()) throw badRequest('Reason is mandatory for stock adjustments.');
  if (actor.role === 'SUPER_ADMIN') {
    await applyAdjustment(tx, actor, input);
    return { applied: true };
  }
  const info = await describeAdjustment(tx, actor.tenantId, input);
  await createApproval(
    tx,
    { tenantId: actor.tenantId, type: 'STOCK_ADJUSTMENT', referenceType: 'STOCK', title: info.text, summary: input.reason, payload: input, requestedById: actor.userId, requestedByName: actor.name },
    effects
  );
  return { applied: false };
}

/**
 * Plant operations at a warehouse: full cylinders received from the bottling
 * plant, empties dispatched for refill, and damaged cylinders set aside.
 */
export async function recordPlantMovement(
  tx: Tx,
  actor: Actor,
  input: { kind: 'RECEIPT' | 'EMPTY_TO_PLANT' | 'DAMAGE'; warehouseId?: string; items: { productId: string; fullQty?: number; emptyQty?: number }[]; reference?: string | null; notes?: string | null }
) {
  const warehouse = input.warehouseId ? await resolveLocation(tx, actor.tenantId, 'WAREHOUSE', input.warehouseId) : await (async () => {
    const w = await getDefaultWarehouse(tx, actor.tenantId);
    return { type: 'WAREHOUSE' as const, id: w.id, name: w.name };
  })();
  const lines = await productLines(tx, actor.tenantId, input.items);
  const plant: StockLocation = { type: 'PLANT', id: 'PLANT', name: 'Bottling Plant' };
  const base = { tenantId: actor.tenantId, referenceType: 'PURCHASE', referenceNumber: input.reference || undefined, reason: input.notes || undefined, performedBy: actor.name };

  if (input.kind === 'RECEIPT') {
    await moveStock(tx, { ...base, type: 'PURCHASE_RECEIPT', from: plant, to: warehouse, lines: lines.map((l) => ({ ...l, emptyQty: 0 })) });
  } else if (input.kind === 'EMPTY_TO_PLANT') {
    await moveStock(tx, { ...base, type: 'EMPTY_TO_PLANT', from: warehouse, to: plant, lines: lines.map((l) => ({ ...l, emptyQty: l.emptyQty || l.fullQty, fullQty: 0 })) });
  } else {
    for (const l of lines) {
      await adjustLocationStock(tx, { tenantId: actor.tenantId, location: warehouse, productId: l.productId, productName: l.productName, fullDelta: -l.fullQty, emptyDelta: -l.emptyQty, defectiveDelta: l.fullQty + l.emptyQty, type: 'DAMAGE', reason: input.notes || 'Damaged cylinders', performedBy: actor.name });
    }
  }
  await audit(tx, actor, { action: `PLANT_${input.kind}`, entityType: 'Stock', reference: input.reference || warehouse.name, newValue: lines });
}
