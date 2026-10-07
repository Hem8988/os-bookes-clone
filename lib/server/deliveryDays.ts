import type { Db, Tx } from '@/lib/db';
import { audit, Actor } from './audit';
import { assertDayOpen } from './dayLocks';
import { ApiError, businessDate, conflict, round2 } from './http';
import type { Effects } from './effects';
import { getDefaultWarehouse, stockAt, truckGodown } from './inventory';
import { requestTransfer } from './stock';
import { getSetting } from './settings';
import { availableToSubmit, getWallet } from './wallet';

type StockSnapshot = { productId: string; productName: string; fullQty: number; emptyQty: number }[];

async function snapshot(db: Db, tenantId: string, deliveryBoyId: string): Promise<StockSnapshot> {
  const rows = await stockAt(db, tenantId, 'DELIVERY_BOY', deliveryBoyId);
  return rows.map((r) => ({ productId: r.productId, productName: r.productName, fullQty: r.fullQty, emptyQty: r.emptyQty }));
}

/**
 * Day-end stock return: what the boy holds minus what already waits in a return / hand-over request.
 * Stock moves only when the admin accepts the request, so until then it stays with the boy (shown as pending).
 */
export async function stockToReturn(db: Db, tenantId: string, deliveryBoyId: string) {
  const [held, pending] = await Promise.all([
    snapshot(db, tenantId, deliveryBoyId),
    db.stockTransfer.findMany({ where: { tenantId, fromType: 'DELIVERY_BOY', fromId: deliveryBoyId, status: 'PENDING_APPROVAL' }, include: { items: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const toReturn = held
    .map((h) => {
      const out = pending.flatMap((t) => t.items).filter((i) => i.productId === h.productId);
      return { ...h, fullQty: Math.max(0, h.fullQty - out.reduce((s, i) => s + i.fullQty, 0)), emptyQty: Math.max(0, h.emptyQty - out.reduce((s, i) => s + i.emptyQty, 0)) };
    })
    .filter((r) => r.fullQty > 0 || r.emptyQty > 0);
  return {
    toReturn,
    pending: pending.map((t) => ({ transferNumber: t.transferNumber, toName: t.toName, createdAt: t.createdAt, items: t.items.map((i) => ({ productName: i.productName, fullQty: i.fullQty, emptyQty: i.emptyQty })) })),
  };
}

/** Where the day-end stock can go: the godown, one of our trucks, or another delivery boy. */
export type ReturnTarget = { kind: 'GODOWN' } | { kind: 'TRUCK'; vehicleNumber: string } | { kind: 'BOY'; deliveryBoyId: string };

/** Choices for the day-end hand-over: our own vehicles and the other active delivery boys. */
export async function returnTargets(db: Db, tenantId: string, deliveryBoyId: string) {
  const [trucks, boys] = await Promise.all([
    db.vehicle.findMany({ where: { tenantId, active: true }, select: { number: true, type: true, driverName: true }, orderBy: { number: 'asc' } }),
    db.user.findMany({ where: { tenantId, role: 'DELIVERY_BOY', status: 'ACTIVE', NOT: { id: deliveryBoyId } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return { trucks, deliveryBoys: boys };
}

/** One request sending everything still with the boy to the godown, a truck or another boy (accepted by the admin). */
export async function returnStock(tx: Tx, actor: Actor, target: ReturnTarget, effects: Effects) {
  const { toReturn } = await stockToReturn(tx, actor.tenantId, actor.userId);
  if (!toReturn.length) throw conflict('No stock left to return.');
  const items = toReturn.map((r) => ({ productId: r.productId, fullQty: r.fullQty, emptyQty: r.emptyQty }));
  const notes = `Day-end hand-over · ${businessDate()}`;
  if (target.kind === 'BOY') {
    if (target.deliveryBoyId === actor.userId) throw conflict('Choose another delivery boy.');
    return requestTransfer(tx, actor, { transferType: 'DRIVER_TO_DRIVER', fromId: actor.userId, toId: target.deliveryBoyId, items, notes }, effects);
  }
  // A truck is a godown underneath (TRK-<number>), so it is a normal godown return.
  const godown = target.kind === 'TRUCK' ? await truckGodown(tx, actor.tenantId, target.vehicleNumber) : await getDefaultWarehouse(tx, actor.tenantId);
  return requestTransfer(
    tx,
    actor,
    { transferType: 'DRIVER_TO_WAREHOUSE', fromId: actor.userId, toId: godown.id, items, notes, vehicleNumber: target.kind === 'TRUCK' ? target.vehicleNumber : null },
    effects
  );
}

/** Login → biometric → location → Start Day: records opening stock and cash (SRS §9.1). */
export async function startDay(tx: Tx, actor: Actor, input: { latitude?: number | null; longitude?: number | null }) {
  const date = businessDate();
  await assertDayOpen(tx, actor.tenantId, date);
  const existing = await tx.deliveryDay.findUnique({ where: { tenantId_deliveryBoyId_date: { tenantId: actor.tenantId, deliveryBoyId: actor.userId, date } } });
  if (existing?.status === 'STARTED') return existing;
  if (existing?.status === 'CLOSED') throw new ApiError(423, 'Today is already closed. Ask the admin to re-open it.', 'DELIVERY_DAY_CLOSED');

  const security = await getSetting(actor.tenantId, 'security');
  if (security.loginLocationRequired && !security.locationOverride && (input.latitude == null || input.longitude == null)) {
    throw new ApiError(400, 'Location is required to start the day. Please allow location access.', 'LOCATION_REQUIRED');
  }
  const wallet = await getWallet(tx, actor.tenantId, 'DELIVERY_BOY', actor.userId, actor.name);
  const day = await tx.deliveryDay.create({
    data: {
      tenantId: actor.tenantId,
      deliveryBoyId: actor.userId,
      deliveryBoyName: actor.name,
      date,
      startLatitude: input.latitude ?? null,
      startLongitude: input.longitude ?? null,
      openingStock: await snapshot(tx, actor.tenantId, actor.userId),
      openingCash: wallet.balance,
    },
  });
  await audit(tx, actor, { action: 'DELIVERY_DAY_STARTED', entityType: 'DeliveryDay', entityId: day.id, reference: date });
  return day;
}

/** Opening + received − delivered (+ empties) = closing, per product; cash likewise (SRS §9.6). */
export async function daySummary(db: Db, tenantId: string, deliveryBoyId: string, date: string) {
  const day = await db.deliveryDay.findUnique({ where: { tenantId_deliveryBoyId_date: { tenantId, deliveryBoyId, date } } });
  const deliveries = await db.delivery.findMany({ where: { tenantId, deliveryBoyId, deliveryDate: date }, include: { items: true } });
  const start = day?.startedAt || new Date(`${date}T00:00:00+05:30`);
  const end = day?.closedAt || new Date();
  const movements = await db.inventoryTransaction.findMany({
    where: { tenantId, createdAt: { gte: start, lte: end }, OR: [{ fromType: 'DELIVERY_BOY', fromId: deliveryBoyId }, { toType: 'DELIVERY_BOY', toId: deliveryBoyId }] },
  });
  const submissions = await db.cashSubmission.findMany({ where: { tenantId, deliveryBoyId, date } });
  // Old dues collected on payment-only visits (rejected ones are reversed out of the wallet).
  const fieldPayments = await db.payment.findMany({ where: { tenantId, source: 'FIELD', collectedById: deliveryBoyId, paymentDate: date, status: { not: 'REJECTED' } }, select: { mode: true, amount: true } });
  const wallet = await getWallet(db, tenantId, 'DELIVERY_BOY', deliveryBoyId, day?.deliveryBoyName || '');
  const closingStock = await snapshot(db, tenantId, deliveryBoyId);

  const opening = (day?.openingStock as StockSnapshot | null) || [];
  const products = new Map<string, { productId: string; productName: string; openingFull: number; openingEmpty: number; received: number; delivered: number; returned: number; emptyCollected: number; emptyReturned: number; closingFull: number; closingEmpty: number }>();
  const row = (id: string, name: string) => {
    if (!products.has(id)) products.set(id, { productId: id, productName: name, openingFull: 0, openingEmpty: 0, received: 0, delivered: 0, returned: 0, emptyCollected: 0, emptyReturned: 0, closingFull: 0, closingEmpty: 0 });
    return products.get(id)!;
  };
  opening.forEach((o) => Object.assign(row(o.productId, o.productName), { openingFull: o.fullQty, openingEmpty: o.emptyQty }));
  closingStock.forEach((c) => Object.assign(row(c.productId, c.productName), { closingFull: c.fullQty, closingEmpty: c.emptyQty }));
  for (const m of movements) {
    const r = row(m.productId, m.productName);
    const incoming = m.toType === 'DELIVERY_BOY' && m.toId === deliveryBoyId;
    if (m.transactionType === 'SALE') r.delivered += m.fullQty;
    else if (m.transactionType === 'EMPTY_RETURN') r.emptyCollected += m.emptyQty;
    else if (incoming) {
      r.received += m.fullQty;
      r.emptyCollected += m.emptyQty;
    } else {
      r.returned += m.fullQty;
      r.emptyReturned += m.emptyQty;
    }
  }

  const byMode = (mode: string) =>
    round2(deliveries.filter((d) => d.paymentMode === mode).reduce((s, d) => s + d.paymentAmount, 0) + fieldPayments.filter((p) => p.mode === mode).reduce((s, p) => s + p.amount, 0));
  const creditGiven = round2(deliveries.reduce((s, d) => s + Math.max(d.invoiceAmount - d.paymentAmount, 0), 0));
  const submitted = round2(submissions.filter((s) => s.status === 'APPROVED').reduce((s, x) => s + x.amount, 0));
  const pendingSubmission = round2(submissions.filter((s) => s.status === 'PENDING').reduce((s, x) => s + x.amount, 0));

  return {
    date,
    status: day?.status || 'NOT_STARTED',
    day,
    deliveries: {
      count: deliveries.length,
      cylindersDelivered: deliveries.reduce((s, d) => s + d.deliveredQtyTotal, 0),
      emptiesCollected: deliveries.reduce((s, d) => s + d.emptyReceivedTotal, 0),
      pendingVerification: deliveries.filter((d) => d.status === 'PENDING_VERIFICATION').length,
      sentBack: deliveries.filter((d) => d.status === 'SENT_BACK').length,
    },
    stock: [...products.values()],
    collections: { count: fieldPayments.length, amount: round2(fieldPayments.reduce((s, p) => s + p.amount, 0)) },
    stockReturn: await stockToReturn(db, tenantId, deliveryBoyId),
    cash: {
      opening: day?.openingCash ?? 0,
      collected: byMode('CASH'),
      submitted,
      pendingSubmission,
      closing: round2(wallet.balance),
      online: byMode('ONLINE'),
      cheque: byMode('CHEQUE'),
      credit: creditGiven,
    },
  };
}

export async function closeDay(tx: Tx, actor: Actor) {
  const date = businessDate();
  const day = await tx.deliveryDay.findUnique({ where: { tenantId_deliveryBoyId_date: { tenantId: actor.tenantId, deliveryBoyId: actor.userId, date } } });
  if (!day) throw conflict('You have not started your day.');
  if (day.status === 'CLOSED') throw conflict('Day is already closed.');
  const outForDelivery = await tx.order.count({ where: { tenantId: actor.tenantId, assignedDeliveryBoyId: actor.userId, status: 'OUT_FOR_DELIVERY' } });
  if (outForDelivery > 0) throw conflict(`${outForDelivery} order(s) are still out for delivery. Deliver them or tell the manager before closing.`);
  // All cash in hand must be handed over (a submission awaiting confirmation counts) before closing.
  const { available } = await availableToSubmit(tx, actor.tenantId, actor.userId, actor.name);
  if (available > 0.009) throw new ApiError(409, `Submit your cash in hand (₹${available.toLocaleString('en-IN')}) from the Cash tab before closing the day.`, 'CASH_NOT_SUBMITTED');
  // Likewise all stock is handed over — godown, truck or another boy (a request awaiting the admin counts).
  const { toReturn } = await stockToReturn(tx, actor.tenantId, actor.userId);
  if (toReturn.length) throw new ApiError(409, 'Hand over your stock (godown, truck or another delivery boy) before closing the day.', 'STOCK_NOT_RETURNED');

  const summary = await daySummary(tx, actor.tenantId, actor.userId, date);
  const closed = await tx.deliveryDay.update({
    where: { id: day.id },
    data: { status: 'CLOSED', closedAt: new Date(), closingStock: await snapshot(tx, actor.tenantId, actor.userId), closingCash: summary.cash.closing, summary: JSON.parse(JSON.stringify(summary)) },
  });
  await audit(tx, actor, { action: 'DELIVERY_DAY_CLOSED', entityType: 'DeliveryDay', entityId: day.id, reference: date, newValue: { cash: summary.cash, deliveries: summary.deliveries } });
  return closed;
}

export async function reopenDeliveryDay(tx: Tx, actor: Actor, deliveryBoyId: string, date: string, reason: string) {
  const day = await tx.deliveryDay.findUnique({ where: { tenantId_deliveryBoyId_date: { tenantId: actor.tenantId, deliveryBoyId, date } } });
  if (!day || day.status !== 'CLOSED') throw conflict('That delivery day is not closed.');
  await tx.deliveryDay.update({ where: { id: day.id }, data: { status: 'STARTED', closedAt: null } });
  await audit(tx, actor, { action: 'DELIVERY_DAY_REOPENED', entityType: 'DeliveryDay', entityId: day.id, reference: `${day.deliveryBoyName} ${date}`, reason, sensitive: true });
}
