import { monthRange } from '@/lib/books';
import { prisma } from '@/lib/db';
import { audit, Actor, systemActor } from './audit';
import { Effects } from './effects';
import { addDays, badRequest, businessDate, notFound } from './http';
import { notifyCustomer, notifyRoles } from './notify';
import { createOrder } from './orders';
import { getSetting } from './settings';

// Auto-reorder: every customer's usual refill cycle is learnt from their order
// history (median gap between orders, usual quantity per product). A customer
// can be set to OFF, REMIND (WhatsApp "your refill is due") or ORDER (an order
// is created for approval on the due day). Default for everyone is suggestion-only.

export type ReorderMode = 'OFF' | 'SUGGEST' | 'REMIND' | 'ORDER';
export interface ReorderSetting {
  mode: ReorderMode;
  /** Fixed cycle in days; blank = learnt from history. */
  everyDays?: number | null;
  /** Fixed quantities; blank = usual quantities. */
  items?: { productId: string; qty: number }[] | null;
  lastActionOn?: string | null;
}

const OPEN = ['DRAFT', 'WHATSAPP_RECEIVED', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'];
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
export const reorderSettingOf = (extra: unknown): ReorderSetting => {
  const r = ((extra as Record<string, unknown> | null)?.autoReorder as ReorderSetting | undefined) || null;
  return { mode: r?.mode || 'SUGGEST', everyDays: r?.everyDays ?? null, items: r?.items ?? null, lastActionOn: r?.lastActionOn ?? null };
};

/** Customers and when their next refill is due. */
export async function reorderPlan(tenantId: string, asOf = businessDate(), horizonDays = 3) {
  const since = addDays(asOf, -180);
  const [customers, orders, products] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId, type: 'Customer', status: 'ACTIVE' }, select: { id: true, name: true, shortName: true, phone: true, whatsappNumber: true, email: true, area: true, route: true, extra: true } }),
    prisma.order.findMany({ where: { tenantId, requestedDeliveryDate: { gte: since }, status: { notIn: ['REJECTED', 'CANCELLED', 'DRAFT'] } }, select: { customerId: true, requestedDeliveryDate: true, status: true, items: { select: { productId: true, productName: true, orderedQty: true } } }, orderBy: { requestedDeliveryDate: 'asc' } }),
    prisma.product.findMany({ where: { tenantId, active: true }, select: { id: true, name: true } }),
  ]);
  const byCustomer = new Map<string, typeof orders>();
  for (const o of orders) byCustomer.set(o.customerId, [...(byCustomer.get(o.customerId) || []), o]);
  const productName = (id: string) => products.find((p) => p.id === id)?.name || 'Cylinder';

  const rows = [];
  for (const c of customers) {
    const setting = reorderSettingOf(c.extra);
    if (setting.mode === 'OFF') continue;
    const list = byCustomer.get(c.id) || [];
    const open = list.some((o) => OPEN.includes(o.status));
    const dates = [...new Set(list.map((o) => o.requestedDeliveryDate))].sort();
    if (!dates.length && !setting.everyDays) continue;
    const gaps = dates.slice(1).map((d, i) => dayDiff(dates[i], d)).filter((g) => g > 0);
    const cycle = setting.everyDays || (gaps.length >= 2 ? Math.round(median(gaps)) : 0);
    if (!cycle) continue;
    const last = dates[dates.length - 1] || addDays(asOf, -cycle);
    const dueOn = addDays(last, cycle);
    const daysLeft = dayDiff(asOf, dueOn);
    // Usual quantity per product over the last 3 orders.
    const recent = list.slice(-3);
    const qty = new Map<string, number[]>();
    for (const o of recent) for (const it of o.items) qty.set(it.productId, [...(qty.get(it.productId) || []), it.orderedQty]);
    const items = setting.items?.length ? setting.items.filter((i) => i.qty > 0) : [...qty.entries()].map(([productId, qs]) => ({ productId, qty: Math.max(1, Math.round(median(qs))) }));
    if (!items.length) continue;
    rows.push({
      customerId: c.id,
      customer: c.shortName || c.name,
      phone: c.whatsappNumber || c.phone,
      area: c.route || c.area || '',
      mode: setting.mode,
      learnt: !setting.everyDays,
      orders: dates.length,
      cycleDays: cycle,
      lastOrder: dates[dates.length - 1] || null,
      dueOn,
      daysLeft,
      openOrder: open,
      items: items.map((i) => ({ ...i, productName: productName(i.productId) })),
      lastActionOn: setting.lastActionOn,
      due: !open && daysLeft <= horizonDays,
    });
  }
  return rows.sort((a, b) => a.daysLeft - b.daysLeft);
}

export async function setReorderSetting(actor: Actor, customerId: string, input: ReorderSetting) {
  if (!['OFF', 'SUGGEST', 'REMIND', 'ORDER'].includes(input.mode)) throw badRequest('Choose off, suggest, remind or auto-order.');
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: actor.tenantId } });
  if (!customer) throw notFound('Customer not found.');
  const extra = { ...((customer.extra as Record<string, unknown> | null) || {}) };
  const before = reorderSettingOf(extra);
  extra.autoReorder = { mode: input.mode, everyDays: input.everyDays && input.everyDays > 0 ? Math.round(input.everyDays) : null, items: input.items?.filter((i) => i.qty > 0) || null, lastActionOn: before.lastActionOn };
  await prisma.customer.update({ where: { id: customer.id }, data: { extra: extra as object } });
  await audit(prisma, actor, { action: 'AUTO_REORDER_SET', entityType: 'Customer', entityId: customer.id, reference: customer.name, oldValue: before, newValue: extra.autoReorder });
}

async function markActed(customerId: string, date: string) {
  const c = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!c) return;
  const extra = { ...((c.extra as Record<string, unknown> | null) || {}) };
  extra.autoReorder = { ...reorderSettingOf(extra), lastActionOn: date };
  await prisma.customer.update({ where: { id: c.id }, data: { extra: extra as object } });
}

/** Create the usual order for a customer now (goes to the approval queue). */
export async function createReorder(actor: Actor, customerId: string, date = businessDate()) {
  const row = (await reorderPlan(actor.tenantId, date, 365)).find((r) => r.customerId === customerId);
  if (!row) throw badRequest('No usual order found for this customer.');
  if (row.openOrder) throw badRequest('This customer already has an open order.');
  const effects = new Effects();
  const { transaction } = await import('@/lib/db');
  const order = await transaction((tx) => createOrder(tx, actor, { customerId, source: 'ADMIN', items: row.items.map((i) => ({ productId: i.productId, qty: i.qty })), requestedDeliveryDate: row.dueOn > date ? row.dueOn : date, notes: `Auto-reorder (every ~${row.cycleDays} days)` }, effects));
  effects.schedule();
  await markActed(customerId, date);
  return order;
}

/** Daily job: remind or order for everyone due today. */
export async function runReorders(tenantId: string, date = businessDate()) {
  const ops = await getSetting(tenantId, 'operations');
  const plan = (await reorderPlan(tenantId, date, 0)).filter((r) => r.due && r.lastActionOn !== date && (!r.lastActionOn || dayDiff(r.lastActionOn, date) >= Math.max(2, Math.floor(r.cycleDays / 2))));
  let reminded = 0;
  let ordered = 0;
  const failed: string[] = [];
  for (const r of plan) {
    try {
      if (r.mode === 'ORDER') {
        await createReorder(systemActor(tenantId, 'Auto-reorder'), r.customerId, date);
        ordered++;
      } else if (r.mode === 'REMIND' || (r.mode === 'SUGGEST' && ops.refillReminders)) {
        const customer = await prisma.customer.findUnique({ where: { id: r.customerId } });
        if (customer) await notifyCustomer(tenantId, customer, 'REFILL_REMINDER', { items: r.items.map((i) => `${i.qty} × ${i.productName}`).join(', ') });
        await markActed(r.customerId, date);
        reminded++;
      }
    } catch (e) {
      failed.push(`${r.customer}: ${e instanceof Error ? e.message : e}`);
    }
  }
  const dueCount = (await reorderPlan(tenantId, date, 0)).filter((r) => r.due).length;
  if (ordered || dueCount) await notifyRoles(tenantId, ['MANAGER', 'SUPER_ADMIN'], { title: 'Refills due today', body: `${dueCount} customers are due for a refill${ordered ? ` — ${ordered} orders created for approval` : ''}${reminded ? `, ${reminded} reminded` : ''}.`, link: '/admin?tab=registers&sub=reorder' });
  return { reminded, ordered, failed };
}

// ───────────────────────── Monthly statements ─────────────────────────

const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Last month's opening / bills / payments / closing to every customer with a balance or activity. */
export async function sendMonthlyStatements(tenantId: string, month: string) {
  const { from, to } = monthRange(month);
  const entries = await prisma.ledgerEntry.findMany({ where: { tenantId, ledgerType: 'CUSTOMER', date: { lte: to } }, select: { customerId: true, date: true, debit: true, credit: true, entryType: true } });
  const by = new Map<string, { opening: number; billed: number; paid: number; closing: number; active: boolean }>();
  for (const e of entries) {
    if (!e.customerId) continue;
    const r = by.get(e.customerId) || { opening: 0, billed: 0, paid: 0, closing: 0, active: false };
    const amt = e.debit - e.credit;
    if (e.date < from) r.opening += amt;
    else {
      r.active = true;
      if (e.entryType === 'INVOICE') r.billed += e.debit;
      else if (e.entryType === 'PAYMENT') r.paid += e.credit - e.debit;
    }
    r.closing += amt;
    by.set(e.customerId, r);
  }
  const customers = await prisma.customer.findMany({ where: { tenantId, type: 'Customer', status: 'ACTIVE', id: { in: [...by.keys()] } } });
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  const f = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-IN');
  let sent = 0;
  for (const c of customers) {
    const r = by.get(c.id)!;
    if (!r.active && Math.abs(r.closing) < 1) continue;
    await notifyCustomer(tenantId, c, 'MONTHLY_STATEMENT', { month: monthName(month), opening: f(r.opening), billed: f(r.billed), paid: f(r.paid), closing: f(r.closing), link: appUrl ? `Full statement: ${appUrl}/customer` : '' }, `Statement for ${monthName(month)}`);
    sent++;
  }
  return { sent, month };
}
