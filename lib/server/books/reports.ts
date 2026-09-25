import { prisma, Prisma } from '@/lib/db';
import { fyStart, GROUPS, groupOf, Section } from '@/lib/books';
import { stateLabel } from '@/lib/gst';
import { addDays } from '../http';
import { getSetting } from '../settings';

// Books of accounts reports. All amounts: debit positive, credit negative
// unless a report says otherwise. Cancelled vouchers never count.

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Movement = { accountId: string; d: number; c: number };

async function movements(tenantId: string, from: string | null, to: string): Promise<Map<string, { d: number; c: number }>> {
  const rows = await prisma.$queryRaw<Movement[]>(Prisma.sql`
    SELECT l."accountId" AS "accountId", COALESCE(SUM(l.debit), 0)::float8 AS d, COALESCE(SUM(l.credit), 0)::float8 AS c
    FROM gl_voucher_lines l JOIN gl_vouchers v ON v.id = l."voucherId"
    WHERE v."tenantId" = ${tenantId} AND v.cancelled = false AND v.date <= ${to} ${from ? Prisma.sql`AND v.date >= ${from}` : Prisma.empty}
    GROUP BY l."accountId"`);
  return new Map(rows.map((r) => [r.accountId, { d: Number(r.d), c: Number(r.c) }]));
}

export interface AccountBalance {
  id: string;
  code: string;
  name: string;
  groupName: string;
  nature: string;
  section: Section | undefined;
  systemKey: string | null;
  partyId: string | null;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

/** Opening (as of `from`), period debit / credit and closing for every ledger. */
export async function accountBalances(tenantId: string, from: string, to: string): Promise<AccountBalance[]> {
  const [accounts, before, during] = await Promise.all([
    prisma.ledgerAccount.findMany({ where: { tenantId }, orderBy: [{ groupName: 'asc' }, { name: 'asc' }] }),
    movements(tenantId, null, addDays(from, -1)),
    movements(tenantId, from, to),
  ]);
  return accounts.map((a) => {
    const b = before.get(a.id) || { d: 0, c: 0 };
    const m = during.get(a.id) || { d: 0, c: 0 };
    const opening = r2(a.openingBalance + b.d - b.c);
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      groupName: a.groupName,
      nature: a.nature,
      section: groupOf(a.groupName)?.section,
      systemKey: a.systemKey,
      partyId: a.partyId,
      opening,
      debit: r2(m.d),
      credit: r2(m.c),
      closing: r2(opening + m.d - m.c),
    };
  });
}

// ───────────────────────── Stock valuation ─────────────────────────

const COMPANY = new Set(['WAREHOUSE', 'DELIVERY_BOY']);
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999+05:30`);

/** Full cylinders held by the company (godowns + delivery boys) per product at the end of `date`. */
async function stockQtyAt(tenantId: string, date: string) {
  const [balances, after] = await Promise.all([
    prisma.stockBalance.groupBy({ by: ['productId'], where: { tenantId }, _sum: { fullQty: true, emptyQty: true } }),
    // OPENING entries are stock brought forward — part of every opening, whenever they were keyed in.
    prisma.inventoryTransaction.findMany({ where: { tenantId, createdAt: { gt: endOfDay(date) }, NOT: { transactionType: 'OPENING' } }, select: { productId: true, fromType: true, toType: true, fullQty: true, emptyQty: true } }),
  ]);
  const full = new Map(balances.map((b) => [b.productId, b._sum.fullQty || 0]));
  const empty = new Map(balances.map((b) => [b.productId, b._sum.emptyQty || 0]));
  for (const t of after) {
    const inn = COMPANY.has(t.toType || '') ? 1 : 0;
    const out = COMPANY.has(t.fromType || '') ? 1 : 0;
    full.set(t.productId, (full.get(t.productId) || 0) - (inn - out) * t.fullQty);
    empty.set(t.productId, (empty.get(t.productId) || 0) - (inn - out) * t.emptyQty);
  }
  return { full, empty };
}

/**
 * Cost rate per product by weighted average (Tally's default): opening stock at
 * the product's purchase price plus every purchase bill up to `upTo`.
 */
export async function costRates(tenantId: string, upTo: string) {
  const [products, items, openings] = await Promise.all([
    prisma.product.findMany({ where: { tenantId }, select: { id: true, name: true, unit: true, purchasePrice: true } }),
    prisma.purchaseBillItem.findMany({ where: { productId: { not: null }, bill: { tenantId, status: { not: 'Cancelled' }, date: { lte: upTo } } }, select: { productId: true, quantity: true, rate: true } }),
    prisma.inventoryTransaction.groupBy({ by: ['productId'], where: { tenantId, transactionType: 'OPENING', toType: { in: ['WAREHOUSE', 'DELIVERY_BOY'] } }, _sum: { fullQty: true } }),
  ]);
  const openingQty = new Map(openings.map((o) => [o.productId, o._sum.fullQty || 0]));
  return products.map((p) => {
    const bought = items.filter((i) => i.productId === p.id);
    const baseQty = openingQty.get(p.id) || 0;
    const qty = baseQty + bought.reduce((s, i) => s + i.quantity, 0);
    const value = baseQty * p.purchasePrice + bought.reduce((s, i) => s + i.quantity * i.rate, 0);
    const rate = bought.length && qty > 0 ? r2(value / qty) : p.purchasePrice;
    return { ...p, rate, rateSource: bought.length ? 'Weighted average (opening + purchase bills)' : 'Product purchase price' };
  });
}

export async function stockValue(tenantId: string, date: string) {
  const [{ full }, rates] = await Promise.all([stockQtyAt(tenantId, date), costRates(tenantId, date)]);
  return r2(rates.reduce((s, p) => s + Math.max(0, full.get(p.id) || 0) * p.rate, 0));
}

export async function stockSummary(tenantId: string, from: string, to: string) {
  const [open, close, rates, txs] = await Promise.all([
    stockQtyAt(tenantId, addDays(from, -1)),
    stockQtyAt(tenantId, to),
    costRates(tenantId, to),
    prisma.inventoryTransaction.findMany({ where: { tenantId, createdAt: { gt: endOfDay(addDays(from, -1)), lte: endOfDay(to) }, NOT: { transactionType: 'OPENING' } }, select: { productId: true, transactionType: true, fromType: true, toType: true, fullQty: true, emptyQty: true } }),
  ]);
  return rates.map((p) => {
    let inward = 0;
    let sold = 0;
    let emptyIn = 0;
    let emptyToPlant = 0;
    for (const t of txs.filter((x) => x.productId === p.id)) {
      if (t.transactionType === 'PURCHASE_RECEIPT') inward += t.fullQty;
      if (COMPANY.has(t.fromType || '') && t.toType === 'CUSTOMER') sold += t.fullQty;
      if (t.fromType === 'CUSTOMER' && COMPANY.has(t.toType || '')) emptyIn += t.emptyQty;
      if (t.transactionType === 'EMPTY_TO_PLANT') emptyToPlant += t.emptyQty;
    }
    const openingFull = open.full.get(p.id) || 0;
    const closingFull = close.full.get(p.id) || 0;
    return {
      productId: p.id,
      productName: p.name,
      unit: p.unit,
      openingFull,
      inward,
      sold,
      otherMovement: r2(closingFull - openingFull - inward + sold),
      closingFull,
      openingEmpty: open.empty.get(p.id) || 0,
      emptyReceived: emptyIn,
      emptyToPlant,
      closingEmpty: close.empty.get(p.id) || 0,
      rate: p.rate,
      rateSource: p.rateSource,
      closingValue: r2(Math.max(0, closingFull) * p.rate),
    };
  });
}

// ───────────────────────── Trial balance / P&L / balance sheet ─────────────────────────

export async function trialBalance(tenantId: string, from: string, to: string) {
  const rows = (await accountBalances(tenantId, from, to)).filter((a) => a.opening || a.debit || a.credit || a.closing);
  const groups = GROUPS.map((g) => {
    const accounts = rows.filter((r) => r.groupName === g.name);
    return { group: g.name, nature: g.nature, accounts, closing: r2(accounts.reduce((s, a) => s + a.closing, 0)) };
  }).filter((g) => g.accounts.length);
  // Opening stock is a debit in the trial balance, as in Tally.
  const openingStock = await stockValue(tenantId, addDays(from, -1));
  const totalDr = r2(rows.reduce((s, r) => s + (r.closing > 0 ? r.closing : 0), 0) + openingStock);
  const totalCr = r2(rows.reduce((s, r) => s + (r.closing < 0 ? -r.closing : 0), 0));
  // Opening balances keyed without a contra (party dues, opening stock) show as a
  // difference until the capital / opening ledgers are filled in.
  return { from, to, groups, openingStock, totalDr, totalCr, openingDifference: r2(totalDr - totalCr) };
}

const sumSection = (rows: AccountBalance[], sections: Section[], field: 'closing' | 'movement') =>
  rows.filter((r) => r.section && sections.includes(r.section)).reduce((s, r) => s + (field === 'closing' ? r.closing : r.debit - r.credit), 0);

export async function profitAndLoss(tenantId: string, from: string, to: string) {
  const [rows, openingStock, closingStock] = await Promise.all([accountBalances(tenantId, from, to), stockValue(tenantId, addDays(from, -1)), stockValue(tenantId, to)]);
  const pick = (sections: Section[]) =>
    rows
      .filter((r) => r.section && sections.includes(r.section) && r.debit - r.credit !== 0)
      .map((r) => ({ id: r.id, name: r.name, group: r.groupName, amount: r2(r.debit - r.credit) }));
  const sales = pick(['SALES']).map((x) => ({ ...x, amount: -x.amount }));
  const directIncome = pick(['DIRECT_INCOME']).map((x) => ({ ...x, amount: -x.amount }));
  const purchases = pick(['PURCHASE']);
  const directExpenses = pick(['DIRECT_EXPENSE']);
  const indirectIncome = pick(['INDIRECT_INCOME']).map((x) => ({ ...x, amount: -x.amount }));
  const indirectExpenses = pick(['INDIRECT_EXPENSE']);
  const total = (xs: { amount: number }[]) => r2(xs.reduce((s, x) => s + x.amount, 0));
  const grossProfit = r2(total(sales) + total(directIncome) + closingStock - openingStock - total(purchases) - total(directExpenses));
  const netProfit = r2(grossProfit + total(indirectIncome) - total(indirectExpenses));
  return {
    from,
    to,
    trading: { openingStock, purchases, directExpenses, sales, directIncome, closingStock, grossProfit },
    indirectIncome,
    indirectExpenses,
    totals: { sales: total(sales), purchases: total(purchases), directExpenses: total(directExpenses), indirectIncome: total(indirectIncome), indirectExpenses: total(indirectExpenses) },
    grossProfit,
    netProfit,
  };
}

export async function balanceSheet(tenantId: string, asOf: string) {
  const books = await getSetting(tenantId, 'books');
  const fy = fyStart(asOf, books.fyStartMonth);
  const [rows, pl, closingStock] = await Promise.all([accountBalances(tenantId, fy, asOf), profitAndLoss(tenantId, fy, asOf), stockValue(tenantId, asOf)]);
  const byGroup = (sections: Section[], sign: 1 | -1) =>
    GROUPS.filter((g) => sections.includes(g.section))
      .map((g) => {
        const accounts = rows.filter((r) => r.groupName === g.name && r.closing !== 0).map((r) => ({ id: r.id, name: r.name, amount: r2(sign * r.closing) }));
        return { group: g.name, accounts, amount: r2(accounts.reduce((s, a) => s + a.amount, 0)) };
      })
      .filter((g) => g.accounts.length);
  // Income / expense ledgers roll into profit; opening P&L balances belong to earlier years.
  const priorPl = r2(-sumSection(rows, ['SALES', 'DIRECT_INCOME', 'INDIRECT_INCOME', 'PURCHASE', 'DIRECT_EXPENSE', 'INDIRECT_EXPENSE'], 'closing') + sumSection(rows, ['SALES', 'DIRECT_INCOME', 'INDIRECT_INCOME', 'PURCHASE', 'DIRECT_EXPENSE', 'INDIRECT_EXPENSE'], 'movement'));
  const liabilities = byGroup(['CAPITAL', 'LOANS', 'CURRENT_LIABILITIES', 'SUSPENSE'], -1);
  const assets = byGroup(['FIXED_ASSETS', 'INVESTMENTS', 'CURRENT_ASSETS'], 1);
  if (closingStock) assets.push({ group: 'Stock-in-Hand', accounts: [{ id: 'stock', name: 'Closing stock (full cylinders at cost)', amount: closingStock }], amount: closingStock });
  const liabTotal = r2(liabilities.reduce((s, g) => s + g.amount, 0) + pl.netProfit + priorPl);
  const assetTotal = r2(assets.reduce((s, g) => s + g.amount, 0));
  return {
    asOf,
    fyFrom: fy,
    liabilities,
    profitThisYear: pl.netProfit,
    profitEarlier: priorPl,
    assets,
    liabilitiesTotal: liabTotal,
    assetsTotal: assetTotal,
    // Opening balances without a contra (party dues brought forward) — as Tally reports it.
    openingDifference: r2(assetTotal - liabTotal),
  };
}

// ───────────────────────── Ledgers / day book / cash & bank book ─────────────────────────

export async function ledgerStatement(tenantId: string, accountId: string, from: string, to: string) {
  const account = await prisma.ledgerAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!account) return null;
  const before = await movements(tenantId, null, addDays(from, -1));
  const b = before.get(account.id) || { d: 0, c: 0 };
  const opening = r2(account.openingBalance + b.d - b.c);
  const lines = await prisma.accountVoucherLine.findMany({
    where: { accountId, voucher: { tenantId, cancelled: false, date: { gte: from, lte: to } } },
    include: { voucher: { include: { lines: { include: { account: { select: { name: true } } } } } } },
    orderBy: [{ voucher: { date: 'asc' } }, { voucher: { createdAt: 'asc' } }],
  });
  let running = opening;
  const rows = lines.map((l) => {
    running = r2(running + l.debit - l.credit);
    const others = l.voucher.lines.filter((x) => x.accountId !== accountId && (l.debit ? x.credit : x.debit)).map((x) => x.account.name);
    return {
      date: l.voucher.date,
      voucherId: l.voucher.id,
      voucherNumber: l.voucher.voucherNumber,
      voucherType: l.voucher.voucherType,
      particulars: [...new Set(others)].join(', ') || l.voucher.partyName || '',
      narration: l.voucher.narration,
      debit: l.debit,
      credit: l.credit,
      balance: running,
    };
  });
  return { account: { id: account.id, name: account.name, code: account.code, groupName: account.groupName, gstin: account.gstin }, from, to, opening, rows, totalDebit: r2(rows.reduce((s, r) => s + r.debit, 0)), totalCredit: r2(rows.reduce((s, r) => s + r.credit, 0)), closing: running };
}

export async function dayBook(tenantId: string, from: string, to: string, voucherType?: string | null) {
  const vouchers = await prisma.accountVoucher.findMany({
    where: { tenantId, date: { gte: from, lte: to }, ...(voucherType ? { voucherType } : {}) },
    include: { lines: { include: { account: { select: { name: true, groupName: true } } } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
  return vouchers.map((v) => ({
    id: v.id,
    voucherNumber: v.voucherNumber,
    voucherType: v.voucherType,
    date: v.date,
    partyName: v.partyName,
    narration: v.narration,
    amount: v.amount,
    sourceType: v.sourceType,
    cancelled: v.cancelled,
    createdBy: v.createdBy,
    lines: v.lines.map((l) => ({ accountId: l.accountId, account: l.account.name, group: l.account.groupName, debit: l.debit, credit: l.credit })),
  }));
}

/** Cash book (all Cash-in-Hand ledgers) or bank book (all Bank Accounts ledgers). */
export async function cashBankBook(tenantId: string, kind: 'CASH' | 'BANK', from: string, to: string) {
  const group = kind === 'CASH' ? 'Cash-in-Hand' : 'Bank Accounts';
  const accounts = await prisma.ledgerAccount.findMany({ where: { tenantId, groupName: group }, orderBy: { name: 'asc' } });
  const books = [];
  for (const a of accounts) {
    const s = await ledgerStatement(tenantId, a.id, from, to);
    if (s && (s.opening || s.rows.length)) books.push(s);
  }
  return { kind, from, to, books, opening: r2(books.reduce((s, b) => s + b.opening, 0)), closing: r2(books.reduce((s, b) => s + b.closing, 0)) };
}

// ───────────────────────── Registers ─────────────────────────

export async function salesRegister(tenantId: string, from: string, to: string) {
  const invoices = await prisma.invoice.findMany({ where: { tenantId, date: { gte: from, lte: to } }, include: { items: true }, orderBy: [{ date: 'asc' }, { invoiceNumber: 'asc' }] });
  const customers = await prisma.customer.findMany({ where: { tenantId, id: { in: [...new Set(invoices.map((i) => i.customerId))] } }, select: { id: true, stateCode: true, state: true, gstin: true } });
  const cust = new Map(customers.map((c) => [c.id, c]));
  return invoices.map((i) => {
    const c = cust.get(i.customerId);
    return {
      id: i.id,
      date: i.date,
      invoiceNumber: i.invoiceNumber,
      customerName: i.customerName,
      gstin: i.customerGstin || '',
      // A registered buyer's place of supply is the state of its GSTIN.
      placeOfSupply: i.customerGstin?.length === 15 ? stateLabel(i.customerGstin.slice(0, 2)) : stateLabel(c?.stateCode, c?.gstin, c?.state),
      qty: i.items.reduce((s, x) => s + x.quantity, 0),
      taxable: i.subTotal,
      cgst: i.totalCgst,
      sgst: i.totalSgst,
      igst: i.totalIgst,
      roundOff: i.roundOff,
      total: i.grandTotal,
      paymentMode: i.paymentMode,
      status: i.status,
      source: i.source,
    };
  });
}

export async function purchaseRegister(tenantId: string, from: string, to: string) {
  const bills = await prisma.purchaseBill.findMany({ where: { tenantId, date: { gte: from, lte: to } }, include: { items: true }, orderBy: [{ date: 'asc' }, { billNumber: 'asc' }] });
  return bills.map((b) => ({
    id: b.id,
    date: b.date,
    billNumber: b.billNumber,
    supplierInvoiceNo: b.supplierInvoiceNo,
    supplierName: b.supplierName,
    gstin: b.supplierGstin || '',
    qty: b.items.reduce((s, x) => s + x.quantity, 0),
    taxable: b.subTotal,
    cgst: b.totalCgst,
    sgst: b.totalSgst,
    igst: b.totalIgst,
    roundOff: b.roundOff,
    total: b.grandTotal,
    paid: b.paidAmount,
    itcEligible: b.itcEligible,
    status: b.status,
  }));
}

export async function expenseRegister(tenantId: string, from: string, to: string) {
  const rows = await prisma.expenseEntry.findMany({ where: { tenantId, date: { gte: from, lte: to } }, orderBy: [{ date: 'asc' }, { entryNumber: 'asc' }] });
  const heads = new Map<string, number>();
  rows.filter((r) => !r.cancelled).forEach((r) => heads.set(r.headName, r2((heads.get(r.headName) || 0) + r.totalAmount)));
  return { rows, byHead: [...heads.entries()].map(([head, amount]) => ({ head, amount })).sort((a, b) => b.amount - a.amount) };
}

export async function receiptsRegister(tenantId: string, from: string, to: string) {
  return prisma.payment.findMany({ where: { tenantId, status: 'VERIFIED', paymentDate: { gte: from, lte: to } }, orderBy: [{ paymentDate: 'asc' }, { paymentNumber: 'asc' }] });
}

// ───────────────────────── GST returns ─────────────────────────

export async function gstr1(tenantId: string, from: string, to: string) {
  const company = await getSetting(tenantId, 'company');
  const invoices = await prisma.invoice.findMany({ where: { tenantId, date: { gte: from, lte: to } }, include: { items: true }, orderBy: [{ date: 'asc' }, { invoiceNumber: 'asc' }] });
  const customers = await prisma.customer.findMany({ where: { tenantId, id: { in: [...new Set(invoices.map((i) => i.customerId))] } }, select: { id: true, stateCode: true, state: true } });
  const cust = new Map(customers.map((c) => [c.id, c]));
  const live = invoices.filter((i) => i.status !== 'Cancelled');

  const b2b = live
    .filter((i) => i.customerGstin && i.customerGstin.length === 15)
    .flatMap((i) => {
      const rates = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
      i.items.forEach((it) => {
        const r = rates.get(it.taxRate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        r.taxable += it.taxableAmount;
        r.cgst += it.cgstAmount;
        r.sgst += it.sgstAmount;
        r.igst += it.igstAmount;
        rates.set(it.taxRate, r);
      });
      return [...rates.entries()].map(([rate, t]) => ({
        gstin: i.customerGstin!,
        receiverName: i.customerName,
        invoiceNumber: i.invoiceNumber,
        date: i.date,
        invoiceValue: i.grandTotal,
        placeOfSupply: stateLabel(i.customerGstin!.slice(0, 2)),
        reverseCharge: 'N',
        rate,
        taxable: r2(t.taxable),
        cgst: r2(t.cgst),
        sgst: r2(t.sgst),
        igst: r2(t.igst),
      }));
    });

  // B2C: unregistered buyers, summarised by place of supply and rate.
  const b2cMap = new Map<string, { placeOfSupply: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number; type: string }>();
  live
    .filter((i) => !(i.customerGstin && i.customerGstin.length === 15))
    .forEach((i) => {
      const c = cust.get(i.customerId);
      const pos = stateLabel(c?.stateCode || company.stateCode, null, c?.state);
      i.items.forEach((it) => {
        const large = i.isIgst && i.grandTotal > 250000;
        const key = `${pos}|${it.taxRate}|${large}`;
        const r = b2cMap.get(key) || { placeOfSupply: pos, rate: it.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, type: large ? 'B2CL' : 'B2CS' };
        r.taxable += it.taxableAmount;
        r.cgst += it.cgstAmount;
        r.sgst += it.sgstAmount;
        r.igst += it.igstAmount;
        b2cMap.set(key, r);
      });
    });
  // Credit notes of the period (GSTR-1 table 9B for registered buyers; unregistered ones reduce B2C).
  const notes = await prisma.creditNote.findMany({ where: { tenantId, date: { gte: from, lte: to }, status: 'Active' }, include: { items: true }, orderBy: [{ date: 'asc' }, { noteNumber: 'asc' }] });
  const noteCustomers = await prisma.customer.findMany({ where: { tenantId, id: { in: [...new Set(notes.map((n) => n.customerId))] } }, select: { id: true, stateCode: true, state: true } });
  const noteCust = new Map(noteCustomers.map((c) => [c.id, c]));
  const cdnr = notes
    .filter((n) => n.customerGstin && n.customerGstin.length === 15)
    .flatMap((n) => {
      const rates = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
      n.items.forEach((it) => {
        const r = rates.get(it.taxRate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        r.taxable += it.taxableAmount;
        r.cgst += it.cgstAmount;
        r.sgst += it.sgstAmount;
        r.igst += it.igstAmount;
        rates.set(it.taxRate, r);
      });
      return [...rates.entries()].map(([rate, t]) => ({ gstin: n.customerGstin!, receiverName: n.customerName, noteNumber: n.noteNumber, noteDate: n.date, noteType: 'C', invoiceNumber: n.invoiceNumber || '', invoiceDate: n.invoiceDate || '', noteValue: n.grandTotal, placeOfSupply: stateLabel(n.customerGstin!.slice(0, 2)), rate, taxable: r2(t.taxable), cgst: r2(t.cgst), sgst: r2(t.sgst), igst: r2(t.igst) }));
    });
  notes
    .filter((n) => !(n.customerGstin && n.customerGstin.length === 15))
    .forEach((n) => {
      const c = noteCust.get(n.customerId);
      const pos = stateLabel(c?.stateCode || company.stateCode, null, c?.state);
      n.items.forEach((it) => {
        const key = `${pos}|${it.taxRate}|false`;
        const r = b2cMap.get(key) || { placeOfSupply: pos, rate: it.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, type: 'B2CS' };
        r.taxable -= it.taxableAmount;
        r.cgst -= it.cgstAmount;
        r.sgst -= it.sgstAmount;
        r.igst -= it.igstAmount;
        b2cMap.set(key, r);
      });
    });
  const b2c = [...b2cMap.values()].map((r) => ({ ...r, taxable: r2(r.taxable), cgst: r2(r.cgst), sgst: r2(r.sgst), igst: r2(r.igst) }));

  const hsnMap = new Map<string, { hsn: string; description: string; uqc: string; qty: number; rate: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }>();
  live.forEach((i) =>
    i.items.forEach((it) => {
      const key = `${it.hsnCode}|${it.taxRate}`;
      const r = hsnMap.get(key) || { hsn: it.hsnCode, description: it.productName, uqc: (it.unit || 'NOS').toUpperCase() === 'PCS' ? 'PCS' : (it.unit || 'NOS').toUpperCase(), qty: 0, rate: it.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      r.qty += it.quantity;
      r.taxable += it.taxableAmount;
      r.cgst += it.cgstAmount;
      r.sgst += it.sgstAmount;
      r.igst += it.igstAmount;
      r.total += it.totalAmount;
      hsnMap.set(key, r);
    })
  );
  notes.forEach((n) =>
    n.items.forEach((it) => {
      const key = `${it.hsnCode}|${it.taxRate}`;
      const r = hsnMap.get(key) || { hsn: it.hsnCode, description: it.productName, uqc: (it.unit || 'NOS').toUpperCase(), qty: 0, rate: it.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      if (n.stockReturned) r.qty -= it.quantity;
      r.taxable -= it.taxableAmount;
      r.cgst -= it.cgstAmount;
      r.sgst -= it.sgstAmount;
      r.igst -= it.igstAmount;
      r.total -= it.totalAmount;
      hsnMap.set(key, r);
    })
  );
  const hsn = [...hsnMap.values()].map((r) => ({ ...r, taxable: r2(r.taxable), cgst: r2(r.cgst), sgst: r2(r.sgst), igst: r2(r.igst), total: r2(r.total) }));

  const numbers = invoices.map((i) => i.invoiceNumber).sort();
  const docs = { from: numbers[0] || '', to: numbers[numbers.length - 1] || '', total: invoices.length, cancelled: invoices.length - live.length };
  const sum = (xs: { taxable: number; cgst: number; sgst: number; igst: number }[]) => ({
    taxable: r2(xs.reduce((s, x) => s + x.taxable, 0)),
    cgst: r2(xs.reduce((s, x) => s + x.cgst, 0)),
    sgst: r2(xs.reduce((s, x) => s + x.sgst, 0)),
    igst: r2(xs.reduce((s, x) => s + x.igst, 0)),
  });
  const cdnrTotal = sum(cdnr);
  const gross = sum([...b2b, ...b2c]);
  // "all" is the net outward supply: B2B + B2C (already net of unregistered notes) − registered credit notes.
  const all = { taxable: r2(gross.taxable - cdnrTotal.taxable), cgst: r2(gross.cgst - cdnrTotal.cgst), sgst: r2(gross.sgst - cdnrTotal.sgst), igst: r2(gross.igst - cdnrTotal.igst) };
  return { from, to, gstin: company.gstin, b2b, b2c, cdnr, hsn, docs, creditNotes: { count: notes.length, from: notes[0]?.noteNumber || '', to: notes[notes.length - 1]?.noteNumber || '' }, totals: { b2b: sum(b2b), b2c: sum(b2c), cdnr: cdnrTotal, all } };
}

export async function gstr3b(tenantId: string, from: string, to: string) {
  const [g1, bills, expenses, debitNotes] = await Promise.all([
    gstr1(tenantId, from, to),
    prisma.purchaseBill.findMany({ where: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } } }),
    prisma.expenseEntry.findMany({ where: { tenantId, date: { gte: from, lte: to }, cancelled: false, gstAmount: { gt: 0 }, supplierGstin: { not: null } } }),
    prisma.debitNote.findMany({ where: { tenantId, date: { gte: from, lte: to }, status: 'Active', itcReversed: true } }),
  ]);
  const out = g1.totals.all;
  const itc = { igst: 0, cgst: 0, sgst: 0 };
  const ineligible = { igst: 0, cgst: 0, sgst: 0 };
  bills.forEach((b) => {
    const t = b.itcEligible ? itc : ineligible;
    t.igst += b.totalIgst;
    t.cgst += b.totalCgst;
    t.sgst += b.totalSgst;
  });
  expenses.forEach((x) => {
    if (x.isIgst) itc.igst += x.gstAmount;
    else {
      itc.cgst += x.gstAmount / 2;
      itc.sgst += x.gstAmount / 2;
    }
  });
  // Debit notes (goods returned to the supplier) take their ITC back out.
  const reversed = { igst: 0, cgst: 0, sgst: 0 };
  debitNotes.forEach((n) => {
    reversed.igst += n.totalIgst;
    reversed.cgst += n.totalCgst;
    reversed.sgst += n.totalSgst;
  });
  (Object.keys(itc) as (keyof typeof itc)[]).forEach((k) => {
    itc[k] = r2(itc[k] - reversed[k]);
    reversed[k] = r2(reversed[k]);
    ineligible[k] = r2(ineligible[k]);
  });
  // Cross-utilisation in the statutory order: IGST credit → IGST, CGST, SGST; CGST ↔ SGST never.
  let igstCredit = itc.igst;
  const pay = { igst: out.igst, cgst: out.cgst, sgst: out.sgst };
  const setOffIgst = (k: 'igst' | 'cgst' | 'sgst') => {
    const used = Math.min(igstCredit, pay[k]);
    pay[k] = r2(pay[k] - used);
    igstCredit = r2(igstCredit - used);
  };
  setOffIgst('igst');
  setOffIgst('cgst');
  setOffIgst('sgst');
  const cgstUse = Math.min(itc.cgst, pay.cgst);
  const sgstUse = Math.min(itc.sgst, pay.sgst);
  pay.cgst = r2(pay.cgst - cgstUse);
  pay.sgst = r2(pay.sgst - sgstUse);
  return {
    from,
    to,
    outward: { taxable: out.taxable, igst: out.igst, cgst: out.cgst, sgst: out.sgst, cess: 0 },
    itc,
    ineligibleItc: ineligible,
    itcReversedByDebitNotes: reversed,
    payableInCash: pay,
    carryForward: { igst: igstCredit, cgst: r2(itc.cgst - cgstUse), sgst: r2(itc.sgst - sgstUse) },
    totalPayable: r2(pay.igst + pay.cgst + pay.sgst),
  };
}

// ───────────────────────── Parties ─────────────────────────

/** Debtors with FIFO ageing of the open amount as of `asOf`. */
export async function receivablesAgeing(tenantId: string, asOf: string) {
  const entries = await prisma.ledgerEntry.findMany({ where: { tenantId, ledgerType: 'CUSTOMER', date: { lte: asOf } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] });
  const byCustomer = new Map<string, typeof entries>();
  entries.forEach((e) => {
    if (!e.customerId) return;
    const list = byCustomer.get(e.customerId) || [];
    list.push(e);
    byCustomer.set(e.customerId, list);
  });
  const customers = await prisma.customer.findMany({ where: { tenantId, id: { in: [...byCustomer.keys()] } }, select: { id: true, name: true, shortName: true, customerCode: true, phone: true, creditLimit: true } });
  const asOfTime = new Date(`${asOf}T00:00:00Z`).getTime();
  return customers
    .map((c) => {
      const list = byCustomer.get(c.id) || [];
      const debits = list.filter((e) => e.debit > 0).map((e) => ({ date: e.date, open: e.debit }));
      let credit = list.reduce((s, e) => s + e.credit, 0);
      for (const d of debits) {
        const used = Math.min(d.open, credit);
        d.open -= used;
        credit -= used;
      }
      const buckets = { d0_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
      debits.forEach((d) => {
        if (d.open <= 0.004) return;
        const age = Math.floor((asOfTime - new Date(`${d.date}T00:00:00Z`).getTime()) / 86_400_000);
        if (age <= 30) buckets.d0_30 += d.open;
        else if (age <= 60) buckets.d31_60 += d.open;
        else if (age <= 90) buckets.d61_90 += d.open;
        else buckets.d90 += d.open;
      });
      const balance = r2(list.reduce((s, e) => s + e.debit - e.credit, 0));
      return { customerId: c.id, name: c.name, shortName: c.shortName, code: c.customerCode, phone: c.phone, creditLimit: c.creditLimit, balance, advance: balance < 0 ? -balance : 0, d0_30: r2(buckets.d0_30), d31_60: r2(buckets.d31_60), d61_90: r2(buckets.d61_90), d90: r2(buckets.d90) };
    })
    .filter((r) => r.balance !== 0)
    .sort((a, b) => b.balance - a.balance);
}

/** Opening, period debit/credit and closing for every party ledger (debtors and creditors). */
export async function partySummary(tenantId: string, from: string, to: string) {
  const rows = await accountBalances(tenantId, from, to);
  return rows.filter((r) => (r.groupName === 'Sundry Debtors' || r.groupName === 'Sundry Creditors') && (r.opening || r.debit || r.credit || r.closing));
}

export async function payables(tenantId: string, asOf: string) {
  const books = await getSetting(tenantId, 'books');
  const rows = await accountBalances(tenantId, fyStart(asOf, books.fyStartMonth), asOf);
  const bills = await prisma.purchaseBill.findMany({ where: { tenantId, status: { in: ['Unpaid', 'Partial'] }, date: { lte: asOf } }, orderBy: { date: 'asc' } });
  return rows
    .filter((r) => r.groupName === 'Sundry Creditors' && r.closing !== 0)
    .map((r) => ({ ...r, payable: r2(-r.closing), openBills: bills.filter((b) => b.supplierId === r.partyId).map((b) => ({ billNumber: b.billNumber, supplierInvoiceNo: b.supplierInvoiceNo, date: b.date, dueDate: b.dueDate, balance: r2(b.grandTotal - b.paidAmount) })) }));
}

export async function cylinderHoldings(tenantId: string) {
  const [holdings, deposits] = await Promise.all([
    prisma.customerCylinderBalance.findMany({ where: { tenantId, currentBalance: { not: 0 } }, include: { customer: { select: { name: true, customerCode: true } } }, orderBy: { currentBalance: 'desc' } }),
    prisma.cylinderVoucher.findMany({ where: { tenantId }, include: { customer: { select: { name: true } } }, orderBy: { issueDate: 'asc' } }),
  ]);
  return {
    holdings: holdings.map((h) => ({ customer: h.customer.name, code: h.customer.customerCode, product: h.productName, qty: h.currentBalance })),
    deposits: deposits.map((d) => ({ voucherNumber: d.voucherNumber, type: d.voucherType, customer: d.customer.name, product: d.productName, cylinders: d.cylinderQty, regulators: d.regulatorQty, deposit: d.depositAmount, issueDate: d.issueDate, status: d.status })),
  };
}

export async function dayClosings(tenantId: string, from: string, to: string) {
  return prisma.dailyClosing.findMany({ where: { tenantId, date: { gte: from, lte: to } }, orderBy: { date: 'asc' } });
}

// ───────────────────────── Overview ─────────────────────────

export async function booksOverview(tenantId: string, from: string, to: string) {
  const [rows, pl, g3b] = await Promise.all([accountBalances(tenantId, from, to), profitAndLoss(tenantId, from, to), gstr3b(tenantId, from, to)]);
  const closingOf = (group: string) => r2(rows.filter((r) => r.groupName === group).reduce((s, r) => s + r.closing, 0));
  const movementOf = (group: string) => r2(rows.filter((r) => r.groupName === group).reduce((s, r) => s + r.debit - r.credit, 0));
  const [receipts, expenses] = await Promise.all([
    prisma.payment.aggregate({ where: { tenantId, status: 'VERIFIED', paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.expenseEntry.aggregate({ where: { tenantId, cancelled: false, date: { gte: from, lte: to } }, _sum: { totalAmount: true } }),
  ]);
  return {
    from,
    to,
    sales: pl.totals.sales,
    purchases: pl.totals.purchases,
    expenses: r2(expenses._sum.totalAmount || 0),
    receipts: r2(receipts._sum.amount || 0),
    cashInHand: closingOf('Cash-in-Hand'),
    bank: closingOf('Bank Accounts'),
    receivables: closingOf('Sundry Debtors'),
    payables: r2(-closingOf('Sundry Creditors')),
    gstPayable: g3b.totalPayable,
    grossProfit: pl.grossProfit,
    netProfit: pl.netProfit,
    closingStock: pl.trading.closingStock,
    salesMovement: r2(-movementOf('Sales Accounts')),
  };
}
