import type { Db, Tx } from '@/lib/db';
import { audit, Actor } from './audit';
import { assertDayOpen } from './dayLocks';
import { ApiError, businessDate, conflict, round2 } from './http';
import { stockAt } from './inventory';
import { getSetting } from './settings';
import { getWallet } from './wallet';

type StockSnapshot = { productId: string; productName: string; fullQty: number; emptyQty: number }[];

async function snapshot(db: Db, tenantId: string, deliveryBoyId: string): Promise<StockSnapshot> {
  const rows = await stockAt(db, tenantId, 'DELIVERY_BOY', deliveryBoyId);
  return rows.map((r) => ({ productId: r.productId, productName: r.productName, fullQty: r.fullQty, emptyQty: r.emptyQty }));
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

  const byMode = (mode: string) => round2(deliveries.filter((d) => d.paymentMode === mode).reduce((s, d) => s + d.paymentAmount, 0));
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
