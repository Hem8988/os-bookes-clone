import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { badRequest } from '../http';
import { amount, parseBankDate, readGrid } from './bankRec';

// GSTR-2B reconciliation: the supplier-filed invoices the GST portal shows as
// your input tax credit, matched against the purchase bills and expenses in the
// books. Upload the GSTR-2B JSON or Excel exactly as downloaded from the portal
// (or any sheet with GSTIN / invoice no. / date / value / tax columns).

export interface TwoBRow {
  kind: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  gstin: string;
  supplier: string;
  number: string;
  date: string | null;
  value: number;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  itcAvailable: boolean;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const numKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
const isGstin = (s: string) => /^[0-9]{2}[A-Z0-9]{13}$/.test(s);

// ───────────────────────── Parsing ─────────────────────────

type Json = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? (v as Json[]) : []);

function fromJson(j: Json): TwoBRow[] {
  const root = (j.data as Json) || j;
  const doc = (root.docdata as Json) || root;
  const out: TwoBRow[] = [];
  const itemsSum = (items: Json[], key: string) => r2(items.reduce((s, it) => s + (Number(it[key]) || 0), 0));
  for (const sup of arr(doc.b2b)) {
    for (const inv of arr(sup.inv)) {
      const items = arr(inv.items).length ? arr(inv.items) : [inv];
      out.push({ kind: 'INVOICE', gstin: String(sup.ctin || '').toUpperCase(), supplier: String(sup.trdnm || ''), number: String(inv.inum || ''), date: parseBankDate(inv.dt), value: r2(Number(inv.val) || 0), taxable: itemsSum(items, 'txval'), igst: itemsSum(items, 'igst'), cgst: itemsSum(items, 'cgst'), sgst: itemsSum(items, 'sgst'), itcAvailable: String(inv.itcavl || 'Y').toUpperCase() !== 'N' });
    }
  }
  for (const sup of arr(doc.cdnr)) {
    for (const nt of arr(sup.nt)) {
      const items = arr(nt.items).length ? arr(nt.items) : [nt];
      out.push({ kind: String(nt.typ || 'C').toUpperCase() === 'D' ? 'DEBIT_NOTE' : 'CREDIT_NOTE', gstin: String(sup.ctin || '').toUpperCase(), supplier: String(sup.trdnm || ''), number: String(nt.ntnum || ''), date: parseBankDate(nt.dt), value: r2(Number(nt.val) || 0), taxable: itemsSum(items, 'txval'), igst: itemsSum(items, 'igst'), cgst: itemsSum(items, 'cgst'), sgst: itemsSum(items, 'sgst'), itcAvailable: String(nt.itcavl || 'Y').toUpperCase() !== 'N' });
    }
  }
  return out;
}

const HEAD = {
  gstin: /gstin/i,
  supplier: /trade|legal name|supplier name|party/i,
  number: /(invoice|note|document|bill)\s*(number|no)|inv.*no/i,
  type: /note type|invoice type/i,
  date: /(invoice|note|document|bill)\s*date|^date$/i,
  value: /(invoice|note|total)\s*value/i,
  taxable: /taxable/i,
  igst: /integrated|igst/i,
  cgst: /central|cgst/i,
  sgst: /state\s*\/?\s*ut|sgst|state tax/i,
  itc: /itc availability|itc available|eligib/i,
};
type Cols = Partial<Record<keyof typeof HEAD, number>>;

function findHeader(grid: unknown[][]): { at: number; cols: Cols } | null {
  const text = (r: unknown[] | undefined, j: number) => String(r?.[j] ?? '').trim();
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    // The portal file has a two-row header ("Invoice details" over "Invoice number"), so try one row and two.
    for (const span of [1, 2]) {
      const width = Math.max(grid[i]?.length || 0, grid[i + 1]?.length || 0);
      const cols: Cols = {};
      for (let j = 0; j < width; j++) {
        const label = span === 1 ? text(grid[i], j) : `${text(grid[i], j)} ${text(grid[i + 1], j)}`.trim();
        if (!label) continue;
        for (const k of Object.keys(HEAD) as (keyof typeof HEAD)[]) if (cols[k] === undefined && HEAD[k].test(label)) cols[k] = j;
      }
      if (cols.gstin !== undefined && cols.number !== undefined && (cols.value !== undefined || cols.taxable !== undefined)) return { at: i + span, cols };
    }
  }
  return null;
}

function fromGrid(grid: unknown[][], kind: 'INVOICE' | 'NOTE'): TwoBRow[] {
  const h = findHeader(grid);
  if (!h) return [];
  const { cols } = h;
  const by = new Map<string, TwoBRow>();
  for (const r of grid.slice(h.at)) {
    const gstin = String(r[cols.gstin!] ?? '').trim().toUpperCase();
    const number = String(r[cols.number!] ?? '').trim();
    if (!isGstin(gstin) || !number) continue;
    const noteType = cols.type !== undefined ? String(r[cols.type] ?? '') : '';
    const k: TwoBRow['kind'] = kind === 'INVOICE' ? 'INVOICE' : /debit/i.test(noteType) ? 'DEBIT_NOTE' : 'CREDIT_NOTE';
    const key = `${k}|${gstin}|${numKey(number)}`;
    // One line per tax rate in the portal file: add the taxes, keep the invoice value.
    const cur = by.get(key) || { kind: k, gstin, supplier: cols.supplier !== undefined ? String(r[cols.supplier] ?? '').trim() : '', number, date: cols.date !== undefined ? parseBankDate(r[cols.date]) : null, value: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, itcAvailable: true };
    cur.value = Math.max(cur.value, r2(Math.abs(amount(cols.value !== undefined ? r[cols.value] : 0))));
    cur.taxable = r2(cur.taxable + Math.abs(amount(cols.taxable !== undefined ? r[cols.taxable] : 0)));
    cur.igst = r2(cur.igst + Math.abs(amount(cols.igst !== undefined ? r[cols.igst] : 0)));
    cur.cgst = r2(cur.cgst + Math.abs(amount(cols.cgst !== undefined ? r[cols.cgst] : 0)));
    cur.sgst = r2(cur.sgst + Math.abs(amount(cols.sgst !== undefined ? r[cols.sgst] : 0)));
    if (cols.itc !== undefined && /^n/i.test(String(r[cols.itc] ?? ''))) cur.itcAvailable = false;
    by.set(key, cur);
  }
  for (const v of by.values()) if (!v.value) v.value = r2(v.taxable + v.igst + v.cgst + v.sgst);
  return [...by.values()];
}

function sheetGrid(ws: ExcelJS.Worksheet) {
  const grid: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    grid.push((row.values as unknown[]).slice(1).map((v) => (v && typeof v === 'object' && 'result' in (v as object) ? (v as { result: unknown }).result : v && typeof v === 'object' && 'richText' in (v as object) ? (v as { richText: { text: string }[] }).richText.map((t) => t.text).join('') : v)));
  });
  return grid;
}

export async function parse2b(buffer: Buffer, filename: string): Promise<TwoBRow[]> {
  const head = buffer.subarray(0, 64).toString('utf8').trimStart();
  let rows: TwoBRow[];
  if (head.startsWith('{') || /\.json$/i.test(filename)) {
    let j: Json;
    try {
      j = JSON.parse(buffer.toString('utf8').replace(/^﻿/, ''));
    } catch {
      throw badRequest('This JSON file could not be read.');
    }
    rows = fromJson(j);
  } else if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const b2b = wb.worksheets.find((w) => /^b2b$/i.test(w.name.trim()));
    const cdnr = wb.worksheets.find((w) => /cdnr/i.test(w.name) && !/amend|-a$/i.test(w.name));
    rows = b2b ? [...fromGrid(sheetGrid(b2b), 'INVOICE'), ...(cdnr ? fromGrid(sheetGrid(cdnr), 'NOTE') : [])] : fromGrid(sheetGrid(wb.worksheets[0]), 'INVOICE');
  } else {
    rows = fromGrid(await readGrid(buffer, filename), 'INVOICE');
  }
  if (!rows.length) throw badRequest('No supplier invoices found. Upload the GSTR-2B JSON or Excel downloaded from the GST portal.');
  return rows;
}

// ───────────────────────── Matching ─────────────────────────

interface BookDoc {
  kind: TwoBRow['kind'];
  gstin: string;
  supplier: string;
  number: string;
  ref: string;
  date: string;
  value: number;
  tax: number;
  inPeriod: boolean;
}

export interface MatchRow {
  status: 'Matched' | 'Amount differs' | 'Probable (no. differs)' | 'Only in GSTR-2B' | 'Only in books';
  kind: string;
  gstin: string;
  supplier: string;
  number: string;
  date2b: string | null;
  dateBooks: string | null;
  value2b: number;
  valueBooks: number;
  tax2b: number;
  taxBooks: number;
  difference: number;
  bookRef: string;
  itc: string;
}

/** Match a GSTR-2B (period from–to) with the books. Books are searched 6 months back for late entries. */
export async function match2b(tenantId: string, rows: TwoBRow[], from: string, to: string) {
  const lookFrom = new Date(`${from}T00:00:00Z`);
  lookFrom.setUTCMonth(lookFrom.getUTCMonth() - 6);
  const back = lookFrom.toISOString().slice(0, 10);
  const [bills, expenses, notes] = await Promise.all([
    prisma.purchaseBill.findMany({ where: { tenantId, status: { not: 'Cancelled' }, date: { gte: back, lte: to } } }),
    prisma.expenseEntry.findMany({ where: { tenantId, cancelled: false, gstAmount: { gt: 0 }, date: { gte: back, lte: to } } }),
    prisma.debitNote.findMany({ where: { tenantId, status: 'Active', date: { gte: back, lte: to } } }),
  ]);
  const books: BookDoc[] = [
    ...bills.map((b) => ({ kind: 'INVOICE' as const, gstin: (b.supplierGstin || '').toUpperCase(), supplier: b.supplierName, number: b.supplierInvoiceNo, ref: b.billNumber, date: b.date, value: b.grandTotal, tax: r2(b.totalCgst + b.totalSgst + b.totalIgst), inPeriod: b.date >= from })),
    ...expenses.map((e) => ({ kind: 'INVOICE' as const, gstin: (e.supplierGstin || '').toUpperCase(), supplier: e.supplierName || e.headName, number: e.billNumber || '', ref: e.entryNumber, date: e.date, value: e.totalAmount, tax: e.gstAmount, inPeriod: e.date >= from })),
    // A supplier's credit note to us is what our debit note records.
    ...notes.map((n) => ({ kind: 'CREDIT_NOTE' as const, gstin: (n.supplierGstin || '').toUpperCase(), supplier: n.supplierName, number: '', ref: n.noteNumber, date: n.date, value: n.grandTotal, tax: r2(n.totalCgst + n.totalSgst + n.totalIgst), inPeriod: n.date >= from })),
  ];
  const used = new Set<BookDoc>();
  const out: MatchRow[] = [];
  const tax = (r: TwoBRow) => r2(r.igst + r.cgst + r.sgst);
  const days = (a: string | null, b: string) => (a ? Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000 : 99);

  for (const r of rows) {
    const same = books.filter((b) => !used.has(b) && b.kind === r.kind && b.gstin === r.gstin);
    let hit = r.number ? same.find((b) => b.number && numKey(b.number) === numKey(r.number)) : undefined;
    let status: MatchRow['status'] = 'Only in GSTR-2B';
    if (hit) status = Math.abs(hit.value - r.value) <= 1 && Math.abs(hit.tax - tax(r)) <= 1 ? 'Matched' : 'Amount differs';
    else {
      hit = same.find((b) => Math.abs(b.value - r.value) <= 1 && days(r.date, b.date) <= (r.kind === 'INVOICE' ? 5 : 45));
      if (hit) status = 'Probable (no. differs)';
    }
    if (hit) used.add(hit);
    out.push({ status, kind: r.kind.replace('_', ' ').toLowerCase(), gstin: r.gstin, supplier: r.supplier || hit?.supplier || '', number: r.number, date2b: r.date, dateBooks: hit?.date ?? null, value2b: r.value, valueBooks: hit?.value ?? 0, tax2b: tax(r), taxBooks: hit?.tax ?? 0, difference: r2(tax(r) - (hit?.tax ?? 0)), bookRef: hit ? `${hit.ref}${hit.number ? ` (${hit.number})` : ''}` : '', itc: r.itcAvailable ? 'Yes' : 'No' });
  }
  for (const b of books) {
    if (used.has(b) || !b.inPeriod || !b.tax) continue;
    out.push({ status: 'Only in books', kind: b.kind.replace('_', ' ').toLowerCase(), gstin: b.gstin, supplier: b.supplier, number: b.number, date2b: null, dateBooks: b.date, value2b: 0, valueBooks: b.value, tax2b: 0, taxBooks: b.tax, difference: r2(-b.tax), bookRef: b.ref, itc: b.gstin ? 'Supplier has not filed' : 'No supplier GSTIN in books' });
  }
  const order = ['Only in books', 'Amount differs', 'Only in GSTR-2B', 'Probable (no. differs)', 'Matched'];
  out.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.supplier.localeCompare(b.supplier));
  const sum = (f: (x: MatchRow) => boolean, k: 'tax2b' | 'taxBooks') => r2(out.filter(f).reduce((s, x) => s + (x.kind === 'invoice' ? x[k] : -x[k]), 0));
  const count = (s: MatchRow['status']) => out.filter((x) => x.status === s).length;
  return {
    title: 'GSTR-2B Reconciliation',
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'kind', label: 'Type' },
      { key: 'gstin', label: 'Supplier GSTIN' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'number', label: 'Invoice / note no.' },
      { key: 'date2b', label: 'Date (2B)', type: 'date' },
      { key: 'dateBooks', label: 'Date (books)', type: 'date' },
      { key: 'value2b', label: 'Value (2B)', type: 'money' },
      { key: 'valueBooks', label: 'Value (books)', type: 'money' },
      { key: 'tax2b', label: 'GST (2B)', type: 'money' },
      { key: 'taxBooks', label: 'GST (books)', type: 'money' },
      { key: 'difference', label: 'Difference', type: 'money' },
      { key: 'bookRef', label: 'Books ref.' },
      { key: 'itc', label: 'ITC available' },
    ],
    rows: out as unknown as Record<string, unknown>[],
    summary: [
      { label: 'ITC as per GSTR-2B', value: sum((x) => x.status !== 'Only in books' && x.itc === 'Yes', 'tax2b'), type: 'money' as const },
      { label: 'ITC as per books (this period)', value: sum((x) => x.status === 'Only in books' || x.dateBooks === null || x.dateBooks >= from, 'taxBooks'), type: 'money' as const },
      { label: 'Matched', value: count('Matched'), type: 'number' as const },
      { label: 'Amount differs', value: count('Amount differs'), type: 'number' as const },
      { label: 'Probable matches', value: count('Probable (no. differs)'), type: 'number' as const },
      { label: 'Only in GSTR-2B (not booked)', value: count('Only in GSTR-2B'), type: 'number' as const },
      { label: 'Only in books (supplier not filed)', value: count('Only in books'), type: 'number' as const },
    ],
    note: 'Claim ITC in GSTR-3B only for invoices in GSTR-2B. "Only in books" — ask the supplier to file GSTR-1; "Only in GSTR-2B" — enter the missing purchase bill.',
  };
}
