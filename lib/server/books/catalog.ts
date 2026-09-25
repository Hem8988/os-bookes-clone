import { prisma } from '@/lib/db';
import { stateLabel } from '@/lib/gst';
import { emptyCylinderAgeing } from '../ownerReport';
import { chequeRegister, vehicleCosts } from '../registers';
import { tdsRegister } from '../tds';
import { budgetVsActual, creditRating, deliveryLeaderboard, godownStock, plantReconciliation, profitability } from './analytics';
import { expenseRegister, gstr1, payables, profitAndLoss, purchaseRegister, receiptsRegister, receivablesAgeing, salesRegister, stockSummary } from './reports';

// Report catalog: every report as { columns, rows } so one screen renders them
// all and one exporter turns any of them into Excel. Money columns are totalled.

export type ColType = 'text' | 'date' | 'money' | 'number' | 'percent';
export interface ReportColumn {
  key: string;
  label: string;
  type?: ColType;
  total?: boolean;
}
export interface TabularReport {
  key: string;
  title: string;
  group: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: number | string; type?: ColType }[];
  note?: string;
}

type Row = Record<string, unknown>;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const m = (key: string, label: string, total = true): ReportColumn => ({ key, label, type: 'money', total });
const n = (key: string, label: string, total = true): ReportColumn => ({ key, label, type: 'number', total });
const t = (key: string, label: string): ReportColumn => ({ key, label });
const d = (key: string, label = 'Date'): ReportColumn => ({ key, label, type: 'date' });
const sumOf = (rows: Row[], key: string) => r2(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));

type Builder = (tenantId: string, from: string, to: string) => Promise<Omit<TabularReport, 'key' | 'title' | 'group' | 'description'>>;

// ───────────────────────── Sales ─────────────────────────

const salesReport: Builder = async (tenantId, from, to) => {
  const rows = (await salesRegister(tenantId, from, to)).map((r) => (r.status === 'Cancelled' ? { ...r, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 } : r));
  return { columns: [d('date'), t('invoiceNumber', 'Invoice'), t('customerName', 'Party'), t('gstin', 'GSTIN'), n('qty', 'Qty'), m('taxable', 'Taxable'), m('cgst', 'CGST'), m('sgst', 'SGST'), m('igst', 'IGST'), m('total', 'Total'), t('paymentMode', 'Mode'), t('status', 'Status')], rows };
};

const salesAndPayments: Builder = async (tenantId, from, to) => {
  const entries = await prisma.ledgerEntry.findMany({ where: { tenantId, ledgerType: 'CUSTOMER', date: { lte: to } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] });
  const by = new Map<string, Row & { name: string }>();
  for (const e of entries) {
    if (!e.customerId) continue;
    const r = by.get(e.customerId) || { name: e.accountName, opening: 0, sales: 0, returns: 0, receipts: 0, refunds: 0, adjustments: 0, closing: 0 };
    const amt = e.debit - e.credit;
    if (e.date < from) r.opening = (r.opening as number) + amt;
    else if (e.entryType === 'INVOICE') r.sales = (r.sales as number) + e.debit;
    else if (e.entryType === 'CREDIT_NOTE') r.returns = (r.returns as number) + e.credit;
    else if (e.entryType === 'PAYMENT') r.receipts = (r.receipts as number) + e.credit - e.debit;
    else if (e.entryType === 'REFUND') r.refunds = (r.refunds as number) + e.debit;
    else if (e.entryType !== 'OPENING') r.adjustments = (r.adjustments as number) + amt;
    else r.opening = (r.opening as number) + amt;
    r.closing = (r.closing as number) + amt;
    by.set(e.customerId, r);
  }
  const rows = [...by.values()].map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v]))).filter((r) => r.opening || r.sales || r.receipts || r.closing);
  return {
    columns: [t('name', 'Customer'), m('opening', 'Opening'), m('sales', 'Sales'), m('returns', 'Returns'), m('receipts', 'Received'), m('refunds', 'Refunds'), m('adjustments', 'Adjustments'), m('closing', 'Closing due')],
    rows,
    summary: [
      { label: 'Billed', value: sumOf(rows, 'sales'), type: 'money' },
      { label: 'Received', value: sumOf(rows, 'receipts'), type: 'money' },
      { label: 'Collection %', value: sumOf(rows, 'sales') ? r2((sumOf(rows, 'receipts') / sumOf(rows, 'sales')) * 100) : 0, type: 'percent' },
      { label: 'Due at end', value: sumOf(rows, 'closing'), type: 'money' },
    ],
  };
};

const salesItems: Builder = async (tenantId, from, to) => {
  const [items, notes] = await Promise.all([
    prisma.invoiceItem.findMany({ where: { invoice: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } } } }),
    prisma.creditNoteItem.findMany({ where: { note: { tenantId, date: { gte: from, lte: to }, status: 'Active' } }, include: { note: { select: { stockReturned: true } } } }),
  ]);
  const by = new Map<string, Row>();
  const key = (p: string | null, name: string) => p || name;
  for (const i of items) {
    const r = by.get(key(i.productId, i.productName)) || { product: i.productName, hsn: i.hsnCode, qty: 0, returnedQty: 0, taxable: 0, tax: 0, total: 0, returns: 0 };
    r.qty = (r.qty as number) + i.quantity;
    r.taxable = (r.taxable as number) + i.taxableAmount;
    r.tax = (r.tax as number) + i.cgstAmount + i.sgstAmount + i.igstAmount;
    r.total = (r.total as number) + i.totalAmount;
    by.set(key(i.productId, i.productName), r);
  }
  for (const i of notes) {
    const r = by.get(key(i.productId, i.productName)) || { product: i.productName, hsn: i.hsnCode, qty: 0, returnedQty: 0, taxable: 0, tax: 0, total: 0, returns: 0 };
    if (i.note.stockReturned) r.returnedQty = (r.returnedQty as number) + i.quantity;
    r.returns = (r.returns as number) + i.totalAmount;
    by.set(key(i.productId, i.productName), r);
  }
  const rows = [...by.values()].map((r) => ({ ...r, netQty: (r.qty as number) - (r.returnedQty as number), netValue: r2((r.total as number) - (r.returns as number)), avgRate: (r.qty as number) ? r2((r.total as number) / (r.qty as number)) : 0, taxable: r2(r.taxable as number), tax: r2(r.tax as number), total: r2(r.total as number), returns: r2(r.returns as number) }));
  return { columns: [t('product', 'Item'), t('hsn', 'HSN'), n('qty', 'Sold qty'), n('returnedQty', 'Returned qty'), n('netQty', 'Net qty'), m('avgRate', 'Avg rate (incl. GST)', false), m('taxable', 'Taxable'), m('tax', 'GST'), m('total', 'Sales value'), m('returns', 'Returns'), m('netValue', 'Net sales')], rows };
};

/** Rate-wise GST (5%, 12%, 18% …) for sales or purchases. */
const gstRateWise = (kind: 'sales' | 'purchase'): Builder => async (tenantId, from, to) => {
  const by = new Map<number, Row>();
  const add = (rate: number, taxable: number, cgst: number, sgst: number, igst: number, sign = 1) => {
    const r = by.get(rate) || { rate: `${rate}%`, rateNum: rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    r.taxable = (r.taxable as number) + sign * taxable;
    r.cgst = (r.cgst as number) + sign * cgst;
    r.sgst = (r.sgst as number) + sign * sgst;
    r.igst = (r.igst as number) + sign * igst;
    by.set(rate, r);
  };
  if (kind === 'sales') {
    const [items, notes] = await Promise.all([
      prisma.invoiceItem.findMany({ where: { invoice: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } } } }),
      prisma.creditNoteItem.findMany({ where: { note: { tenantId, date: { gte: from, lte: to }, status: 'Active' } } }),
    ]);
    items.forEach((i) => add(i.taxRate, i.taxableAmount, i.cgstAmount, i.sgstAmount, i.igstAmount));
    notes.forEach((i) => add(i.taxRate, i.taxableAmount, i.cgstAmount, i.sgstAmount, i.igstAmount, -1));
  } else {
    const [items, notes, expenses] = await Promise.all([
      prisma.purchaseBillItem.findMany({ where: { bill: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } } } }),
      prisma.debitNoteItem.findMany({ where: { note: { tenantId, date: { gte: from, lte: to }, status: 'Active' } } }),
      prisma.expenseEntry.findMany({ where: { tenantId, date: { gte: from, lte: to }, cancelled: false, gstRate: { gt: 0 } } }),
    ]);
    items.forEach((i) => add(i.taxRate, i.taxableAmount, i.cgstAmount, i.sgstAmount, i.igstAmount));
    notes.forEach((i) => add(i.taxRate, i.taxableAmount, i.cgstAmount, i.sgstAmount, i.igstAmount, -1));
    expenses.forEach((x) => add(x.gstRate, x.amount, x.isIgst ? 0 : x.gstAmount / 2, x.isIgst ? 0 : x.gstAmount / 2, x.isIgst ? x.gstAmount : 0));
  }
  const rows = [...by.values()]
    .sort((a, b) => (a.rateNum as number) - (b.rateNum as number))
    .map(({ rateNum, ...r }) => {
      void rateNum;
      const taxable = r2(r.taxable as number);
      const tax = r2((r.cgst as number) + (r.sgst as number) + (r.igst as number));
      return { ...r, taxable, cgst: r2(r.cgst as number), sgst: r2(r.sgst as number), igst: r2(r.igst as number), tax, total: r2(taxable + tax) };
    });
  return { columns: [t('rate', 'GST rate'), m('taxable', 'Taxable value'), m('cgst', 'CGST'), m('sgst', 'SGST'), m('igst', 'IGST'), m('tax', 'Total GST'), m('total', 'Value incl. GST')], rows, note: kind === 'sales' ? 'Net of credit notes.' : 'Purchase bills + expenses with GST, net of debit notes.' };
};

const customerOrders: Builder = async (tenantId, from, to) => {
  const orders = await prisma.order.findMany({ where: { tenantId, requestedDeliveryDate: { gte: from, lte: to } }, include: { items: true }, orderBy: { createdAt: 'asc' } });
  const by = new Map<string, Row>();
  for (const o of orders) {
    const r = by.get(o.customerId) || { customer: o.customerName, orders: 0, cylinders: 0, value: 0, completed: 0, pending: 0, cancelled: 0 };
    r.orders = (r.orders as number) + 1;
    r.cylinders = (r.cylinders as number) + o.items.reduce((s, i) => s + i.orderedQty, 0);
    r.value = (r.value as number) + o.totalAmount;
    if (o.status === 'CANCELLED' || o.status === 'REJECTED') r.cancelled = (r.cancelled as number) + 1;
    else if (['DELIVERED', 'PENDING_VERIFICATION', 'VERIFIED', 'INVOICED', 'LEDGER_POSTED', 'COMPLETED'].includes(o.status)) r.completed = (r.completed as number) + 1;
    else r.pending = (r.pending as number) + 1;
    by.set(o.customerId, r);
  }
  const rows = [...by.values()].map((r) => ({ ...r, value: r2(r.value as number), avgOrder: (r.orders as number) ? r2((r.value as number) / (r.orders as number)) : 0 })).sort((a, b) => (b.value as number) - (a.value as number));
  return {
    columns: [t('customer', 'Customer'), n('orders', 'Orders'), n('cylinders', 'Cylinders'), m('value', 'Order value'), m('avgOrder', 'Avg order', false), n('completed', 'Delivered'), n('pending', 'Pending'), n('cancelled', 'Cancelled / rejected')],
    rows,
    summary: [
      { label: 'Orders', value: orders.length, type: 'number' },
      { label: 'Delivered', value: sumOf(rows, 'completed'), type: 'number' },
      { label: 'Pending', value: sumOf(rows, 'pending'), type: 'number' },
      { label: 'Order value', value: sumOf(rows, 'value'), type: 'money' },
    ],
  };
};

const salesPayments: Builder = async (tenantId, from, to) => {
  const rows = (await receiptsRegister(tenantId, from, to)).map((p) => ({ ...p, ref: p.transactionId || (p.chequeNumber ? `Chq ${p.chequeNumber}` : '') }));
  const byMode = new Map<string, number>();
  rows.forEach((r) => byMode.set(r.mode, (byMode.get(r.mode) || 0) + r.amount));
  return { columns: [d('paymentDate'), t('paymentNumber', 'Receipt'), t('customerName', 'Party'), t('mode', 'Mode'), t('ref', 'Txn / cheque'), m('amount', 'Amount'), t('source', 'Source'), t('verifiedBy', 'Verified by')], rows, summary: [...byMode.entries()].map(([k, v]) => ({ label: k, value: r2(v), type: 'money' as const })) };
};

// ───────────────────────── Returns ─────────────────────────

const salesReturns: Builder = async (tenantId, from, to) => {
  const notes = await prisma.creditNote.findMany({ where: { tenantId, date: { gte: from, lte: to } }, include: { items: true }, orderBy: [{ date: 'asc' }, { noteNumber: 'asc' }] });
  const rows = notes.map((x) => {
    const live = x.status !== 'Cancelled';
    return { date: x.date, noteNumber: x.noteNumber, customer: x.customerName, gstin: x.customerGstin || '', invoice: x.invoiceNumber || '', reason: x.reason.replace('_', ' '), qty: x.items.reduce((s, i) => s + i.quantity, 0), taxable: live ? x.subTotal : 0, gst: live ? r2(x.totalCgst + x.totalSgst + x.totalIgst) : 0, total: live ? x.grandTotal : 0, refund: live ? x.refundAmount : 0, stock: x.stockReturned ? 'Returned' : '—', status: x.status };
  });
  return { columns: [d('date'), t('noteNumber', 'Credit note'), t('customer', 'Customer'), t('gstin', 'GSTIN'), t('invoice', 'Against invoice'), t('reason', 'Reason'), n('qty', 'Qty'), m('taxable', 'Taxable'), m('gst', 'GST'), m('total', 'Total'), m('refund', 'Refunded'), t('stock', 'Cylinders'), t('status', 'Status')], rows };
};

const purchaseReturns: Builder = async (tenantId, from, to) => {
  const notes = await prisma.debitNote.findMany({ where: { tenantId, date: { gte: from, lte: to } }, include: { items: true }, orderBy: [{ date: 'asc' }, { noteNumber: 'asc' }] });
  const rows = notes.map((x) => {
    const live = x.status !== 'Cancelled';
    return { date: x.date, noteNumber: x.noteNumber, supplier: x.supplierName, gstin: x.supplierGstin || '', bill: x.supplierInvoiceNo ? `${x.billNumber} / ${x.supplierInvoiceNo}` : '', reason: x.reason.replace('_', ' '), qty: x.items.reduce((s, i) => s + i.quantity, 0), taxable: live ? x.subTotal : 0, gst: live ? r2(x.totalCgst + x.totalSgst + x.totalIgst) : 0, total: live ? x.grandTotal : 0, itc: x.itcReversed ? 'Reversed' : 'Kept', stock: x.stockReturned ? 'Returned' : '—', status: x.status };
  });
  return { columns: [d('date'), t('noteNumber', 'Debit note'), t('supplier', 'Supplier'), t('gstin', 'GSTIN'), t('bill', 'Against bill'), t('reason', 'Reason'), n('qty', 'Qty'), m('taxable', 'Taxable'), m('gst', 'GST'), m('total', 'Total'), t('itc', 'ITC'), t('stock', 'Cylinders'), t('status', 'Status')], rows };
};

const returnItems: Builder = async (tenantId, from, to) => {
  const [cn, dn] = await Promise.all([
    prisma.creditNoteItem.findMany({ where: { note: { tenantId, date: { gte: from, lte: to }, status: 'Active' } }, include: { note: true } }),
    prisma.debitNoteItem.findMany({ where: { note: { tenantId, date: { gte: from, lte: to }, status: 'Active' } }, include: { note: true } }),
  ]);
  const rows = [
    ...cn.map((i) => ({ date: i.note.date, kind: 'Sales return', note: i.note.noteNumber, party: i.note.customerName, item: i.productName, qty: i.quantity, rate: i.rate, taxable: i.taxableAmount, gst: r2(i.cgstAmount + i.sgstAmount + i.igstAmount), total: i.totalAmount })),
    ...dn.map((i) => ({ date: i.note.date, kind: 'Purchase return', note: i.note.noteNumber, party: i.note.supplierName, item: i.description, qty: i.quantity, rate: i.rate, taxable: i.taxableAmount, gst: r2(i.cgstAmount + i.sgstAmount + i.igstAmount), total: i.totalAmount })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return { columns: [d('date'), t('kind', 'Type'), t('note', 'Note'), t('party', 'Party'), t('item', 'Item'), n('qty', 'Qty'), m('rate', 'Rate', false), m('taxable', 'Taxable'), m('gst', 'GST'), m('total', 'Total')], rows };
};

const salesReturnPayments: Builder = async (tenantId, from, to) => {
  const notes = await prisma.creditNote.findMany({ where: { tenantId, date: { gte: from, lte: to }, refundAmount: { gt: 0 } }, orderBy: { date: 'asc' } });
  const accounts = await prisma.ledgerAccount.findMany({ where: { tenantId, id: { in: notes.map((x) => x.refundAccountId || '').filter(Boolean) } }, select: { id: true, name: true } });
  const name = new Map(accounts.map((a) => [a.id, a.name]));
  const rows = notes.map((x) => ({ date: x.date, noteNumber: x.noteNumber, customer: x.customerName, mode: x.refundMode, paidFrom: name.get(x.refundAccountId || '') || '', noteTotal: x.grandTotal, refund: x.refundAmount, status: x.status }));
  return { columns: [d('date'), t('noteNumber', 'Credit note'), t('customer', 'Customer'), t('mode', 'Mode'), t('paidFrom', 'Paid from'), m('noteTotal', 'Credit note'), m('refund', 'Refunded'), t('status', 'Status')], rows };
};

// ───────────────────────── Purchases ─────────────────────────

const purchaseReport: Builder = async (tenantId, from, to) => {
  const rows = (await purchaseRegister(tenantId, from, to)).map((r) => (r.status === 'Cancelled' ? { ...r, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, paid: 0 } : { ...r, due: r2(r.total - r.paid) }));
  return { columns: [d('date'), t('billNumber', 'Our no.'), t('supplierInvoiceNo', 'Supplier bill'), t('supplierName', 'Supplier'), t('gstin', 'GSTIN'), n('qty', 'Qty'), m('taxable', 'Taxable'), m('cgst', 'CGST'), m('sgst', 'SGST'), m('igst', 'IGST'), m('total', 'Total'), m('paid', 'Paid'), m('due', 'Due'), t('status', 'Status')], rows };
};

const gstr2: Builder = async (tenantId, from, to) => {
  const [bills, notes, expenses] = await Promise.all([
    prisma.purchaseBill.findMany({ where: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } }, include: { items: true }, orderBy: [{ date: 'asc' }] }),
    prisma.debitNote.findMany({ where: { tenantId, date: { gte: from, lte: to }, status: 'Active' }, include: { items: true } }),
    prisma.expenseEntry.findMany({ where: { tenantId, date: { gte: from, lte: to }, cancelled: false, gstAmount: { gt: 0 } }, orderBy: { date: 'asc' } }),
  ]);
  const rows: Row[] = [];
  const perRate = <I extends { taxRate: number; taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number }>(items: I[]) => {
    const map = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
    items.forEach((i) => {
      const r = map.get(i.taxRate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      r.taxable += i.taxableAmount;
      r.cgst += i.cgstAmount;
      r.sgst += i.sgstAmount;
      r.igst += i.igstAmount;
      map.set(i.taxRate, r);
    });
    return [...map.entries()];
  };
  for (const b of bills) {
    for (const [rate, x] of perRate(b.items)) {
      rows.push({ type: 'B2B bill', gstin: b.supplierGstin || 'Unregistered', supplier: b.supplierName, docNumber: b.supplierInvoiceNo, date: b.date, docValue: b.grandTotal, pos: stateLabel(b.supplierGstin?.slice(0, 2) || null), rate: `${rate}%`, taxable: r2(x.taxable), igst: r2(x.igst), cgst: r2(x.cgst), sgst: r2(x.sgst), itc: b.itcEligible ? 'Eligible' : 'Ineligible' });
    }
  }
  for (const nt of notes) {
    for (const [rate, x] of perRate(nt.items)) {
      rows.push({ type: 'Debit note', gstin: nt.supplierGstin || 'Unregistered', supplier: nt.supplierName, docNumber: nt.noteNumber, date: nt.date, docValue: -nt.grandTotal, pos: stateLabel(nt.supplierGstin?.slice(0, 2) || null), rate: `${rate}%`, taxable: -r2(x.taxable), igst: -r2(x.igst), cgst: -r2(x.cgst), sgst: -r2(x.sgst), itc: nt.itcReversed ? 'Reversed' : 'Kept' });
    }
  }
  for (const x of expenses) {
    rows.push({ type: 'Expense', gstin: x.supplierGstin || 'Unregistered', supplier: x.supplierName || x.headName, docNumber: x.billNumber || x.entryNumber, date: x.date, docValue: x.totalAmount, pos: stateLabel(x.supplierGstin?.slice(0, 2) || null), rate: `${x.gstRate}%`, taxable: x.amount, igst: x.isIgst ? x.gstAmount : 0, cgst: x.isIgst ? 0 : r2(x.gstAmount / 2), sgst: x.isIgst ? 0 : r2(x.gstAmount - x.gstAmount / 2), itc: x.supplierGstin ? 'Eligible' : 'No GSTIN' });
  }
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const eligible = rows.filter((r) => r.itc === 'Eligible' || r.itc === 'Reversed');
  return {
    columns: [t('type', 'Type'), t('gstin', 'Supplier GSTIN'), t('supplier', 'Supplier'), t('docNumber', 'Invoice / note no.'), d('date'), m('docValue', 'Value', false), t('pos', 'Place of supply'), t('rate', 'Rate'), m('taxable', 'Taxable'), m('igst', 'IGST'), m('cgst', 'CGST'), m('sgst', 'SGST'), t('itc', 'ITC')],
    rows,
    summary: [
      { label: 'Eligible ITC · IGST', value: sumOf(eligible, 'igst'), type: 'money' },
      { label: 'CGST', value: sumOf(eligible, 'cgst'), type: 'money' },
      { label: 'SGST', value: sumOf(eligible, 'sgst'), type: 'money' },
    ],
    note: 'Inward supplies (GSTR-2 view). Match it with GSTR-2B from the GST portal before claiming ITC.',
  };
};

const supplierItems: Builder = async (tenantId, from, to) => {
  const items = await prisma.purchaseBillItem.findMany({ where: { bill: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } } }, include: { bill: { select: { supplierName: true } } } });
  const by = new Map<string, Row>();
  for (const i of items) {
    const k = `${i.bill.supplierName}|${i.productId || i.description}`;
    const r = by.get(k) || { supplier: i.bill.supplierName, item: i.description, hsn: i.hsnCode, qty: 0, taxable: 0, tax: 0, total: 0, bills: 0 };
    r.qty = (r.qty as number) + i.quantity;
    r.taxable = (r.taxable as number) + i.taxableAmount;
    r.tax = (r.tax as number) + i.cgstAmount + i.sgstAmount + i.igstAmount;
    r.total = (r.total as number) + i.totalAmount;
    r.bills = (r.bills as number) + 1;
    by.set(k, r);
  }
  const rows = [...by.values()].map((r) => ({ ...r, taxable: r2(r.taxable as number), tax: r2(r.tax as number), total: r2(r.total as number), avgRate: (r.qty as number) ? r2((r.taxable as number) / (r.qty as number)) : 0 })).sort((a, b) => String((a as Row).supplier).localeCompare(String((b as Row).supplier)));
  return { columns: [t('supplier', 'Supplier'), t('item', 'Item'), t('hsn', 'HSN'), n('bills', 'Bill lines'), n('qty', 'Qty'), m('avgRate', 'Avg rate (excl. GST)', false), m('taxable', 'Taxable'), m('tax', 'GST'), m('total', 'Total')], rows };
};

const purchasePayments: Builder = async (tenantId, from, to) => {
  const vouchers = await prisma.accountVoucher.findMany({
    where: { tenantId, cancelled: false, voucherType: 'PAYMENT', date: { gte: from, lte: to }, lines: { some: { debit: { gt: 0 }, account: { groupName: 'Sundry Creditors' } } } },
    include: { lines: { include: { account: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
  const billIds = vouchers.map((v) => v.againstBillId).filter(Boolean) as string[];
  const bills = await prisma.purchaseBill.findMany({ where: { id: { in: billIds } }, select: { id: true, billNumber: true, supplierInvoiceNo: true } });
  const bill = new Map(bills.map((b) => [b.id, `${b.billNumber} / ${b.supplierInvoiceNo}`]));
  const rows = vouchers.map((v) => {
    const supplierLine = v.lines.find((l) => l.debit > 0 && l.account.groupName === 'Sundry Creditors');
    const money = v.lines.find((l) => l.credit > 0 && (l.account.groupName === 'Cash-in-Hand' || l.account.groupName === 'Bank Accounts'));
    return { date: v.date, voucher: v.voucherNumber, supplier: supplierLine?.account.name || '', paidFrom: money?.account.name || '', against: v.againstBillId ? bill.get(v.againstBillId) || '' : 'On account', amount: supplierLine?.debit || v.amount, narration: v.narration || '' };
  });
  return { columns: [d('date'), t('voucher', 'Voucher'), t('supplier', 'Supplier'), t('paidFrom', 'Paid from'), t('against', 'Against bill'), m('amount', 'Amount'), t('narration', 'Narration')], rows };
};

// ───────────────────────── Other ─────────────────────────

const expenseReport: Builder = async (tenantId, from, to) => {
  const r = await expenseRegister(tenantId, from, to);
  return { columns: [d('date'), t('entryNumber', 'No.'), t('headName', 'Head'), t('description', 'Description'), t('supplierName', 'Supplier'), m('amount', 'Amount'), m('gstAmount', 'GST'), m('totalAmount', 'Total'), t('paidFrom', 'Paid from')], rows: r.rows.filter((x) => !x.cancelled) as unknown as Row[], summary: r.byHead.slice(0, 6).map((h) => ({ label: h.head, value: h.amount, type: 'money' as const })) };
};

const stockReport: Builder = async (tenantId, from, to) => ({
  columns: [t('productName', 'Product'), n('openingFull', 'Opening full'), n('inward', 'From plant'), n('sold', 'Sold'), n('otherMovement', 'Returns / other'), n('closingFull', 'Closing full'), n('openingEmpty', 'Opening empty'), n('emptyReceived', 'Empty recd'), n('emptyToPlant', 'Empty to plant'), n('closingEmpty', 'Closing empty'), m('rate', 'Cost rate', false), m('closingValue', 'Closing value')],
  rows: (await stockSummary(tenantId, from, to)) as unknown as Row[],
  note: 'Full cylinders valued at weighted average cost.',
});

const emptyCylinders: Builder = async (tenantId, _from, to) => {
  const rows = (await emptyCylinderAgeing(tenantId, to)) as unknown as Row[];
  const overdue = rows.filter((r) => r.overdue);
  return {
    columns: [t('customer', 'Customer'), t('area', 'Area'), t('phone', 'Phone'), t('product', 'Cylinder'), n('holding', 'Holding'), n('onDeposit', 'On deposit (SV)'), n('withoutDeposit', 'Without deposit'), m('deposit', 'Deposit ₹'), d('lastDelivery', 'Last delivery'), d('lastEmptyReturn', 'Last empty back'), n('daysSinceReturn', 'Days', false), t('status', 'Status')],
    rows,
    summary: [
      { label: 'Cylinders with customers', value: sumOf(rows, 'holding'), type: 'number' },
      { label: 'Without deposit', value: sumOf(rows, 'withoutDeposit'), type: 'number' },
      { label: 'Overdue customers', value: new Set(overdue.map((r) => r.customerId)).size, type: 'number' },
      { label: 'Overdue cylinders', value: sumOf(overdue, 'holding'), type: 'number' },
    ],
    note: 'Overdue = holding cylinders with no empty returned for the days set in Settings → Operations.',
  };
};

const outstanding: Builder = async (tenantId, _from, to) => ({
  columns: [t('name', 'Customer'), t('shortName', 'Short name'), t('phone', 'Phone'), m('balance', 'Outstanding'), m('d0_30', '0–30 days'), m('d31_60', '31–60'), m('d61_90', '61–90'), m('d90', '90+'), m('creditLimit', 'Credit limit', false)],
  rows: (await receivablesAgeing(tenantId, to)) as unknown as Row[],
});

const payablesReport: Builder = async (tenantId, _from, to) => ({
  columns: [t('name', 'Supplier'), m('payable', 'Payable'), t('bills', 'Open bills')],
  rows: (await payables(tenantId, to)).map((p) => ({ name: p.name, payable: p.payable, bills: p.openBills.map((b) => `${b.billNumber} (${b.supplierInvoiceNo}) ₹${b.balance.toFixed(2)}`).join('; ') })),
});

const profitLoss: Builder = async (tenantId, from, to) => {
  const p = await profitAndLoss(tenantId, from, to);
  const rows: Row[] = [
    { head: 'Sales (net of returns)', amount: p.totals.sales },
    { head: 'Direct incomes', amount: p.trading.directIncome.reduce((s, x) => s + x.amount, 0) },
    { head: 'Opening stock', amount: -p.trading.openingStock },
    { head: 'Purchases (net of returns)', amount: -p.totals.purchases },
    { head: 'Direct expenses', amount: -p.totals.directExpenses },
    { head: 'Closing stock', amount: p.trading.closingStock },
    { head: 'Gross profit', amount: p.grossProfit },
    { head: 'Indirect incomes', amount: p.totals.indirectIncome },
    ...p.indirectExpenses.map((x) => ({ head: `  ${x.name}`, amount: -x.amount })),
    { head: 'Net profit', amount: p.netProfit },
  ];
  return { columns: [t('head', 'Particulars'), m('amount', 'Amount (₹)', false)], rows, summary: [{ label: 'Gross profit', value: p.grossProfit, type: 'money' }, { label: 'Net profit', value: p.netProfit, type: 'money' }] };
};

const gstr1Summary: Builder = async (tenantId, from, to) => {
  const g = await gstr1(tenantId, from, to);
  const rows: Row[] = [
    { section: '4A · B2B invoices', count: g.b2b.length, ...g.totals.b2b },
    { section: '5/7 · B2C (net of credit notes)', count: g.b2c.length, ...g.totals.b2c },
    { section: '9B · Credit notes (registered)', count: g.cdnr.length, taxable: -g.totals.cdnr.taxable, cgst: -g.totals.cdnr.cgst, sgst: -g.totals.cdnr.sgst, igst: -g.totals.cdnr.igst },
    { section: 'Net outward supply', count: '', ...g.totals.all },
  ];
  return { columns: [t('section', 'GSTR-1 table'), t('count', 'Rows'), m('taxable', 'Taxable', false), m('igst', 'IGST', false), m('cgst', 'CGST', false), m('sgst', 'SGST', false)], rows, note: `Invoices ${g.docs.from || '—'} to ${g.docs.to || '—'} (${g.docs.total}, cancelled ${g.docs.cancelled}); credit notes ${g.creditNotes.count}. Full tables: Books → GSTR-1 & GSTR-3B.` };
};

// ───────────────────────── Catalog ─────────────────────────

// ───────────────────────── Operations registers ─────────────────────────

const chequeReport: Builder = async (tenantId, from, to) => {
  const rows = await chequeRegister(tenantId, from, to);
  return {
    columns: [d('chequeDate', 'Cheque date'), t('chequeNumber', 'Cheque no.'), t('bank', 'Bank'), t('customerName', 'Party'), d('receivedOn', 'Received'), m('amount', 'Amount'), t('status', 'Status'), d('depositedOn', 'Deposited'), d('clearedOn', 'Cleared'), d('bouncedOn', 'Bounced'), t('bounceReason', 'Reason'), m('bounceCharges', 'Charges')],
    rows,
    summary: ['PDC', 'RECEIVED', 'DEPOSITED', 'CLEARED', 'BOUNCED'].map((s) => ({ label: s, value: sumOf(rows.filter((r) => r.status === s), 'amount'), type: 'money' as const })),
  };
};

const vehicleReport: Builder = async (tenantId, from, to) => {
  const rows = await vehicleCosts(tenantId, from, to);
  return { columns: [t('vehicle', 'Vehicle'), t('type', 'Type'), t('driver', 'Driver'), n('km', 'Km'), n('litres', 'Litres'), n('kmPerLitre', 'Km / L', false), m('fuelCost', 'Fuel'), m('maintenance', 'Maintenance'), m('total', 'Total'), m('perKm', '₹ / km', false)], rows };
};

const cylinderTests: Builder = async (tenantId, _from, to) => {
  const limit = new Date(`${to}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 90);
  const rows = (await prisma.cylinderAsset.findMany({ where: { tenantId, status: { not: 'CONDEMNED' }, nextTestDue: { lte: limit.toISOString().slice(0, 10) } }, orderBy: { nextTestDue: 'asc' } })).map((a) => ({ ...a, state: a.nextTestDue && a.nextTestDue < to ? 'Overdue' : 'Due soon', days: a.nextTestDue ? Math.round((Date.parse(a.nextTestDue) - Date.parse(to)) / 86_400_000) : null }));
  return {
    columns: [t('serialNo', 'Serial no.'), t('productName', 'Cylinder'), t('manufacturer', 'Maker'), d('mfgDate', 'Made'), d('lastTestDate', 'Last test'), d('nextTestDue', 'Test due'), n('days', 'Days left', false), t('state', 'State'), t('status', 'Where'), t('locationName', 'Location')],
    rows,
    summary: [{ label: 'Overdue', value: rows.filter((r) => r.state === 'Overdue').length, type: 'number' }, { label: 'Due in 90 days', value: rows.filter((r) => r.state !== 'Overdue').length, type: 'number' }],
    note: 'Cylinders past their test date must not be filled or sent to customers.',
  };
};

const tdsReport = (direction: 'RECEIVABLE' | 'PAYABLE'): Builder => async (tenantId, from, to) => {
  const rows = (await tdsRegister(tenantId, from, to, direction)).filter((e) => !e.cancelled);
  return {
    columns: [d('date'), t('entryNumber', 'Entry'), t('partyName', direction === 'RECEIVABLE' ? 'Deductor (customer)' : 'Deductee (supplier)'), t('pan', 'PAN'), t('section', 'Section'), t('referenceNo', 'Against'), m('baseAmount', 'Amount paid / billed'), n('rate', 'Rate %', false), m('amount', 'TDS'), t('quarter', 'Quarter'), ...(direction === 'PAYABLE' ? [d('dueOn', 'Due by'), t('challanNo', 'Challan'), d('depositedOn', 'Deposited')] : [t('certificateNo', 'Form 16A no.'), d('certificateDate', 'Certificate date')]), t('state', 'Status')],
    rows,
    summary: [{ label: 'Total TDS', value: sumOf(rows, 'amount'), type: 'money' }, ...(direction === 'PAYABLE' ? [{ label: 'Not deposited', value: sumOf(rows.filter((r) => !r.depositedOn), 'amount'), type: 'money' as const }] : [{ label: 'Without Form 16A', value: sumOf(rows.filter((r) => !r.certificateNo), 'amount'), type: 'money' as const }])],
    note: direction === 'PAYABLE' ? 'For the quarterly TDS return (26Q). Deposit by the 7th of next month; March by 30 April.' : 'Tally with Form 26AS / AIS before claiming in the income-tax return.',
  };
};

const complaintReport: Builder = async (tenantId, from, to) => {
  const list = await prisma.complaint.findMany({ where: { tenantId, createdAt: { gte: new Date(`${from}T00:00:00+05:30`), lte: new Date(`${to}T23:59:59.999+05:30`) } }, orderBy: { createdAt: 'asc' } });
  const rows = list.map((c) => ({ date: c.createdAt.toISOString().slice(0, 10), complaintNumber: c.complaintNumber, customerName: c.customerName, category: c.category, priority: c.priority, status: c.status, assignedToName: c.assignedToName || '', hours: c.resolvedAt ? r2((c.resolvedAt.getTime() - c.createdAt.getTime()) / 3_600_000) : null, resolution: c.resolution || '' }));
  const done = rows.filter((r) => r.hours !== null);
  return {
    columns: [d('date'), t('complaintNumber', 'No.'), t('customerName', 'Customer'), t('category', 'Type'), t('priority', 'Priority'), t('status', 'Status'), t('assignedToName', 'Handled by'), n('hours', 'Hours to resolve', false), t('resolution', 'Resolution')],
    rows,
    summary: [{ label: 'Complaints', value: rows.length, type: 'number' }, { label: 'Still open', value: rows.filter((r) => r.status === 'OPEN' || r.status === 'ASSIGNED').length, type: 'number' }, { label: 'Avg. hours to resolve', value: done.length ? r2(done.reduce((s, r) => s + (r.hours || 0), 0) / done.length) : 0, type: 'number' }],
  };
};

export const REPORTS: { key: string; title: string; group: string; description: string; build: Builder; asOf?: boolean }[] = [
  { key: 'profit-loss', title: 'Profit & Loss Report', group: 'Accounts', description: 'Trading and P&L in one column', build: profitLoss },
  { key: 'sales-payments-summary', title: 'Sales & Payment Report', group: 'Sales', description: 'Per customer: opening, billed, returns, received, closing', build: salesAndPayments },
  { key: 'customer-orders', title: 'Customer Orders', group: 'Sales', description: 'Orders, cylinders and value per customer', build: customerOrders },
  { key: 'gstr1-summary', title: 'GSTR-1 Report', group: 'GST', description: 'B2B, B2C and credit-note totals', build: gstr1Summary },
  { key: 'gstr2', title: 'GSTR-2 Report', group: 'GST', description: 'Inward supplies & ITC: bills, debit notes, expenses', build: gstr2 },
  { key: 'sales-gst', title: 'Sales GST Report', group: 'GST', description: 'Rate-wise output GST (5%, 18% …)', build: gstRateWise('sales') },
  { key: 'purchase-gst', title: 'Purchase GST Report', group: 'GST', description: 'Rate-wise input GST (ITC)', build: gstRateWise('purchase') },
  { key: 'sales', title: 'Sales Report', group: 'Sales', description: 'Invoice register with GST', build: salesReport },
  { key: 'sales-items', title: 'Sales Item Report', group: 'Sales', description: 'Item-wise quantity and value, net of returns', build: salesItems },
  { key: 'sales-payments', title: 'Sales Payments Report', group: 'Sales', description: 'Customer receipts by mode', build: salesPayments },
  { key: 'sales-returns', title: 'Sales Return Report', group: 'Returns', description: 'Credit notes issued', build: salesReturns },
  { key: 'sales-return-payments', title: 'Sales Return Payments', group: 'Returns', description: 'Refunds paid on credit notes', build: salesReturnPayments },
  { key: 'return-items', title: 'Return Items Report', group: 'Returns', description: 'Item lines of sales and purchase returns', build: returnItems },
  { key: 'purchase', title: 'Purchase Report', group: 'Purchases', description: 'Purchase bill register with dues', build: purchaseReport },
  { key: 'supplier-items', title: 'Supplier Items Report', group: 'Purchases', description: 'What each supplier supplied, qty and avg rate', build: supplierItems },
  { key: 'purchase-payments', title: 'Purchase Payments Report', group: 'Purchases', description: 'Payments made to suppliers', build: purchasePayments },
  { key: 'purchase-returns', title: 'Purchase Return Report', group: 'Returns', description: 'Debit notes to plants / suppliers', build: purchaseReturns },
  { key: 'expenses', title: 'Expense Report', group: 'Accounts', description: 'Expenses with head-wise totals', build: expenseReport },
  { key: 'stock', title: 'Stock Report', group: 'Stock', description: 'Full and empty cylinders, value', build: stockReport },
  { key: 'empty-cylinders', title: 'Empty Cylinder Tracking', group: 'Stock', description: 'Cylinders with customers, days since last empty, deposits, overdue', build: emptyCylinders, asOf: true },
  { key: 'profit-customer', title: 'Profit by Customer', group: 'Analysis', description: 'Sales − cylinder cost per customer', build: (t, f, to) => profitability(t, f, to, 'customer') },
  { key: 'profit-product', title: 'Profit by Product', group: 'Analysis', description: 'Margin per cylinder type', build: (t, f, to) => profitability(t, f, to, 'product') },
  { key: 'profit-route', title: 'Profit by Route', group: 'Analysis', description: 'Margin per route / area', build: (t, f, to) => profitability(t, f, to, 'route') },
  { key: 'profit-delivery-boy', title: 'Profit by Delivery Boy', group: 'Analysis', description: 'Margin on each delivery boy’s sales', build: (t, f, to) => profitability(t, f, to, 'deliveryBoy') },
  { key: 'credit-rating', title: 'Customer Credit Rating', group: 'Analysis', description: 'Grade A–D from payment behaviour, suggested credit limit', build: (t, _f, to) => creditRating(t, to), asOf: true },
  { key: 'budget', title: 'Budget vs Actual', group: 'Accounts', description: 'Expense heads against their monthly budget', build: budgetVsActual },
  { key: 'delivery-leaderboard', title: 'Delivery Leaderboard (Points)', group: 'Staff', description: 'Points, deliveries, empties and corrections per delivery boy', build: deliveryLeaderboard },
  { key: 'plant-reconciliation', title: 'Plant Reconciliation', group: 'Stock', description: 'Plant bills vs cylinders received; full received vs empties sent', build: plantReconciliation },
  { key: 'godown-stock', title: 'Godown / Branch Stock', group: 'Stock', description: 'Movements and balance per godown', build: godownStock },
  { key: 'tds-receivable', title: 'TDS Receivable Register', group: 'Accounts', description: 'TDS deducted by customers — match with 26AS', build: tdsReport('RECEIVABLE') },
  { key: 'tds-payable', title: 'TDS Payable Register (26Q)', group: 'Accounts', description: 'TDS deducted from suppliers, due dates and challans', build: tdsReport('PAYABLE') },
  { key: 'cheques', title: 'Cheque Register', group: 'Operations', description: 'PDC, deposited, cleared and bounced cheques', build: chequeReport },
  { key: 'vehicle-costs', title: 'Vehicle Running Cost', group: 'Operations', description: 'Km, fuel, maintenance and cost per km per vehicle', build: vehicleReport },
  { key: 'cylinder-tests', title: 'Cylinder Test Due', group: 'Operations', description: 'Cylinders overdue or due for hydro-test in 90 days', build: cylinderTests, asOf: true },
  { key: 'complaints', title: 'Complaint Register', group: 'Operations', description: 'Complaints with type, handler and time to resolve', build: complaintReport },
  { key: 'outstanding', title: 'Outstanding & Ageing', group: 'Accounts', description: 'Customer dues by age', build: outstanding, asOf: true },
  { key: 'payables', title: 'Payables Report', group: 'Accounts', description: 'What we owe suppliers', build: payablesReport, asOf: true },
];

export async function runReport(tenantId: string, key: string, from: string, to: string): Promise<TabularReport | null> {
  const def = REPORTS.find((r) => r.key === key);
  if (!def) return null;
  const body = await def.build(tenantId, from, to);
  return { key: def.key, title: def.title, group: def.group, description: def.description, ...body };
}
