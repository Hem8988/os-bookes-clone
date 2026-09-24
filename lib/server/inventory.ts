import type { Db, Tx } from '@/lib/db';
import { badRequest, conflict } from './http';

// Three-tier cylinder inventory (SRS §10): warehouse → delivery boy → customer.
// Every movement is one InventoryTransaction row plus atomic balance updates.

export type LocationType = 'WAREHOUSE' | 'DELIVERY_BOY' | 'CUSTOMER' | 'PLANT';

export interface StockLocation {
  type: LocationType;
  id: string;
  name: string;
}

export interface StockLine {
  productId: string;
  productName: string;
  fullQty?: number;
  emptyQty?: number;
  defectiveQty?: number;
}

export type MovementType =
  | 'OPENING'
  | 'PURCHASE_RECEIPT'
  | 'EMPTY_TO_PLANT'
  | 'ISSUE'
  | 'RETURN'
  | 'TRANSFER'
  | 'SALE'
  | 'EMPTY_RETURN'
  | 'DAMAGE'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export interface Movement {
  tenantId: string;
  type: MovementType;
  from?: StockLocation;
  to?: StockLocation;
  lines: StockLine[];
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  reason?: string;
  performedBy: string;
  /** Allow a location to go negative (only for reversals of earlier movements). */
  allowNegative?: boolean;
}

const HELD = (t: LocationType) => t === 'WAREHOUSE' || t === 'DELIVERY_BOY';

async function changeBalance(
  tx: Tx,
  tenantId: string,
  loc: StockLocation,
  line: StockLine,
  sign: 1 | -1,
  allowNegative: boolean
) {
  const full = sign * (line.fullQty || 0);
  const empty = sign * (line.emptyQty || 0);
  const defective = sign * (line.defectiveQty || 0);
  const row = await tx.stockBalance.upsert({
    where: { tenantId_locationType_locationId_productId: { tenantId, locationType: loc.type, locationId: loc.id, productId: line.productId } },
    create: {
      tenantId,
      locationType: loc.type,
      locationId: loc.id,
      locationName: loc.name,
      productId: line.productId,
      productName: line.productName,
      fullQty: full,
      emptyQty: empty,
      defectiveQty: defective,
    },
    update: { fullQty: { increment: full }, emptyQty: { increment: empty }, defectiveQty: { increment: defective }, locationName: loc.name },
  });
  if (!allowNegative && (row.fullQty < 0 || row.emptyQty < 0 || row.defectiveQty < 0)) {
    const what = row.fullQty < 0 ? 'full' : row.emptyQty < 0 ? 'empty' : 'defective';
    throw conflict(`Not enough ${what} ${line.productName} at ${loc.name}. Available: ${row.fullQty - full} full / ${row.emptyQty - empty} empty.`);
  }
}

async function changeCustomerHolding(tx: Tx, tenantId: string, customerId: string, line: StockLine, delivered: number, emptyReceived: number, adjustment: number) {
  const delta = delivered - emptyReceived + adjustment;
  await tx.customerCylinderBalance.upsert({
    where: { tenantId_customerId_productId: { tenantId, customerId, productId: line.productId } },
    create: {
      tenantId,
      customerId,
      productId: line.productId,
      productName: line.productName,
      deliveredQtyTotal: delivered,
      emptyReceivedTotal: emptyReceived,
      adjustmentQty: adjustment,
      currentBalance: delta,
    },
    update: {
      deliveredQtyTotal: { increment: delivered },
      emptyReceivedTotal: { increment: emptyReceived },
      adjustmentQty: { increment: adjustment },
      currentBalance: { increment: delta },
    },
  });
}

/** Keep Product.stock equal to the full cylinders across all warehouses. */
async function syncProductStock(tx: Tx, tenantId: string, productIds: string[]) {
  for (const productId of new Set(productIds)) {
    const agg = await tx.stockBalance.aggregate({
      where: { tenantId, productId, locationType: 'WAREHOUSE' },
      _sum: { fullQty: true },
    });
    await tx.product.updateMany({ where: { id: productId, tenantId }, data: { stock: agg._sum.fullQty || 0 } });
  }
}

export async function moveStock(tx: Tx, m: Movement) {
  const lines = m.lines.filter((l) => (l.fullQty || 0) !== 0 || (l.emptyQty || 0) !== 0 || (l.defectiveQty || 0) !== 0);
  if (lines.length === 0) return;
  for (const line of lines) {
    if ((line.fullQty || 0) < 0 || (line.emptyQty || 0) < 0 || (line.defectiveQty || 0) < 0) {
      throw badRequest('Quantities in a stock movement cannot be negative.');
    }
    if (m.from && HELD(m.from.type)) await changeBalance(tx, m.tenantId, m.from, line, -1, !!m.allowNegative);
    if (m.to && HELD(m.to.type)) await changeBalance(tx, m.tenantId, m.to, line, 1, !!m.allowNegative);

    // Customer holding: full delivered increases, empty received decreases.
    if (m.to?.type === 'CUSTOMER') {
      await changeCustomerHolding(tx, m.tenantId, m.to.id, line, line.fullQty || 0, 0, 0);
    }
    if (m.from?.type === 'CUSTOMER') {
      await changeCustomerHolding(tx, m.tenantId, m.from.id, line, 0, line.emptyQty || 0, 0);
    }

    await tx.inventoryTransaction.create({
      data: {
        tenantId: m.tenantId,
        transactionType: m.type,
        fromType: m.from?.type,
        fromId: m.from?.id,
        fromName: m.from?.name,
        toType: m.to?.type,
        toId: m.to?.id,
        toName: m.to?.name,
        productId: line.productId,
        productName: line.productName,
        fullQty: line.fullQty || 0,
        emptyQty: line.emptyQty || 0,
        defectiveQty: line.defectiveQty || 0,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        referenceNumber: m.referenceNumber,
        reason: m.reason,
        performedBy: m.performedBy,
      },
    });
  }
  if (m.from?.type === 'WAREHOUSE' || m.to?.type === 'WAREHOUSE') {
    await syncProductStock(tx, m.tenantId, lines.map((l) => l.productId));
  }
}

/**
 * Signed correction of a location's stock (approved stock adjustment or
 * opening stock). Positive values add, negative values remove.
 */
export async function adjustLocationStock(
  tx: Tx,
  input: { tenantId: string; location: StockLocation; productId: string; productName: string; fullDelta: number; emptyDelta: number; defectiveDelta: number; type: 'ADJUSTMENT' | 'OPENING' | 'DAMAGE'; reason: string; performedBy: string; referenceId?: string }
) {
  const line = { productId: input.productId, productName: input.productName };
  const add = { ...line, fullQty: Math.max(input.fullDelta, 0), emptyQty: Math.max(input.emptyDelta, 0), defectiveQty: Math.max(input.defectiveDelta, 0) };
  const remove = { ...line, fullQty: Math.max(-input.fullDelta, 0), emptyQty: Math.max(-input.emptyDelta, 0), defectiveQty: Math.max(-input.defectiveDelta, 0) };
  const base = { tenantId: input.tenantId, type: input.type, reason: input.reason, performedBy: input.performedBy, referenceType: 'ADJUSTMENT', referenceId: input.referenceId };
  await moveStock(tx, { ...base, to: input.location, lines: [add] });
  await moveStock(tx, { ...base, from: input.location, lines: [remove] });
}

/** Correction of a customer's cylinder holding (± qty). */
export async function adjustCustomerHolding(
  tx: Tx,
  input: { tenantId: string; customerId: string; customerName: string; productId: string; productName: string; qtyDelta: number; opening?: boolean; reason: string; performedBy: string; referenceId?: string }
) {
  const line = { productId: input.productId, productName: input.productName };
  if (input.opening) {
    await tx.customerCylinderBalance.upsert({
      where: { tenantId_customerId_productId: { tenantId: input.tenantId, customerId: input.customerId, productId: input.productId } },
      create: { tenantId: input.tenantId, customerId: input.customerId, ...line, openingQty: input.qtyDelta, currentBalance: input.qtyDelta },
      update: { openingQty: { increment: input.qtyDelta }, currentBalance: { increment: input.qtyDelta } },
    });
  } else {
    await changeCustomerHolding(tx, input.tenantId, input.customerId, line, 0, 0, input.qtyDelta);
  }
  await tx.inventoryTransaction.create({
    data: {
      tenantId: input.tenantId,
      transactionType: input.opening ? 'OPENING' : 'ADJUSTMENT',
      toType: 'CUSTOMER',
      toId: input.customerId,
      toName: input.customerName,
      ...line,
      fullQty: input.qtyDelta,
      referenceType: 'ADJUSTMENT',
      referenceId: input.referenceId,
      reason: input.reason,
      performedBy: input.performedBy,
    },
  });
}

export async function getDefaultWarehouse(db: Db, tenantId: string) {
  const existing = await db.warehouse.findFirst({ where: { tenantId, active: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
  if (existing) return existing;
  return db.warehouse.create({ data: { tenantId, code: 'MAIN', name: 'Main Godown', isDefault: true } });
}

export async function stockAt(db: Db, tenantId: string, type: 'WAREHOUSE' | 'DELIVERY_BOY', id: string) {
  return db.stockBalance.findMany({ where: { tenantId, locationType: type, locationId: id }, orderBy: { productName: 'asc' } });
}

export async function resolveLocation(db: Db, tenantId: string, type: string, id: string): Promise<StockLocation> {
  if (type === 'WAREHOUSE') {
    const w = await db.warehouse.findFirst({ where: { id, tenantId, active: true } });
    if (!w) throw badRequest('Warehouse not found.');
    return { type: 'WAREHOUSE', id: w.id, name: w.name };
  }
  if (type === 'DELIVERY_BOY') {
    const u = await db.user.findFirst({ where: { id, tenantId, role: 'DELIVERY_BOY' } });
    if (!u) throw badRequest('Delivery boy not found.');
    return { type: 'DELIVERY_BOY', id: u.id, name: u.name };
  }
  throw badRequest('Location type must be WAREHOUSE or DELIVERY_BOY.');
}
