import { prisma } from '@/lib/db';
import { addDays } from './http';
import { getSetting } from './settings';

// Owner's end-of-day summary and the empty-cylinder ageing it (and the report
// catalog) use. Plain text so it reads well on WhatsApp.

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const dmy = (d: string) => `${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(0, 4)}`;
const dayMs = 86_400_000;
const daysBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / dayMs));
const istDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);

/** Customers holding cylinders, how long since they last returned an empty, and deposits. */
export async function emptyCylinderAgeing(tenantId: string, asOf: string) {
  const [holdings, overdueDays, deposits] = await Promise.all([
    prisma.customerCylinderBalance.findMany({ where: { tenantId, currentBalance: { gt: 0 } }, include: { customer: { select: { id: true, name: true, shortName: true, phone: true, whatsappNumber: true, email: true, area: true, status: true } } } }),
    getSetting(tenantId, 'operations').then((o) => o.emptyOverdueDays ?? 30),
    prisma.cylinderVoucher.groupBy({ by: ['customerId', 'productId'], where: { tenantId, status: 'ACTIVE' }, _sum: { cylinderQty: true, depositAmount: true } }),
  ]);
  const customerIds = [...new Set(holdings.map((h) => h.customerId))];
  const txs = customerIds.length
    ? await prisma.inventoryTransaction.findMany({ where: { tenantId, OR: [{ toType: 'CUSTOMER', toId: { in: customerIds } }, { fromType: 'CUSTOMER', fromId: { in: customerIds } }] }, select: { productId: true, fromType: true, fromId: true, toId: true, fullQty: true, emptyQty: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
    : [];
  const dep = new Map(deposits.map((x) => [`${x.customerId}|${x.productId}`, { qty: x._sum.cylinderQty || 0, amount: x._sum.depositAmount || 0 }]));
  return holdings
    .map((h) => {
      const mine = txs.filter((t) => t.productId === h.productId && (t.toId === h.customerId || t.fromId === h.customerId));
      const lastDelivery = [...mine].reverse().find((t) => t.toId === h.customerId && t.fullQty > 0);
      const lastEmpty = [...mine].reverse().find((t) => t.fromType === 'CUSTOMER' && t.fromId === h.customerId && t.emptyQty > 0);
      const since = lastEmpty?.createdAt ?? mine.find((t) => t.toId === h.customerId)?.createdAt ?? null;
      const days = since ? daysBetween(istDate(since), asOf) : 0;
      const d = dep.get(`${h.customerId}|${h.productId}`) || { qty: 0, amount: 0 };
      return {
        customerId: h.customerId,
        customer: h.customer.shortName || h.customer.name,
        legalName: h.customer.name,
        phone: h.customer.whatsappNumber || h.customer.phone,
        area: h.customer.area || '',
        product: h.productName,
        holding: h.currentBalance,
        onDeposit: d.qty,
        withoutDeposit: Math.max(0, h.currentBalance - d.qty),
        deposit: r2(d.amount),
        lastDelivery: lastDelivery ? istDate(lastDelivery.createdAt) : '',
        lastEmptyReturn: lastEmpty ? istDate(lastEmpty.createdAt) : '',
        daysSinceReturn: days,
        overdue: days >= overdueDays,
        status: days >= overdueDays ? `Overdue (${days} days)` : 'OK',
      };
    })
    .sort((a, b) => b.daysSinceReturn - a.daysSinceReturn || b.holding - a.holding);
}

/** The owner's summary of one business day. */
export async function dailySummary(tenantId: string, date: string) {
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(`${addDays(date, 1)}T00:00:00+05:30`);
  const [company, invoices, payments, orders, wallets, stock, expenses, topDues, approvals, ageing, notes] = await Promise.all([
    getSetting(tenantId, 'company'),
    prisma.invoice.findMany({ where: { tenantId, date, status: { not: 'Cancelled' } }, include: { items: true } }),
    prisma.payment.findMany({ where: { tenantId, paymentDate: date, status: 'VERIFIED' } }),
    prisma.order.findMany({ where: { tenantId, OR: [{ requestedDeliveryDate: date }, { createdAt: { gte: start, lt: end } }] }, select: { status: true, createdAt: true, requestedDeliveryDate: true } }),
    prisma.cashWallet.findMany({ where: { tenantId, balance: { not: 0 } }, orderBy: { balance: 'desc' } }),
    prisma.stockBalance.groupBy({ by: ['productName'], where: { tenantId, locationType: 'WAREHOUSE' }, _sum: { fullQty: true, emptyQty: true } }),
    prisma.expenseEntry.aggregate({ where: { tenantId, date, cancelled: false }, _sum: { totalAmount: true } }),
    prisma.customer.findMany({ where: { tenantId, type: 'Customer', balance: { gt: 0 } }, orderBy: { balance: 'desc' }, take: 5, select: { name: true, shortName: true, balance: true } }),
    prisma.approvalRequest.count({ where: { tenantId, status: 'PENDING' } }),
    emptyCylinderAgeing(tenantId, date),
    prisma.creditNote.aggregate({ where: { tenantId, date, status: 'Active' }, _sum: { grandTotal: true } }),
  ]);
  const sales = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const byProduct = new Map<string, number>();
  invoices.forEach((i) => i.items.forEach((it) => byProduct.set(it.productName, (byProduct.get(it.productName) || 0) + it.quantity)));
  const byMode = new Map<string, number>();
  payments.forEach((p) => byMode.set(p.mode, (byMode.get(p.mode) || 0) + p.amount));
  const received = payments.reduce((s, p) => s + p.amount, 0);
  const delivered = orders.filter((o) => ['DELIVERED', 'PENDING_VERIFICATION', 'VERIFIED', 'INVOICED', 'LEDGER_POSTED', 'COMPLETED'].includes(o.status) && o.requestedDeliveryDate === date).length;
  const pending = orders.filter((o) => ['APPROVED', 'ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'PENDING_APPROVAL', 'WHATSAPP_RECEIVED'].includes(o.status)).length;
  const created = orders.filter((o) => o.createdAt >= start && o.createdAt < end).length;
  const overdue = ageing.filter((a) => a.overdue);
  const alerts = await ownerAlerts(tenantId, date);

  const lines = [
    `*${company.name} — Daily report ${dmy(date)}*`,
    '',
    `🧾 Sales: ${invoices.length} bills · ${inr(sales)}`,
    ...(byProduct.size ? [`   ${[...byProduct.entries()].map(([p, q]) => `${p.replace(/ LPG Cylinder| Cylinder/g, '')}: ${q}`).join(' · ')}`] : []),
    ...(notes._sum.grandTotal ? [`↩️ Returns: ${inr(notes._sum.grandTotal)}`] : []),
    `💰 Received: ${inr(received)}${byMode.size ? ` (${[...byMode.entries()].map(([m, v]) => `${m} ${inr(v)}`).join(' · ')})` : ''}`,
    `📒 Credit given today: ${inr(Math.max(0, sales - received))}`,
    `🚚 Orders: ${created} new · ${delivered} delivered · ${pending} pending`,
    `💵 Cash with staff: ${wallets.length ? wallets.map((w) => `${w.ownerType === 'COMPANY' ? 'Office' : w.ownerName} ${inr(w.balance)}`).join(' · ') : 'nil'}`,
    `📦 Godown stock (full/empty): ${stock.length ? stock.map((s) => `${s.productName.replace(/ LPG Cylinder| Cylinder/g, '')} ${s._sum.fullQty || 0}/${s._sum.emptyQty || 0}`).join(' · ') : '—'}`,
    `💸 Expenses today: ${inr(expenses._sum.totalAmount || 0)}`,
    `⏳ Top dues: ${topDues.length ? topDues.map((c) => `${c.shortName || c.name} ${inr(c.balance)}`).join(' · ') : 'none'}`,
    ...(overdue.length ? [`🛢️ Empties overdue: ${new Set(overdue.map((o) => o.customerId)).size} customers · ${overdue.reduce((s, o) => s + o.holding, 0)} cylinders`] : []),
    ...(approvals ? [`✅ Waiting for approval: ${approvals}`] : []),
    ...(alerts.length ? ['', '*⚠️ Needs attention*', ...alerts.map((a) => `• ${a}`)] : []),
  ];
  return {
    date,
    text: lines.join('\n'),
    figures: { bills: invoices.length, sales: r2(sales), received: r2(received), credit: r2(Math.max(0, sales - received)), newOrders: created, delivered, pending, expenses: r2(expenses._sum.totalAmount || 0), approvals, overdueCustomers: new Set(overdue.map((o) => o.customerId)).size, alerts: alerts.length },
    alerts,
    detail: {
      byProduct: [...byProduct.entries()].map(([product, qty]) => ({ product, qty })),
      byMode: [...byMode.entries()].map(([mode, amount]) => ({ mode, amount: r2(amount) })),
      wallets: wallets.map((w) => ({ name: w.ownerType === 'COMPANY' ? 'Office' : w.ownerName, balance: r2(w.balance) })),
      stock: stock.map((s) => ({ product: s.productName, full: s._sum.fullQty || 0, empty: s._sum.emptyQty || 0 })),
      topDues: topDues.map((c) => ({ name: c.shortName || c.name, balance: r2(c.balance) })),
      returns: r2(notes._sum.grandTotal || 0),
      emptiesOverdue: overdue.reduce((s, o) => s + o.holding, 0),
    },
  };
}

/** Things the owner should act on: open complaints, cheques, vehicle papers, cylinder tests, budgets. */
export async function ownerAlerts(tenantId: string, date: string): Promise<string[]> {
  const out: string[] = [];
  const [complaints, urgent, pdc, testOverdue, testDue] = await Promise.all([
    prisma.complaint.count({ where: { tenantId, status: { in: ['OPEN', 'ASSIGNED'] } } }),
    prisma.complaint.count({ where: { tenantId, status: { in: ['OPEN', 'ASSIGNED'] }, priority: 'URGENT' } }),
    prisma.payment.findMany({ where: { tenantId, mode: 'CHEQUE', OR: [{ chequeStatus: null, chequeDate: { gte: addDays(date, -10), lte: date } }, { chequeStatus: { in: ['PDC', 'RECEIVED'] }, chequeDate: { lte: date } }], status: { not: 'REJECTED' } }, select: { amount: true } }),
    prisma.cylinderAsset.count({ where: { tenantId, status: { not: 'CONDEMNED' }, nextTestDue: { lt: date } } }),
    prisma.cylinderAsset.count({ where: { tenantId, status: { not: 'CONDEMNED' }, nextTestDue: { gte: date, lte: addDays(date, 30) } } }),
  ]);
  if (complaints) out.push(`Open complaints: ${complaints}${urgent ? ` (${urgent} urgent)` : ''}`);
  if (pdc.length) out.push(`Cheques to deposit: ${pdc.length} · ${inr(pdc.reduce((s, p) => s + p.amount, 0))}`);
  if (testOverdue) out.push(`Cylinders past test date (do not fill): ${testOverdue}`);
  if (testDue) out.push(`Cylinder tests due in 30 days: ${testDue}`);
  const { vehicleAlerts } = await import('./registers');
  for (const v of (await vehicleAlerts(tenantId, 7)).slice(0, 5)) out.push(`${v.vehicle}: ${v.item} ${v.overdue ? 'expired' : 'due'} ${dmy(v.due)}`);
  const budgets = await getSetting(tenantId, 'budgets');
  if (Object.values(budgets.heads || {}).some((v) => Number(v) > 0)) {
    const { budgetVsActual } = await import('./books/analytics');
    const over = (await budgetVsActual(tenantId, `${date.slice(0, 7)}-01`, date)).rows.filter((r) => r.status === 'Over budget');
    if (over.length) out.push(`Over budget this month: ${over.slice(0, 4).map((r) => `${r.head} ${inr(Number(r.actual))}/${inr(Number(r.budget))}`).join(' · ')}`);
  }
  return out;
}

/** Send the summary to the owner's phones (WhatsApp) and emails. */
export async function sendOwnerReport(tenantId: string, date: string) {
  const policy = await getSetting(tenantId, 'owner');
  const phones = policy.phones.split(',').map((p) => p.trim()).filter(Boolean);
  const emails = policy.emails.split(',').map((e) => e.trim()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (!phones.length && !emails.length) throw new Error('Add the owner’s mobile number or email in Settings → Owner report.');
  const summary = await dailySummary(tenantId, date);
  const { sendWhatsAppText } = await import('./messaging/whatsapp');
  const { sendEmail } = await import('./messaging/email');
  const results: { to: string; ok: boolean }[] = [];
  for (const p of phones) results.push({ to: p, ok: (await sendWhatsAppText(tenantId, p, summary.text, 'OWNER_DAILY_REPORT')).ok });
  const company = await getSetting(tenantId, 'company');
  for (const e of emails) results.push({ to: e, ok: (await sendEmail(tenantId, e, `${company.name} — daily report ${dmy(date)}`, summary.text.replace(/\*/g, ''), 'OWNER_DAILY_REPORT')).status !== 'FAILED' });
  return { ...summary, sentTo: results };
}
