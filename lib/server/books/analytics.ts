import { prisma } from '@/lib/db';
import { accountBalances, costRates } from './reports';
import { getSetting } from '../settings';
import type { ReportColumn } from './catalog';

// Management analytics built on the same tables: profitability, credit rating,
// delivery leaderboard, budget vs actual, plant reconciliation, godown-wise stock.

type Row = Record<string, unknown>;
type Out = { columns: ReportColumn[]; rows: Row[]; summary?: { label: string; value: number | string; type?: 'money' | 'number' | 'percent' | 'text' }[]; note?: string };
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const m = (key: string, label: string, total = true): ReportColumn => ({ key, label, type: 'money', total });
const n = (key: string, label: string, total = true): ReportColumn => ({ key, label, type: 'number', total });
const pc = (key: string, label: string): ReportColumn => ({ key, label, type: 'percent' });
const t = (key: string, label: string): ReportColumn => ({ key, label });
const sumOf = (rows: Row[], key: string) => r2(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));
const dayNum = (d: string) => new Date(`${d}T00:00:00Z`).getTime() / 86_400_000;

// ───────────────────────── Profitability ─────────────────────────

export type ProfitBy = 'customer' | 'product' | 'route' | 'deliveryBoy';

export async function profitability(tenantId: string, from: string, to: string, by: ProfitBy): Promise<Out> {
  const [items, notes, rates] = await Promise.all([
    prisma.invoiceItem.findMany({ where: { invoice: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } } }, include: { invoice: { select: { customerId: true, customerName: true, salesmanName: true } } } }),
    prisma.creditNoteItem.findMany({ where: { note: { tenantId, date: { gte: from, lte: to }, status: 'Active' } }, include: { note: { select: { customerId: true, customerName: true, stockReturned: true, invoiceId: true } } } }),
    costRates(tenantId, to),
  ]);
  const cost = new Map(rates.map((r) => [r.id, r.rate]));
  const customers = await prisma.customer.findMany({ where: { tenantId, id: { in: [...new Set([...items.map((i) => i.invoice.customerId), ...notes.map((x) => x.note.customerId)])] } }, select: { id: true, route: true, area: true, shortName: true } });
  const cust = new Map(customers.map((c) => [c.id, c]));
  const noteInvoices = await prisma.invoice.findMany({ where: { id: { in: notes.map((x) => x.note.invoiceId).filter(Boolean) as string[] } }, select: { id: true, salesmanName: true } });
  const noteBoy = new Map(noteInvoices.map((i) => [i.id, i.salesmanName]));
  const keyOf = (customerId: string, customerName: string, productName: string, boy: string | null) => {
    const c = cust.get(customerId);
    if (by === 'customer') return c?.shortName || customerName;
    if (by === 'product') return productName;
    if (by === 'route') return c?.route || c?.area || 'No route';
    return boy || 'Counter / manual';
  };
  const acc = new Map<string, { qty: number; sales: number; cost: number }>();
  const add = (k: string, qty: number, sales: number, c: number) => {
    const a = acc.get(k) || { qty: 0, sales: 0, cost: 0 };
    a.qty += qty;
    a.sales += sales;
    a.cost += c;
    acc.set(k, a);
  };
  for (const i of items) add(keyOf(i.invoice.customerId, i.invoice.customerName, i.productName, i.invoice.salesmanName), i.quantity, i.taxableAmount, i.quantity * (i.productId ? cost.get(i.productId) || 0 : 0));
  for (const i of notes) {
    // A return gives the cylinders' cost back; a rate difference only reduces sales.
    const back = i.note.stockReturned ? i.quantity : 0;
    add(keyOf(i.note.customerId, i.note.customerName, i.productName, i.note.invoiceId ? noteBoy.get(i.note.invoiceId) || null : null), -back, -i.taxableAmount, -back * (i.productId ? cost.get(i.productId) || 0 : 0));
  }
  const rows = [...acc.entries()]
    .map(([name, a]) => {
      const margin = r2(a.sales - a.cost);
      return { name, qty: r2(a.qty), sales: r2(a.sales), cost: r2(a.cost), margin, marginPct: a.sales ? r2((margin / a.sales) * 100) : 0, perCylinder: a.qty ? r2(margin / a.qty) : 0 };
    })
    .sort((a, b) => b.margin - a.margin);
  const label = { customer: 'Customer', product: 'Product', route: 'Route / area', deliveryBoy: 'Delivery boy' }[by];
  const totalSales = sumOf(rows, 'sales');
  const totalMargin = sumOf(rows, 'margin');
  return {
    columns: [t('name', label), n('qty', 'Cylinders'), m('sales', 'Sales (taxable)'), m('cost', 'Cost of cylinders'), m('margin', 'Gross margin'), pc('marginPct', 'Margin %'), m('perCylinder', 'Margin / cylinder', false)],
    rows,
    summary: [
      { label: 'Sales', value: totalSales, type: 'money' },
      { label: 'Gross margin', value: totalMargin, type: 'money' },
      { label: 'Margin %', value: totalSales ? r2((totalMargin / totalSales) * 100) : 0, type: 'percent' },
      { label: `Loss-making ${label.toLowerCase()}s`, value: rows.filter((r) => r.margin < 0).length, type: 'number' },
    ],
    note: 'Cost = weighted average purchase cost of the cylinders sold. Delivery expenses are not allocated.',
  };
}

// ───────────────────────── Credit rating ─────────────────────────

export async function creditRating(tenantId: string, asOf: string): Promise<Out> {
  const [customers, entries] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId, type: 'Customer', status: { not: 'INACTIVE' } }, select: { id: true, name: true, shortName: true, creditLimit: true, creditDays: true, paymentTerms: true, balance: true } }),
    prisma.ledgerEntry.findMany({ where: { tenantId, ledgerType: 'CUSTOMER', date: { lte: asOf } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }),
  ]);
  const bounces = await prisma.payment.groupBy({ by: ['customerId'], where: { tenantId, chequeStatus: 'BOUNCED' }, _count: true }).catch(() => [] as { customerId: string; _count: number }[]);
  const bounceOf = new Map(bounces.map((b) => [b.customerId, b._count]));
  const termDays = (c: { creditDays: number | null; paymentTerms: string }) => c.creditDays ?? ({ COD: 0, NET_7: 7, NET_15: 15, NET_30: 30 } as Record<string, number>)[c.paymentTerms] ?? 0;
  const since = new Date(`${asOf}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 90);
  const from90 = since.toISOString().slice(0, 10);
  const rows = customers
    .map((c) => {
      const list = entries.filter((e) => e.customerId === c.id);
      // FIFO: which bill each rupee paid, and after how many days.
      const bills = list.filter((e) => e.debit > 0).map((e) => ({ date: e.date, open: e.debit }));
      let weighted = 0;
      let paidTotal = 0;
      for (const e of list.filter((x) => x.credit > 0)) {
        let left = e.credit;
        for (const b of bills) {
          if (left <= 0) break;
          if (b.open <= 0) continue;
          const used = Math.min(b.open, left);
          b.open -= used;
          left -= used;
          weighted += used * Math.max(0, dayNum(e.date) - dayNum(b.date));
          paidTotal += used;
        }
      }
      const avgDays = paidTotal ? Math.round(weighted / paidTotal) : 0;
      const oldestOpen = bills.find((b) => b.open > 0.5);
      const oldestAge = oldestOpen ? Math.round(dayNum(asOf) - dayNum(oldestOpen.date)) : 0;
      const billed90 = list.filter((e) => e.entryType === 'INVOICE' && e.date >= from90).reduce((s, e) => s + e.debit, 0);
      const terms = termDays(c);
      const bounced = bounceOf.get(c.id) || 0;
      const utilisation = c.creditLimit ? (c.balance / c.creditLimit) * 100 : 0;
      let score = 100;
      score -= Math.max(0, avgDays - terms) * 1.2;
      score -= Math.max(0, oldestAge - terms - 30) * 0.5;
      score -= bounced * 15;
      if (utilisation > 100) score -= 15;
      if (!paidTotal && c.balance > 0) score -= 20;
      score = Math.max(0, Math.min(100, Math.round(score)));
      const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
      const monthly = billed90 / 3;
      const suggested = grade === 'D' ? 0 : Math.ceil((monthly * ((terms || 7) / 30 + (grade === 'A' ? 0.75 : 0.25))) / 1000) * 1000;
      return { name: c.shortName || c.name, grade, score, avgDays, terms, oldestAge, balance: r2(c.balance), creditLimit: c.creditLimit, utilisation: r2(utilisation), bounced, billed90: r2(billed90), suggested };
    })
    .filter((r) => r.billed90 || r.balance)
    .sort((a, b) => a.score - b.score);
  return {
    columns: [t('name', 'Customer'), t('grade', 'Grade'), n('score', 'Score', false), n('avgDays', 'Avg days to pay', false), n('terms', 'Terms (days)', false), n('oldestAge', 'Oldest due (days)', false), m('balance', 'Outstanding'), m('creditLimit', 'Credit limit', false), pc('utilisation', 'Limit used'), n('bounced', 'Bounced cheques'), m('billed90', 'Billed (90 days)'), m('suggested', 'Suggested limit', false)],
    rows,
    summary: ['A', 'B', 'C', 'D'].map((g) => ({ label: `Grade ${g}`, value: rows.filter((r) => r.grade === g).length, type: 'number' as const })),
    note: 'Score from payment speed vs terms, age of the oldest due, bounced cheques and limit use. Suggested limit ≈ monthly billing × terms (last 90 days).',
  };
}

// ───────────────────────── Delivery leaderboard ─────────────────────────

export async function deliveryLeaderboard(tenantId: string, from: string, to: string): Promise<Out> {
  const deliveries = await prisma.delivery.findMany({ where: { tenantId, deliveryDate: { gte: from, lte: to } }, select: { deliveryBoyId: true, deliveryBoyName: true, status: true, deliveredQtyTotal: true, emptyReceivedTotal: true, paymentMode: true, paymentAmount: true, revision: true, submittedAt: true, verifiedAt: true } });
  const by = new Map<string, Row & { name: string }>();
  for (const d of deliveries) {
    const r = by.get(d.deliveryBoyId) || { name: d.deliveryBoyName, deliveries: 0, verified: 0, cylinders: 0, empties: 0, corrections: 0, cash: 0, hours: 0, timed: 0 };
    r.deliveries = (r.deliveries as number) + 1;
    if (d.status === 'VERIFIED') {
      r.verified = (r.verified as number) + 1;
      r.cylinders = (r.cylinders as number) + d.deliveredQtyTotal;
      r.empties = (r.empties as number) + d.emptyReceivedTotal;
    }
    if (d.revision > 1 || d.status === 'SENT_BACK') r.corrections = (r.corrections as number) + 1;
    if (d.paymentMode === 'CASH') r.cash = (r.cash as number) + d.paymentAmount;
    if (d.verifiedAt) {
      r.hours = (r.hours as number) + (d.verifiedAt.getTime() - d.submittedAt.getTime()) / 3_600_000;
      r.timed = (r.timed as number) + 1;
    }
    by.set(d.deliveryBoyId, r);
  }
  const rows = [...by.values()]
    .map((r) => {
      const points = Math.round((r.cylinders as number) + (r.verified as number) * 2 + (r.empties as number) * 0.5 - (r.corrections as number) * 10);
      return { name: r.name, deliveries: r.deliveries, verified: r.verified, cylinders: r.cylinders, empties: r.empties, emptyRatio: (r.cylinders as number) ? r2(((r.empties as number) / (r.cylinders as number)) * 100) : 0, corrections: r.corrections, cash: r2(r.cash as number), points };
    })
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ rank: i === 0 ? '🥇 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : String(i + 1), ...r }));
  return {
    columns: [t('rank', 'Rank'), t('name', 'Delivery boy'), n('points', 'Points'), n('deliveries', 'Deliveries'), n('verified', 'Verified'), n('cylinders', 'Cylinders'), n('empties', 'Empties back'), pc('emptyRatio', 'Empties / delivered'), n('corrections', 'Sent back'), m('cash', 'Cash collected')],
    rows,
    note: 'Points = cylinders delivered + 2 per verified delivery + ½ per empty collected − 10 per correction sent back by accounts.',
  };
}

// ───────────────────────── Budget vs actual ─────────────────────────

export async function budgetVsActual(tenantId: string, from: string, to: string): Promise<Out> {
  const [rows0, budgets] = await Promise.all([accountBalances(tenantId, from, to), getSetting(tenantId, 'budgets')]);
  const months = Math.max(1, (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1);
  const heads = rows0.filter((r) => r.groupName === 'Direct Expenses' || r.groupName === 'Indirect Expenses');
  const rows = heads
    .map((h) => {
      const actual = r2(h.debit - h.credit);
      const monthly = Number(budgets.heads?.[h.name]) || 0;
      const budget = r2(monthly * months);
      const variance = r2(budget - actual);
      return { head: h.name, group: h.groupName, monthly, budget, actual, variance, used: budget ? r2((actual / budget) * 100) : 0, status: !budget ? (actual ? 'No budget' : '—') : actual > budget ? 'Over budget' : actual > budget * 0.9 ? 'Near limit' : 'OK' };
    })
    .filter((r) => r.actual || r.budget)
    .sort((a, b) => (b.used || 0) - (a.used || 0));
  return {
    columns: [t('head', 'Expense head'), t('group', 'Group'), m('monthly', 'Monthly budget', false), m('budget', `Budget (${months} mo)`), m('actual', 'Actual'), m('variance', 'Remaining'), pc('used', 'Used'), t('status', 'Status')],
    rows,
    summary: [
      { label: 'Budget', value: sumOf(rows, 'budget'), type: 'money' },
      { label: 'Actual', value: sumOf(rows, 'actual'), type: 'money' },
      { label: 'Heads over budget', value: rows.filter((r) => r.status === 'Over budget').length, type: 'number' },
    ],
    note: 'Set the monthly budget per head in Books → Expenses → Budgets.',
  };
}

// ───────────────────────── Plant reconciliation ─────────────────────────

export async function plantReconciliation(tenantId: string, from: string, to: string): Promise<Out> {
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(`${to}T23:59:59.999+05:30`);
  const [billItems, dnItems, txs, products] = await Promise.all([
    prisma.purchaseBillItem.findMany({ where: { productId: { not: null }, bill: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } } } }),
    prisma.debitNoteItem.findMany({ where: { productId: { not: null }, note: { tenantId, date: { gte: from, lte: to }, status: 'Active' } } }),
    prisma.inventoryTransaction.findMany({ where: { tenantId, createdAt: { gte: start, lte: end }, OR: [{ fromType: 'PLANT' }, { toType: 'PLANT' }] }, select: { productId: true, transactionType: true, fromType: true, toType: true, fullQty: true, emptyQty: true } }),
    prisma.product.findMany({ where: { tenantId }, select: { id: true, name: true } }),
  ]);
  const rows = products
    .map((p) => {
      const billed = billItems.filter((i) => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
      const debited = dnItems.filter((i) => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
      const mine = txs.filter((x) => x.productId === p.id);
      const receivedFull = mine.filter((x) => x.fromType === 'PLANT' && x.transactionType !== 'REVERSAL').reduce((s, x) => s + x.fullQty, 0) - mine.filter((x) => x.toType === 'PLANT' && x.transactionType === 'REVERSAL').reduce((s, x) => s + x.fullQty, 0);
      const returnedFull = mine.filter((x) => x.toType === 'PLANT' && x.transactionType === 'PURCHASE_RETURN').reduce((s, x) => s + x.fullQty, 0);
      const emptiesSent = mine.filter((x) => x.toType === 'PLANT').reduce((s, x) => s + x.emptyQty, 0);
      const netReceived = receivedFull - returnedFull;
      const netBilled = billed - debited;
      return { product: p.name, billed, debited, netBilled, receivedFull, returnedFull, netReceived, difference: netBilled - netReceived, emptiesSent, emptyBalance: netReceived - emptiesSent, status: netBilled === netReceived ? 'Tallies' : netBilled > netReceived ? 'Billed more than received' : 'Received more than billed' };
    })
    .filter((r) => r.billed || r.receivedFull || r.emptiesSent);
  return {
    columns: [t('product', 'Product'), n('billed', 'Billed'), n('debited', 'Debit notes'), n('netBilled', 'Net billed'), n('receivedFull', 'Full received'), n('returnedFull', 'Full returned'), n('netReceived', 'Net received'), n('difference', 'Billed − received'), n('emptiesSent', 'Empties sent'), n('emptyBalance', 'Received − empties sent'), t('status', 'Status')],
    rows,
    note: 'Compares plant bills with cylinders actually received into the godown, and full cylinders received with empties sent back for refilling.',
  };
}

// ───────────────────────── Godown-wise stock ─────────────────────────

export async function godownStock(tenantId: string, from: string, to: string): Promise<Out> {
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(`${to}T23:59:59.999+05:30`);
  const [warehouses, balances, txs, rates] = await Promise.all([
    prisma.warehouse.findMany({ where: { tenantId } }),
    prisma.stockBalance.findMany({ where: { tenantId, locationType: 'WAREHOUSE' } }),
    prisma.inventoryTransaction.findMany({ where: { tenantId, createdAt: { gte: start, lte: end }, OR: [{ fromType: 'WAREHOUSE' }, { toType: 'WAREHOUSE' }] }, select: { productId: true, productName: true, fromType: true, fromId: true, toType: true, toId: true, fullQty: true, emptyQty: true } }),
    costRates(tenantId, to),
  ]);
  const cost = new Map(rates.map((r) => [r.id, r.rate]));
  const rows: Row[] = [];
  for (const w of warehouses) {
    for (const b of balances.filter((x) => x.locationId === w.id)) {
      const mine = txs.filter((x) => x.productId === b.productId && (x.toId === w.id || x.fromId === w.id));
      const inPlant = mine.filter((x) => x.toId === w.id && x.fromType === 'PLANT').reduce((s, x) => s + x.fullQty, 0);
      const toBoys = mine.filter((x) => x.fromId === w.id && x.toType === 'DELIVERY_BOY').reduce((s, x) => s + x.fullQty, 0);
      const fromBoysFull = mine.filter((x) => x.toId === w.id && x.fromType === 'DELIVERY_BOY').reduce((s, x) => s + x.fullQty, 0);
      const emptiesIn = mine.filter((x) => x.toId === w.id).reduce((s, x) => s + x.emptyQty, 0);
      const direct = mine.filter((x) => x.fromId === w.id && x.toType === 'CUSTOMER').reduce((s, x) => s + x.fullQty, 0);
      rows.push({ godown: w.name, product: b.productName, fromPlant: inPlant, toBoys, backFromBoys: fromBoysFull, directSales: direct, emptiesIn, fullNow: b.fullQty, emptyNow: b.emptyQty, value: r2(Math.max(0, b.fullQty) * (cost.get(b.productId) || 0)) });
    }
  }
  return {
    columns: [t('godown', 'Godown / branch'), t('product', 'Product'), n('fromPlant', 'From plant'), n('toBoys', 'Issued to boys'), n('backFromBoys', 'Full back from boys'), n('directSales', 'Direct sales'), n('emptiesIn', 'Empties in'), n('fullNow', 'Full now'), n('emptyNow', 'Empty now'), m('value', 'Stock value')],
    rows,
    note: 'Movements in the period; "now" columns are the current balance of each godown.',
  };
}
