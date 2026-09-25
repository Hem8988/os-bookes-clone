import { prisma } from '@/lib/db';
import type { Tx } from '@/lib/db';
import { audit, Actor } from './audit';
import { saveExpense } from './books/entries';
import type { Effects } from './effects';
import { addDays, badRequest, businessDate, conflict, notFound, round2 } from './http';
import { postCustomerLedger } from './ledger';
import { notifyUsers } from './notify';
import { nextNumber } from './sequence';

// Operational registers: cylinders (serial numbers & test due dates), customer
// complaints, vehicles (documents, fuel, service, cost per km) and cheques
// (post-dated, deposited, cleared, bounced).

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const optDate = (v: unknown) => (isDate(v) ? v : null);
const addYears = (d: string, y: number) => `${Number(d.slice(0, 4)) + y}${d.slice(4)}`;

// ───────────────────────── Cylinders ─────────────────────────

export const ASSET_STATUSES = ['IN_STOCK', 'WITH_CUSTOMER', 'WITH_DELIVERY_BOY', 'AT_PLANT', 'FOR_TESTING', 'CONDEMNED'] as const;

/** LPG cylinders: first statutory test 10 years after manufacture, then every 5 years. */
export function nextTestDue(mfgDate: string | null, lastTestDate: string | null) {
  if (lastTestDate) return addYears(lastTestDate, 5);
  if (mfgDate) return addYears(mfgDate, 10);
  return null;
}

export interface AssetInput {
  serialNo: string;
  productId?: string | null;
  productName?: string | null;
  manufacturer?: string | null;
  mfgDate?: string | null;
  lastTestDate?: string | null;
  nextTestDue?: string | null;
  tareWeight?: number | null;
  status?: string;
  locationName?: string | null;
  notes?: string | null;
}

export async function saveAsset(tenantId: string, input: AssetInput, actor: Actor, id?: string | null) {
  const serialNo = String(input.serialNo || '').trim().toUpperCase();
  if (!serialNo) throw badRequest('Enter the cylinder serial number.');
  const product = input.productId ? await prisma.product.findFirst({ where: { id: input.productId, tenantId } }) : null;
  const status = input.status && (ASSET_STATUSES as readonly string[]).includes(input.status) ? input.status : 'IN_STOCK';
  const mfg = optDate(input.mfgDate);
  const last = optDate(input.lastTestDate);
  const data = {
    serialNo,
    productId: product?.id ?? null,
    productName: product?.name || String(input.productName || '').trim() || 'Cylinder',
    manufacturer: input.manufacturer?.trim() || null,
    mfgDate: mfg,
    lastTestDate: last,
    nextTestDue: optDate(input.nextTestDue) || nextTestDue(mfg, last),
    tareWeight: input.tareWeight ? Number(input.tareWeight) : null,
    status,
    locationName: input.locationName?.trim() || null,
    notes: input.notes?.trim() || null,
  };
  const clash = await prisma.cylinderAsset.findFirst({ where: { tenantId, serialNo, NOT: id ? { id } : undefined } });
  if (clash) throw conflict(`Cylinder ${serialNo} is already registered.`);
  const saved = id ? await prisma.cylinderAsset.update({ where: { id }, data }) : await prisma.cylinderAsset.create({ data: { tenantId, ...data } });
  await audit(prisma, actor, { action: id ? 'CYLINDER_EDITED' : 'CYLINDER_REGISTERED', entityType: 'CylinderAsset', entityId: saved.id, reference: serialNo, newValue: { status, nextTestDue: saved.nextTestDue } });
  return saved;
}

/** Bulk register from spreadsheet rows; existing serials are updated. */
export async function importAssets(tenantId: string, rows: AssetInput[], actor: Actor) {
  let added = 0;
  let updated = 0;
  const errors: string[] = [];
  const products = await prisma.product.findMany({ where: { tenantId }, select: { id: true, name: true } });
  for (const [i, r] of rows.entries()) {
    try {
      const serial = String(r.serialNo || '').trim().toUpperCase();
      if (!serial) continue;
      const productId = r.productId || products.find((p) => r.productName && p.name.toLowerCase().includes(String(r.productName).toLowerCase()))?.id || null;
      const existing = await prisma.cylinderAsset.findFirst({ where: { tenantId, serialNo: serial } });
      await saveAsset(tenantId, { ...r, serialNo: serial, productId }, actor, existing?.id);
      if (existing) updated++;
      else added++;
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { added, updated, errors: errors.slice(0, 20) };
}

export async function assetSummary(tenantId: string) {
  const today = businessDate();
  const soon = addDays(today, 30);
  const [total, overdue, dueSoon, byStatus] = await Promise.all([
    prisma.cylinderAsset.count({ where: { tenantId, status: { not: 'CONDEMNED' } } }),
    prisma.cylinderAsset.count({ where: { tenantId, status: { not: 'CONDEMNED' }, nextTestDue: { lt: today } } }),
    prisma.cylinderAsset.count({ where: { tenantId, status: { not: 'CONDEMNED' }, nextTestDue: { gte: today, lte: soon } } }),
    prisma.cylinderAsset.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
  ]);
  return { total, overdue, dueSoon, byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count])) };
}

// ───────────────────────── Complaints ─────────────────────────

export const COMPLAINT_CATEGORIES = ['LEAK', 'SHORT_WEIGHT', 'DELAY', 'DAMAGED_CYLINDER', 'BILLING', 'STAFF', 'OTHER'] as const;

export async function createComplaint(tenantId: string, actor: Actor, input: { customerId?: string | null; customerName?: string; phone?: string | null; category: string; priority?: string; description: string; orderNumber?: string | null; source?: string }) {
  if (!(COMPLAINT_CATEGORIES as readonly string[]).includes(input.category)) throw badRequest('Choose the complaint type.');
  const description = String(input.description || '').trim();
  if (description.length < 3) throw badRequest('Describe the complaint.');
  const customer = input.customerId ? await prisma.customer.findFirst({ where: { id: input.customerId, tenantId } }) : null;
  if (input.customerId && !customer) throw badRequest('Customer not found.');
  const name = customer?.shortName || customer?.name || String(input.customerName || '').trim();
  if (!name) throw badRequest('Choose the customer or enter a name.');
  // Gas leaks are always urgent.
  const priority = input.category === 'LEAK' ? 'URGENT' : ['URGENT', 'HIGH', 'NORMAL', 'LOW'].includes(String(input.priority)) ? String(input.priority) : 'NORMAL';
  const complaint = await prisma.complaint.create({
    data: { tenantId, complaintNumber: await nextNumber(prisma, tenantId, 'CMP'), customerId: customer?.id ?? null, customerName: name, phone: customer?.whatsappNumber || customer?.phone || input.phone || null, category: input.category, priority, description, orderNumber: input.orderNumber?.trim() || null, source: input.source || 'STAFF', createdBy: actor.name },
  });
  const managers = await prisma.user.findMany({ where: { tenantId, role: { in: ['SUPER_ADMIN', 'MANAGER'] }, status: 'ACTIVE' }, select: { id: true } });
  await notifyUsers(tenantId, managers.map((u) => u.id), { title: `${priority === 'URGENT' ? '🚨 ' : ''}Complaint ${complaint.complaintNumber}: ${input.category.replace('_', ' ').toLowerCase()}`, body: `${name} — ${description.slice(0, 120)}`, link: '/admin?tab=registers&sub=complaints' });
  await audit(prisma, actor, { action: 'COMPLAINT_CREATED', entityType: 'Complaint', entityId: complaint.id, reference: complaint.complaintNumber, newValue: { category: input.category, priority } });
  return complaint;
}

export async function updateComplaint(tenantId: string, actor: Actor, id: string, input: { action: 'assign' | 'resolve' | 'close' | 'reopen'; assignedToId?: string | null; resolution?: string | null }) {
  const c = await prisma.complaint.findFirst({ where: { id, tenantId } });
  if (!c) throw notFound('Complaint not found.');
  let data: Record<string, unknown> = {};
  if (input.action === 'assign') {
    const u = input.assignedToId ? await prisma.user.findFirst({ where: { id: input.assignedToId, tenantId, status: 'ACTIVE' } }) : null;
    if (!u) throw badRequest('Choose who handles it.');
    data = { status: 'ASSIGNED', assignedToId: u.id, assignedToName: u.name };
    await notifyUsers(tenantId, [u.id], { title: `Complaint ${c.complaintNumber} assigned to you`, body: `${c.customerName} — ${c.description.slice(0, 120)}` });
  } else if (input.action === 'resolve') {
    const resolution = String(input.resolution || '').trim();
    if (!resolution) throw badRequest('Write what was done.');
    data = { status: 'RESOLVED', resolution, resolvedAt: new Date() };
    if (c.phone) {
      const { sendWhatsAppText } = await import('./messaging/whatsapp');
      await sendWhatsAppText(tenantId, c.phone, `Namaste ${c.customerName}, aapki shikayat ${c.complaintNumber} ka samadhan ho gaya hai: ${resolution}`, 'COMPLAINT_RESOLVED');
    }
  } else if (input.action === 'close') data = { status: 'CLOSED', closedAt: new Date() };
  else data = { status: 'OPEN', resolvedAt: null, closedAt: null };
  const saved = await prisma.complaint.update({ where: { id: c.id }, data });
  await audit(prisma, actor, { action: `COMPLAINT_${input.action.toUpperCase()}`, entityType: 'Complaint', entityId: c.id, reference: c.complaintNumber, newValue: data });
  return saved;
}

// ───────────────────────── Vehicles ─────────────────────────

export interface VehicleInput {
  number: string;
  type?: string;
  capacity?: number | null;
  driverUserId?: string | null;
  fuelType?: string;
  odometer?: number;
  insuranceUpto?: string | null;
  pucUpto?: string | null;
  permitUpto?: string | null;
  fitnessUpto?: string | null;
  serviceDueKm?: number | null;
  serviceDueDate?: string | null;
  active?: boolean;
  notes?: string | null;
}

export async function saveVehicle(tenantId: string, input: VehicleInput, actor: Actor, id?: string | null) {
  // Stored without spaces / dashes so "MH12 AB 1234" and "MH12AB1234" are the same vehicle.
  const number = String(input.number || '').replace(/[\s-]+/g, '').toUpperCase();
  if (!number) throw badRequest('Enter the vehicle number.');
  const driver = input.driverUserId ? await prisma.user.findFirst({ where: { id: input.driverUserId, tenantId } }) : null;
  const data = {
    number,
    type: input.type?.trim() || 'Tempo',
    capacity: input.capacity ? Math.round(Number(input.capacity)) : null,
    driverUserId: driver?.id ?? null,
    driverName: driver?.name ?? null,
    fuelType: input.fuelType?.trim() || 'Diesel',
    odometer: Math.max(0, Number(input.odometer) || 0),
    insuranceUpto: optDate(input.insuranceUpto),
    pucUpto: optDate(input.pucUpto),
    permitUpto: optDate(input.permitUpto),
    fitnessUpto: optDate(input.fitnessUpto),
    serviceDueKm: input.serviceDueKm ? Number(input.serviceDueKm) : null,
    serviceDueDate: optDate(input.serviceDueDate),
    active: input.active !== false,
    notes: input.notes?.trim() || null,
  };
  const clash = await prisma.vehicle.findFirst({ where: { tenantId, number, NOT: id ? { id } : undefined } });
  if (clash) throw conflict(`Vehicle ${number} already exists.`);
  const saved = id ? await prisma.vehicle.update({ where: { id }, data }) : await prisma.vehicle.create({ data: { tenantId, ...data } });
  await audit(prisma, actor, { action: id ? 'VEHICLE_EDITED' : 'VEHICLE_ADDED', entityType: 'Vehicle', entityId: saved.id, reference: number });
  return saved;
}

const LOG_HEAD: Record<string, string> = { FUEL: 'Vehicle Fuel', SERVICE: 'Vehicle Repairs & Maintenance', REPAIR: 'Vehicle Repairs & Maintenance', TYRE: 'Vehicle Repairs & Maintenance', INSURANCE: 'Vehicle Insurance', OTHER: 'Vehicle Repairs & Maintenance' };

/** Fuel / service / repair entry; with an amount it is also booked as an expense. */
export async function addVehicleLog(tx: Tx, actor: Actor, input: { vehicleId: string; date: string; kind: string; odometer?: number | null; litres?: number | null; amount?: number; paidFrom?: 'CASH' | 'BANK' | 'CREDIT'; paidAccountId?: string | null; supplierId?: string | null; notes?: string | null }) {
  const v = await tx.vehicle.findFirst({ where: { id: input.vehicleId, tenantId: actor.tenantId } });
  if (!v) throw notFound('Vehicle not found.');
  if (!isDate(input.date)) throw badRequest('Choose the date.');
  if (!LOG_HEAD[input.kind]) throw badRequest('Choose fuel, service, repair, tyre, insurance or other.');
  const odometer = input.odometer ? Number(input.odometer) : null;
  if (odometer !== null && odometer < 0) throw badRequest('Odometer cannot be negative.');
  const amount = round2(Number(input.amount) || 0);
  let expenseEntryId: string | null = null;
  if (amount > 0) {
    const expense = await saveExpense(tx, actor, { date: input.date, headName: LOG_HEAD[input.kind], description: `${v.number} · ${input.kind.toLowerCase()}${input.litres ? ` ${input.litres} L` : ''}${input.notes ? ` · ${input.notes}` : ''}`, amount, gstRate: 0, paidFrom: input.paidFrom || 'CASH', paidAccountId: input.paidAccountId || null, supplierId: input.supplierId || null });
    expenseEntryId = expense.id;
  }
  const log = await tx.vehicleLog.create({ data: { tenantId: actor.tenantId, vehicleId: v.id, date: input.date, kind: input.kind, odometer, litres: input.litres ? Number(input.litres) : null, amount, expenseEntryId, notes: input.notes?.trim() || null, createdBy: actor.name } });
  if (odometer && odometer > v.odometer) await tx.vehicle.update({ where: { id: v.id }, data: { odometer } });
  return log;
}

/** Documents expiring within `days`, service due, per vehicle. */
export async function vehicleAlerts(tenantId: string, days = 15) {
  const today = businessDate();
  const limit = addDays(today, days);
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId, active: true } });
  const alerts: { vehicle: string; item: string; due: string; overdue: boolean }[] = [];
  for (const v of vehicles) {
    for (const [item, due] of [['Insurance', v.insuranceUpto], ['PUC', v.pucUpto], ['Permit', v.permitUpto], ['Fitness', v.fitnessUpto], ['Service', v.serviceDueDate]] as const) {
      if (due && due <= limit) alerts.push({ vehicle: v.number, item, due, overdue: due < today });
    }
    if (v.serviceDueKm && v.odometer >= v.serviceDueKm - 200) alerts.push({ vehicle: v.number, item: `Service at ${v.serviceDueKm} km (now ${v.odometer})`, due: today, overdue: v.odometer >= v.serviceDueKm });
  }
  return alerts.sort((a, b) => a.due.localeCompare(b.due));
}

/** Cost per km for each vehicle over a period. */
export async function vehicleCosts(tenantId: string, from: string, to: string) {
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId }, include: { logs: { where: { date: { gte: from, lte: to } }, orderBy: { date: 'asc' } } } });
  return vehicles.map((v) => {
    const odo = v.logs.map((l) => l.odometer).filter((x): x is number => !!x);
    const km = odo.length > 1 ? Math.max(...odo) - Math.min(...odo) : 0;
    const fuel = v.logs.filter((l) => l.kind === 'FUEL');
    const fuelCost = fuel.reduce((s, l) => s + l.amount, 0);
    const litres = fuel.reduce((s, l) => s + (l.litres || 0), 0);
    const other = v.logs.filter((l) => l.kind !== 'FUEL').reduce((s, l) => s + l.amount, 0);
    const total = fuelCost + other;
    return { vehicle: v.number, type: v.type, driver: v.driverName || '', km, litres: round2(litres), kmPerLitre: litres ? round2(km / litres) : 0, fuelCost: round2(fuelCost), maintenance: round2(other), total: round2(total), perKm: km ? round2(total / km) : 0 };
  });
}

// ───────────────────────── Cheques ─────────────────────────

export async function chequeRegister(tenantId: string, from: string, to: string) {
  const today = businessDate();
  const payments = await prisma.payment.findMany({ where: { tenantId, mode: 'CHEQUE', OR: [{ paymentDate: { gte: from, lte: to } }, { chequeDate: { gte: from, lte: to } }, { chequeStatus: { in: ['PDC', 'RECEIVED', 'DEPOSITED'] } }] }, orderBy: [{ chequeDate: 'asc' }, { paymentDate: 'asc' }] });
  return payments.map((p) => {
    const status = p.status === 'REJECTED' ? 'REJECTED' : p.chequeStatus || (p.chequeDate && p.chequeDate > today ? 'PDC' : 'RECEIVED');
    return { id: p.id, paymentNumber: p.paymentNumber, customerName: p.customerName, customerId: p.customerId, chequeNumber: p.chequeNumber || '', bank: p.chequeBank || '', chequeDate: p.chequeDate || '', receivedOn: p.paymentDate, amount: p.amount, status, depositedOn: p.depositedOn, clearedOn: p.clearedOn, bouncedOn: p.bouncedOn, bounceReason: p.bounceReason, bounceCharges: p.bounceCharges, verified: p.status === 'VERIFIED' };
  });
}

/** Cheque life cycle: deposit → clear, or bounce (reverses the receipt and can add charges). */
export async function updateCheque(tx: Tx, actor: Actor, paymentId: string, input: { action: 'deposit' | 'clear' | 'bounce'; date: string; reason?: string | null; charges?: number }, effects?: Effects) {
  const p = await tx.payment.findFirst({ where: { id: paymentId, tenantId: actor.tenantId, mode: 'CHEQUE' } });
  if (!p) throw notFound('Cheque not found.');
  if (!isDate(input.date)) throw badRequest('Choose the date.');
  if (p.chequeStatus === 'BOUNCED') throw conflict('This cheque has already bounced.');
  if (input.action === 'deposit') {
    await tx.payment.update({ where: { id: p.id }, data: { chequeStatus: 'DEPOSITED', depositedOn: input.date } });
  } else if (input.action === 'clear') {
    if (p.status !== 'VERIFIED') throw conflict('Verify the payment in Accounts → Payments first.');
    await tx.payment.update({ where: { id: p.id }, data: { chequeStatus: 'CLEARED', clearedOn: input.date } });
  } else {
    const reason = String(input.reason || '').trim();
    if (!reason) throw badRequest('Enter the bounce reason (e.g. funds insufficient).');
    const charges = round2(Math.max(0, Number(input.charges) || 0));
    if (p.status === 'VERIFIED') {
      // The receipt is undone: the customer owes the amount again.
      await postCustomerLedger(tx, { tenantId: actor.tenantId, customerId: p.customerId, entryType: 'REVERSAL', debit: p.amount, voucherNumber: p.paymentNumber, date: input.date, particulars: `Cheque ${p.chequeNumber} bounced: ${reason}`, referenceType: 'PAYMENT', referenceId: p.id, createdBy: actor.name });
      if (charges > 0) await postCustomerLedger(tx, { tenantId: actor.tenantId, customerId: p.customerId, entryType: 'ADJUSTMENT', debit: charges, voucherNumber: p.paymentNumber, date: input.date, particulars: `Cheque bounce charges (${p.chequeNumber})`, referenceType: 'CHEQUE_BOUNCE', referenceId: p.id, createdBy: actor.name });
    }
    await tx.payment.update({ where: { id: p.id }, data: { chequeStatus: 'BOUNCED', bouncedOn: input.date, bounceReason: reason, bounceCharges: charges } });
    const customer = await tx.customer.findFirst({ where: { id: p.customerId } });
    if (customer && effects) {
      // Sent after the transaction commits — never hold the customer lock on a network call.
      const text = `Namaste ${customer.name}, aapka cheque no. ${p.chequeNumber} (₹${p.amount.toLocaleString('en-IN')}) bank se wapas aa gaya hai (${reason}). Kripya payment jald karein.${charges ? ` Bounce charges ₹${charges} lagaye gaye hain.` : ''}`;
      const phone = customer.whatsappNumber || customer.phone;
      effects.add('cheque bounce WhatsApp', async () => (await import('./messaging/whatsapp')).sendWhatsAppText(actor.tenantId, phone, text, 'CHEQUE_BOUNCED'));
    }
  }
  await audit(tx, actor, { action: `CHEQUE_${input.action.toUpperCase()}`, entityType: 'Payment', entityId: p.id, reference: `${p.paymentNumber} chq ${p.chequeNumber}`, newValue: input, sensitive: input.action === 'bounce' });
}
