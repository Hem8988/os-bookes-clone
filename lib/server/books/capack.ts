import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { fyStart, monthRange, VOUCHER_TYPES } from '@/lib/books';
import { getSetting } from '../settings';
import {
  balanceSheet,
  booksOverview,
  cashBankBook,
  cylinderHoldings,
  dayBook,
  dayClosings,
  expenseRegister,
  gstr1,
  gstr3b,
  partySummary,
  payables,
  profitAndLoss,
  purchaseRegister,
  receiptsRegister,
  receivablesAgeing,
  salesRegister,
  stockSummary,
  trialBalance,
} from './reports';
import { syncBooks } from './sync';

// Monthly accounts pack for the CA: one Excel workbook (a sheet per report)
// and Tally XML files (ledger masters + the month's vouchers).

const MONEY = '#,##0.00;[Red]-#,##0.00';
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
const TOTAL_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
const TITLE_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
const thin: Partial<ExcelJS.Borders> = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };

type Col = { header: string; key: string; width?: number; money?: boolean; total?: boolean };

const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Excel sheet names: max 31 chars, none of * ? :  / [ ], and unique in the workbook. */
function sheetName(wb: ExcelJS.Workbook, name: string) {
  const base = name.replace(/[*?:\\/[\]]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let out = base;
  for (let n = 2; wb.getWorksheet(out); n++) out = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
  return out;
}

function sheet(wb: ExcelJS.Workbook, name: string, title: string, subtitle: string, cols: Col[], rows: Record<string, unknown>[], opts: { totals?: boolean; note?: string } = {}) {
  const ws = wb.addWorksheet(sheetName(wb, name), { views: [{ state: 'frozen', ySplit: 4 }], pageSetup: { orientation: cols.length > 7 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  ws.mergeCells(1, 1, 1, Math.max(cols.length, 2));
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  t.fill = TITLE_FILL;
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;
  ws.mergeCells(2, 1, 2, Math.max(cols.length, 2));
  ws.getCell(2, 1).value = subtitle;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF475569' } };
  if (opts.note) {
    ws.mergeCells(3, 1, 3, Math.max(cols.length, 2));
    ws.getCell(3, 1).value = opts.note;
    ws.getCell(3, 1).font = { size: 9, color: { argb: 'FF64748B' } };
  }
  const header = ws.getRow(4);
  cols.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: c.money ? 'right' : 'left', wrapText: true };
    cell.border = thin;
    ws.getColumn(i + 1).width = c.width || (c.money ? 14 : 18);
  });
  header.height = 30;
  rows.forEach((r) => {
    const row = ws.addRow(cols.map((c) => r[c.key] ?? ''));
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.border = thin;
      if (c.money) cell.numFmt = MONEY;
    });
  });
  if (!rows.length) {
    const row = ws.addRow(['No entries for this period.']);
    row.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } };
  } else if (opts.totals !== false && cols.some((c) => c.money && c.total !== false)) {
    const first = 5;
    const last = 4 + rows.length;
    const row = ws.addRow(cols.map((c, i) => (i === 0 ? 'TOTAL' : '')));
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (c.money && c.total !== false) {
        const L = ws.getColumn(i + 1).letter;
        cell.value = { formula: `SUM(${L}${first}:${L}${last})` };
        cell.numFmt = MONEY;
      }
      cell.font = { bold: true };
      cell.fill = TOTAL_FILL;
      cell.border = thin;
    });
  }
  return ws;
}

/** Two-column statement sheet (P&L, balance sheet, GSTR-3B). */
function statement(wb: ExcelJS.Workbook, name: string, title: string, subtitle: string, blocks: { heading: string; rows: [string, number | string, boolean?][] }[]) {
  const ws = wb.addWorksheet(sheetName(wb, name), { pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  ws.getColumn(1).width = 52;
  ws.getColumn(2).width = 18;
  ws.mergeCells(1, 1, 1, 2);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  ws.getCell(1, 1).fill = TITLE_FILL;
  ws.getRow(1).height = 24;
  ws.mergeCells(2, 1, 2, 2);
  ws.getCell(2, 1).value = subtitle;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF475569' } };
  for (const b of blocks) {
    ws.addRow([]);
    const h = ws.addRow([b.heading, '']);
    h.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = HEADER_FILL;
    });
    for (const [label, value, bold] of b.rows) {
      const row = ws.addRow([label, value]);
      row.getCell(2).numFmt = MONEY;
      row.getCell(2).alignment = { horizontal: 'right' };
      row.eachCell((c) => (c.border = thin));
      if (bold) {
        row.font = { bold: true };
        row.eachCell((c) => (c.fill = TOTAL_FILL));
      }
    }
  }
  return ws;
}

/** One report (from the report catalog) as an Excel workbook. */
export async function reportWorkbook(tenantId: string, report: { title: string; columns: { key: string; label: string; type?: string; total?: boolean }[]; rows: Record<string, unknown>[]; note?: string; summary?: { label: string; value: number | string }[] }, from: string, to: string) {
  const company = await getSetting(tenantId, 'company');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DeskShark';
  const firm = company.legalName || company.name;
  const cols: Col[] = report.columns.map((c) => ({ header: c.label, key: c.key, money: c.type === 'money', total: c.type === 'money' ? c.total !== false : false, width: c.type === 'money' ? 15 : c.type === 'date' ? 12 : c.type === 'number' ? 10 : 24 }));
  const ws = sheet(wb, report.title, report.title, `${firm}${company.gstin ? ` · GSTIN ${company.gstin}` : ''} · ${from} to ${to}`, cols, report.rows, { note: report.note });
  if (report.summary?.length) {
    ws.addRow([]);
    for (const s of report.summary) ws.addRow([s.label, s.value]).getCell(2).numFmt = MONEY;
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildCaWorkbook(tenantId: string, month: string): Promise<{ buffer: Buffer; filename: string }> {
  await syncBooks(tenantId);
  const { from, to } = monthRange(month);
  const [company, booksSettings] = await Promise.all([getSetting(tenantId, 'company'), getSetting(tenantId, 'books')]);
  const fy = fyStart(to, booksSettings.fyStartMonth);
  const [overview, sales, purchases, expenses, receipts, g1, g3b, cash, bank, days, ageing, parties, creditors, stock, cylinders, tbMonth, pl, plYtd, bs, closings] = await Promise.all([
    booksOverview(tenantId, from, to),
    salesRegister(tenantId, from, to),
    purchaseRegister(tenantId, from, to),
    expenseRegister(tenantId, from, to),
    receiptsRegister(tenantId, from, to),
    gstr1(tenantId, from, to),
    gstr3b(tenantId, from, to),
    cashBankBook(tenantId, 'CASH', from, to),
    cashBankBook(tenantId, 'BANK', from, to),
    dayBook(tenantId, from, to),
    receivablesAgeing(tenantId, to),
    partySummary(tenantId, from, to),
    payables(tenantId, to),
    stockSummary(tenantId, from, to),
    cylinderHoldings(tenantId),
    trialBalance(tenantId, fy, to),
    profitAndLoss(tenantId, from, to),
    profitAndLoss(tenantId, fy, to),
    balanceSheet(tenantId, to),
    dayClosings(tenantId, from, to),
  ]);

  const firm = company.legalName || company.name;
  const period = `${monthLabel(month)} (${from} to ${to})`;
  const sub = `${firm}${company.gstin ? ` · GSTIN ${company.gstin}` : ''} · ${period}`;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DeskShark';
  wb.created = new Date();

  // 1. Summary
  statement(wb, 'Summary', `Monthly accounts pack — ${monthLabel(month)}`, sub, [
    {
      heading: 'Month at a glance',
      rows: [
        ['Sales (taxable value)', overview.sales],
        ['Purchases (taxable value)', overview.purchases],
        ['Expenses (incl. GST)', overview.expenses],
        ['Receipts from customers', overview.receipts],
        ['Gross profit (month)', overview.grossProfit, true],
        ['Net profit (month)', overview.netProfit, true],
      ],
    },
    {
      heading: `Balances as on ${to}`,
      rows: [
        ['Cash in hand (office + delivery staff)', overview.cashInHand],
        ['Bank balance', overview.bank],
        ['Receivable from customers (Sundry Debtors)', overview.receivables],
        ['Payable to suppliers (Sundry Creditors)', overview.payables],
        ['Closing stock (full cylinders at cost)', overview.closingStock],
        ['GST payable in cash for the month (GSTR-3B)', overview.gstPayable, true],
      ],
    },
    {
      heading: 'Sheets in this workbook',
      rows: [
        ['Sales Register · GSTR-1 B2B · GSTR-1 B2C · HSN Summary · GSTR-3B', ''],
        ['Purchase Register · Expense Register · Receipts', ''],
        ['Cash Book · Bank Book · Day Book (all vouchers)', ''],
        ['Outstanding & Ageing · Party Ledgers · Payables', ''],
        ['Stock Summary · Cylinder Holding & Deposits', ''],
        ['Trial Balance (FY to date) · Profit & Loss · Balance Sheet · Day Closings', ''],
      ],
    },
  ]);

  // 2. Sales register
  sheet(wb, 'Sales Register', 'Sales Register', sub, [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Invoice No.', key: 'invoiceNumber', width: 18 },
    { header: 'Party', key: 'customerName', width: 30 },
    { header: 'GSTIN', key: 'gstin', width: 18 },
    { header: 'Place of Supply', key: 'placeOfSupply', width: 18 },
    { header: 'Qty', key: 'qty', width: 8 },
    { header: 'Taxable', key: 'taxable', money: true },
    { header: 'CGST', key: 'cgst', money: true },
    { header: 'SGST', key: 'sgst', money: true },
    { header: 'IGST', key: 'igst', money: true },
    { header: 'Round off', key: 'roundOff', money: true },
    { header: 'Invoice Total', key: 'total', money: true },
    { header: 'Mode', key: 'paymentMode', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
  ], sales.map((s) => (s.status === 'Cancelled' ? { ...s, taxable: 0, cgst: 0, sgst: 0, igst: 0, roundOff: 0, total: 0 } : s)), { note: 'Cancelled invoices are listed with zero value.' });

  // 3–5. GSTR-1
  sheet(wb, 'GSTR-1 B2B', 'GSTR-1 · Table 4A — B2B invoices', sub, [
    { header: 'GSTIN of Recipient', key: 'gstin', width: 18 },
    { header: 'Receiver Name', key: 'receiverName', width: 28 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 18 },
    { header: 'Invoice Date', key: 'date', width: 12 },
    { header: 'Invoice Value', key: 'invoiceValue', money: true, total: false },
    { header: 'Place Of Supply', key: 'placeOfSupply', width: 18 },
    { header: 'Reverse Charge', key: 'reverseCharge', width: 9 },
    { header: 'Rate', key: 'rate', width: 7 },
    { header: 'Taxable Value', key: 'taxable', money: true },
    { header: 'Integrated Tax', key: 'igst', money: true },
    { header: 'Central Tax', key: 'cgst', money: true },
    { header: 'State/UT Tax', key: 'sgst', money: true },
  ], g1.b2b);
  sheet(wb, 'GSTR-1 B2C', 'GSTR-1 · Tables 5 & 7 — B2C (unregistered buyers)', sub, [
    { header: 'Type', key: 'type', width: 8 },
    { header: 'Place Of Supply', key: 'placeOfSupply', width: 22 },
    { header: 'Rate', key: 'rate', width: 7 },
    { header: 'Taxable Value', key: 'taxable', money: true },
    { header: 'Integrated Tax', key: 'igst', money: true },
    { header: 'Central Tax', key: 'cgst', money: true },
    { header: 'State/UT Tax', key: 'sgst', money: true },
  ], g1.b2c);
  sheet(wb, 'HSN Summary', 'GSTR-1 · Table 12 — HSN-wise summary', `${sub} · Documents issued: ${g1.docs.from || '—'} to ${g1.docs.to || '—'} (${g1.docs.total}, cancelled ${g1.docs.cancelled})`, [
    { header: 'HSN', key: 'hsn', width: 12 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'UQC', key: 'uqc', width: 8 },
    { header: 'Total Quantity', key: 'qty', width: 10 },
    { header: 'Rate', key: 'rate', width: 7 },
    { header: 'Total Value', key: 'total', money: true },
    { header: 'Taxable Value', key: 'taxable', money: true },
    { header: 'Integrated Tax', key: 'igst', money: true },
    { header: 'Central Tax', key: 'cgst', money: true },
    { header: 'State/UT Tax', key: 'sgst', money: true },
  ], g1.hsn);

  // 6. GSTR-3B
  statement(wb, 'GSTR-3B', 'GSTR-3B — tax summary', sub, [
    { heading: '3.1 (a) Outward taxable supplies', rows: [['Taxable value', g3b.outward.taxable], ['Integrated tax', g3b.outward.igst], ['Central tax', g3b.outward.cgst], ['State/UT tax', g3b.outward.sgst]] },
    { heading: '4 (A)(5) Eligible ITC — all other ITC', rows: [['Integrated tax', g3b.itc.igst], ['Central tax', g3b.itc.cgst], ['State/UT tax', g3b.itc.sgst]] },
    { heading: '4 (B) ITC not claimed (ineligible bills)', rows: [['Integrated tax', g3b.ineligibleItc.igst], ['Central tax', g3b.ineligibleItc.cgst], ['State/UT tax', g3b.ineligibleItc.sgst]] },
    { heading: '6.1 Tax payable in cash (after set-off)', rows: [['Integrated tax', g3b.payableInCash.igst], ['Central tax', g3b.payableInCash.cgst], ['State/UT tax', g3b.payableInCash.sgst], ['Total payable in cash', g3b.totalPayable, true]] },
    { heading: 'ITC carried forward', rows: [['Integrated tax', g3b.carryForward.igst], ['Central tax', g3b.carryForward.cgst], ['State/UT tax', g3b.carryForward.sgst]] },
  ]);

  // 7. Purchase register
  sheet(wb, 'Purchase Register', 'Purchase Register', sub, [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Our No.', key: 'billNumber', width: 12 },
    { header: 'Supplier Bill No.', key: 'supplierInvoiceNo', width: 16 },
    { header: 'Supplier', key: 'supplierName', width: 28 },
    { header: 'GSTIN', key: 'gstin', width: 18 },
    { header: 'Qty', key: 'qty', width: 8 },
    { header: 'Taxable', key: 'taxable', money: true },
    { header: 'CGST', key: 'cgst', money: true },
    { header: 'SGST', key: 'sgst', money: true },
    { header: 'IGST', key: 'igst', money: true },
    { header: 'Bill Total', key: 'total', money: true },
    { header: 'Paid', key: 'paid', money: true },
    { header: 'ITC', key: 'itc', width: 6 },
    { header: 'Status', key: 'status', width: 10 },
  ], purchases.map((p) => ({ ...p, itc: p.itcEligible ? 'Yes' : 'No' })));

  // 8. Expense register
  sheet(wb, 'Expense Register', 'Expense Register', sub, [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'No.', key: 'entryNumber', width: 12 },
    { header: 'Expense Head', key: 'headName', width: 26 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Supplier', key: 'supplierName', width: 20 },
    { header: 'Supplier GSTIN', key: 'supplierGstin', width: 18 },
    { header: 'Bill No.', key: 'billNumber', width: 12 },
    { header: 'Amount', key: 'amount', money: true },
    { header: 'GST', key: 'gstAmount', money: true },
    { header: 'Total', key: 'totalAmount', money: true },
    { header: 'Paid From', key: 'paidFrom', width: 10 },
  ], expenses.rows.filter((r) => !r.cancelled) as unknown as Record<string, unknown>[]);

  // 9. Receipts
  sheet(wb, 'Receipts', 'Receipts from customers', sub, [
    { header: 'Date', key: 'paymentDate', width: 12 },
    { header: 'Receipt No.', key: 'paymentNumber', width: 14 },
    { header: 'Party', key: 'customerName', width: 30 },
    { header: 'Mode', key: 'mode', width: 10 },
    { header: 'Txn / Cheque', key: 'ref', width: 22 },
    { header: 'Amount', key: 'amount', money: true },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Verified By', key: 'verifiedBy', width: 16 },
  ], receipts.map((p) => ({ ...p, ref: p.transactionId || (p.chequeNumber ? `Chq ${p.chequeNumber} ${p.chequeBank || ''}` : '') })));

  // 10–11. Cash & bank book
  const bookRows = (b: typeof cash) =>
    b.books.flatMap((l) => [
      { date: from, voucherNumber: '', account: l.account.name, particulars: 'Opening balance', debit: l.opening > 0 ? l.opening : 0, credit: l.opening < 0 ? -l.opening : 0, balance: l.opening },
      ...l.rows.map((r) => ({ ...r, account: l.account.name, particulars: `${r.particulars}${r.narration ? ` — ${r.narration}` : ''}` })),
      { date: to, voucherNumber: '', account: l.account.name, particulars: 'Closing balance', debit: 0, credit: 0, balance: l.closing },
    ]);
  const bookCols: Col[] = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Voucher', key: 'voucherNumber', width: 12 },
    { header: 'Ledger', key: 'account', width: 20 },
    { header: 'Particulars', key: 'particulars', width: 48 },
    { header: 'Receipt (Dr)', key: 'debit', money: true, total: false },
    { header: 'Payment (Cr)', key: 'credit', money: true, total: false },
    { header: 'Balance', key: 'balance', money: true, total: false },
  ];
  sheet(wb, 'Cash Book', 'Cash Book', `${sub} · Opening ₹${cash.opening.toFixed(2)} · Closing ₹${cash.closing.toFixed(2)}`, bookCols, bookRows(cash), { totals: false });
  sheet(wb, 'Bank Book', 'Bank Book', `${sub} · Opening ₹${bank.opening.toFixed(2)} · Closing ₹${bank.closing.toFixed(2)}`, bookCols, bookRows(bank), { totals: false });

  // 12. Day book
  sheet(wb, 'Day Book', 'Day Book — all vouchers', sub, [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Voucher No.', key: 'voucherNumber', width: 13 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Ledger', key: 'account', width: 30 },
    { header: 'Debit', key: 'debit', money: true },
    { header: 'Credit', key: 'credit', money: true },
    { header: 'Narration', key: 'narration', width: 50 },
  ], days.filter((v) => !v.cancelled).flatMap((v) => v.lines.map((l, i) => ({ date: i ? '' : v.date, voucherNumber: i ? '' : v.voucherNumber, type: i ? '' : VOUCHER_TYPES[v.voucherType as keyof typeof VOUCHER_TYPES]?.label || v.voucherType, account: l.account, debit: l.debit, credit: l.credit, narration: i ? '' : v.narration }))));

  // 13–15. Parties
  sheet(wb, 'Outstanding & Ageing', `Receivables & ageing as on ${to}`, sub, [
    { header: 'Party', key: 'name', width: 30 },
    { header: 'Short name', key: 'shortName', width: 16 },
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Phone', key: 'phone', width: 13 },
    { header: 'Outstanding', key: 'balance', money: true },
    { header: '0–30 days', key: 'd0_30', money: true },
    { header: '31–60 days', key: 'd31_60', money: true },
    { header: '61–90 days', key: 'd61_90', money: true },
    { header: '90+ days', key: 'd90', money: true },
    { header: 'Credit limit', key: 'creditLimit', money: true, total: false },
  ], ageing);
  sheet(wb, 'Party Ledgers', 'Party ledger summary (debtors & creditors)', `${sub} · Dr = receivable, Cr = payable`, [
    { header: 'Party', key: 'name', width: 30 },
    { header: 'Group', key: 'groupName', width: 18 },
    { header: 'Opening (Dr+/Cr−)', key: 'opening', money: true },
    { header: 'Debit', key: 'debit', money: true },
    { header: 'Credit', key: 'credit', money: true },
    { header: 'Closing (Dr+/Cr−)', key: 'closing', money: true },
  ], parties as unknown as Record<string, unknown>[]);
  sheet(wb, 'Payables', `Payables to suppliers as on ${to}`, sub, [
    { header: 'Supplier', key: 'name', width: 30 },
    { header: 'Payable', key: 'payable', money: true },
    { header: 'Open bills', key: 'bills', width: 70 },
  ], creditors.map((c) => ({ name: c.name, payable: c.payable, bills: c.openBills.map((b) => `${b.billNumber} (${b.supplierInvoiceNo}, ${b.date}) ₹${b.balance.toFixed(2)}`).join('; ') })));

  // 16–17. Stock & cylinders
  sheet(wb, 'Stock Summary', 'Stock summary — full & empty cylinders', `${sub} · Valued at weighted average cost (opening at product purchase price + purchase bills)`, [
    { header: 'Product', key: 'productName', width: 30 },
    { header: 'Opening Full', key: 'openingFull', width: 10 },
    { header: 'Received (Plant)', key: 'inward', width: 11 },
    { header: 'Sold', key: 'sold', width: 9 },
    { header: 'Other', key: 'otherMovement', width: 9 },
    { header: 'Closing Full', key: 'closingFull', width: 10 },
    { header: 'Opening Empty', key: 'openingEmpty', width: 10 },
    { header: 'Empty Recd', key: 'emptyReceived', width: 10 },
    { header: 'Empty to Plant', key: 'emptyToPlant', width: 10 },
    { header: 'Closing Empty', key: 'closingEmpty', width: 10 },
    { header: 'Rate', key: 'rate', money: true, total: false },
    { header: 'Closing Value', key: 'closingValue', money: true },
  ], stock);
  sheet(wb, 'Cylinder Holding', 'Cylinders with customers & deposit vouchers', sub, [
    { header: 'Customer', key: 'customer', width: 30 },
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Product', key: 'product', width: 28 },
    { header: 'Cylinders held', key: 'qty', width: 12 },
  ], cylinders.holdings, { totals: false });
  if (cylinders.deposits.length) {
    sheet(wb, 'Deposit Vouchers', 'SV / TV deposit vouchers', sub, [
      { header: 'Voucher', key: 'voucherNumber', width: 14 },
      { header: 'Type', key: 'type', width: 8 },
      { header: 'Customer', key: 'customer', width: 28 },
      { header: 'Product', key: 'product', width: 24 },
      { header: 'Cylinders', key: 'cylinders', width: 9 },
      { header: 'Regulators', key: 'regulators', width: 9 },
      { header: 'Deposit', key: 'deposit', money: true },
      { header: 'Issued', key: 'issueDate', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
    ], cylinders.deposits);
  }

  // 18–20. Final accounts
  const tbRows = [
    ...(tbMonth.openingStock ? [{ name: 'Opening Stock', dr: tbMonth.openingStock, cr: 0, bold: false }] : []),
    ...tbMonth.groups.flatMap((g) => [
    { name: g.group, dr: g.closing > 0 ? g.closing : 0, cr: g.closing < 0 ? -g.closing : 0, bold: true },
    ...g.accounts.map((a) => ({ name: `    ${a.name}`, dr: a.closing > 0 ? a.closing : 0, cr: a.closing < 0 ? -a.closing : 0, bold: false })),
    ]),
  ];
  const tb = sheet(wb, 'Trial Balance', `Trial Balance — ${fy} to ${to}`, `${firm} · Financial year to date`, [
    { header: 'Particulars', key: 'name', width: 44 },
    { header: 'Debit', key: 'dr', money: true, total: false },
    { header: 'Credit', key: 'cr', money: true, total: false },
  ], tbRows.map((r) => ({ name: r.name, dr: r.bold ? '' : r.dr || '', cr: r.bold ? '' : r.cr || '' })), { totals: false });
  tb.addRow(['Grand total', tbMonth.totalDr, tbMonth.totalCr]).eachCell((c) => {
    c.font = { bold: true };
    c.fill = TOTAL_FILL;
    c.numFmt = MONEY;
  });
  if (tbMonth.openingDifference) tb.addRow(['Difference in opening balances', tbMonth.openingDifference < 0 ? -tbMonth.openingDifference : '', tbMonth.openingDifference > 0 ? tbMonth.openingDifference : '']).eachCell((c) => (c.numFmt = MONEY));

  const plBlocks = (p: typeof pl, label: string) => [
    {
      heading: `Trading account — ${label}`,
      rows: [
        ['Opening stock', p.trading.openingStock] as [string, number],
        ...p.trading.purchases.map((x) => [`Purchases: ${x.name}`, x.amount] as [string, number]),
        ...p.trading.directExpenses.map((x) => [`Direct exp.: ${x.name}`, x.amount] as [string, number]),
        ...p.trading.sales.map((x) => [`Sales: ${x.name}`, x.amount] as [string, number]),
        ...p.trading.directIncome.map((x) => [`Direct income: ${x.name}`, x.amount] as [string, number]),
        ['Closing stock', p.trading.closingStock] as [string, number],
        ['Gross profit', p.grossProfit, true] as [string, number, boolean],
      ],
    },
    {
      heading: `Profit & loss account — ${label}`,
      rows: [
        ['Gross profit b/f', p.grossProfit] as [string, number],
        ...p.indirectIncome.map((x) => [`Income: ${x.name}`, x.amount] as [string, number]),
        ...p.indirectExpenses.map((x) => [`Expense: ${x.name}`, -x.amount] as [string, number]),
        ['Net profit', p.netProfit, true] as [string, number, boolean],
      ],
    },
  ];
  statement(wb, 'Profit & Loss', 'Profit & Loss', firm, [...plBlocks(pl, `month (${from} to ${to})`), ...plBlocks(plYtd, `year to date (${fy} to ${to})`)]);
  statement(wb, 'Balance Sheet', `Balance Sheet as on ${to}`, `${firm} · FY from ${bs.fyFrom}`, [
    {
      heading: 'Liabilities',
      rows: [
        ...bs.liabilities.flatMap((g) => [[g.group, g.amount, true] as [string, number, boolean], ...g.accounts.map((a) => [`    ${a.name}`, a.amount] as [string, number])]),
        ['Profit & loss — current year', bs.profitThisYear] as [string, number],
        ...(bs.profitEarlier ? [['Profit & loss — earlier years', bs.profitEarlier] as [string, number]] : []),
        ['Total liabilities', bs.liabilitiesTotal, true] as [string, number, boolean],
      ],
    },
    {
      heading: 'Assets',
      rows: [
        ...bs.assets.flatMap((g) => [[g.group, g.amount, true] as [string, number, boolean], ...g.accounts.map((a) => [`    ${a.name}`, a.amount] as [string, number])]),
        ['Total assets', bs.assetsTotal, true] as [string, number, boolean],
      ],
    },
    ...(bs.openingDifference ? [{ heading: 'Note', rows: [['Difference in opening balances (dues / stock brought forward without a contra)', bs.openingDifference] as [string, number]] }] : []),
  ]);

  // GSTR-1 table 9B and the catalog reports the CA asks for most.
  sheet(wb, 'GSTR-1 CDNR', 'GSTR-1 · Table 9B — credit notes (registered)', sub, [
    { header: 'GSTIN of Recipient', key: 'gstin', width: 18 },
    { header: 'Receiver Name', key: 'receiverName', width: 26 },
    { header: 'Note Number', key: 'noteNumber', width: 18 },
    { header: 'Note Date', key: 'noteDate', width: 12 },
    { header: 'Note Type', key: 'noteType', width: 8 },
    { header: 'Original Invoice', key: 'invoiceNumber', width: 18 },
    { header: 'Invoice Date', key: 'invoiceDate', width: 12 },
    { header: 'Note Value', key: 'noteValue', money: true, total: false },
    { header: 'Rate', key: 'rate', width: 7 },
    { header: 'Taxable Value', key: 'taxable', money: true },
    { header: 'Integrated Tax', key: 'igst', money: true },
    { header: 'Central Tax', key: 'cgst', money: true },
    { header: 'State/UT Tax', key: 'sgst', money: true },
  ], g1.cdnr);
  const { runReport } = await import('./catalog');
  for (const [key, name] of [['gstr2', 'GSTR-2'], ['sales-gst', 'Sales GST'], ['purchase-gst', 'Purchase GST'], ['sales-items', 'Sales Items'], ['sales-returns', 'Credit Notes'], ['purchase-returns', 'Debit Notes'], ['sales-payments-summary', 'Sales & Payments'], ['purchase-payments', 'Purchase Payments']] as const) {
    const r = await runReport(tenantId, key, from, to);
    if (!r) continue;
    sheet(wb, name, r.title, sub, r.columns.map((c) => ({ header: c.label, key: c.key, money: c.type === 'money', total: c.type === 'money' ? c.total !== false : false, width: c.type === 'money' ? 14 : c.type === 'date' ? 12 : c.type === 'number' ? 10 : 22 })), r.rows, { note: r.note });
  }

  // 21. Day closings
  sheet(wb, 'Day Closings', 'Day closing log', sub, [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Locked by', key: 'lockedBy', width: 18 },
    { header: 'Re-opened by', key: 'reopenedBy', width: 18 },
    { header: 'Reason', key: 'reopenReason', width: 40 },
  ], closings as unknown as Record<string, unknown>[], { totals: false });

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const slug = (company.name || 'accounts').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { buffer, filename: `${slug}-Accounts-${month}.xlsx` };
}

// ───────────────────────── Tally XML ─────────────────────────

const esc = (s: string | null | undefined) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tallyDate = (d: string) => d.replace(/-/g, '');
const TALLY_TYPE: Record<string, string> = { SALES: 'Sales', PURCHASE: 'Purchase', RECEIPT: 'Receipt', PAYMENT: 'Payment', CONTRA: 'Contra', JOURNAL: 'Journal', CREDIT_NOTE: 'Credit Note', DEBIT_NOTE: 'Debit Note' };
// Groups we use that are not Tally defaults, with their Tally parent.
const EXTRA_GROUPS: Record<string, string> = { 'Cylinder Deposits (Liability)': 'Current Liabilities' };

const envelope = (company: string, report: 'All Masters' | 'Vouchers', messages: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>${report}</REPORTNAME>
    <STATICVARIABLES><SVCURRENTCOMPANY>${esc(company)}</SVCURRENTCOMPANY></STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
${messages.join('\n')}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
`;

async function tallyData(tenantId: string, month: string) {
  await syncBooks(tenantId);
  const { from, to } = monthRange(month);
  const company = await getSetting(tenantId, 'company');
  const [accounts, vouchers] = await Promise.all([
    prisma.ledgerAccount.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } }),
    prisma.accountVoucher.findMany({ where: { tenantId, cancelled: false, date: { gte: from, lte: to } }, include: { lines: { include: { account: true } } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }),
  ]);
  const slug = (company.name || 'accounts').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { company: company.legalName || company.name, accounts, vouchers, slug };
}

/**
 * Tally Prime / ERP 9 masters file: every ledger (with opening balance and
 * GSTIN) under the standard Tally groups. Import this before the vouchers.
 */
export async function buildTallyMasters(tenantId: string, month: string): Promise<{ buffer: Buffer; filename: string }> {
  const { company, accounts, slug } = await tallyData(tenantId, month);
  const groups = Object.entries(EXTRA_GROUPS).map(
    ([name, parent]) => `  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <GROUP NAME="${esc(name)}" ACTION="Create">
    <NAME.LIST><NAME>${esc(name)}</NAME></NAME.LIST>
    <PARENT>${esc(parent)}</PARENT>
   </GROUP>
  </TALLYMESSAGE>`
  );
  const ledgers = accounts.map((a) => {
    const party = a.groupName === 'Sundry Debtors' || a.groupName === 'Sundry Creditors';
    const gst = a.gstin ? `\n    <PARTYGSTIN>${esc(a.gstin)}</PARTYGSTIN>\n    <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>` : '';
    const duty = a.groupName === 'Duties & Taxes' ? `\n    <TAXTYPE>GST</TAXTYPE>\n    <GSTDUTYHEAD>${/IGST/.test(a.name) ? 'Integrated Tax' : /CGST/.test(a.name) ? 'Central Tax' : 'State Tax'}</GSTDUTYHEAD>` : '';
    // Tally: debit balances are negative.
    return `  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <LEDGER NAME="${esc(a.name)}" ACTION="Create">
    <NAME.LIST><NAME>${esc(a.name)}</NAME></NAME.LIST>
    <PARENT>${esc(a.groupName)}</PARENT>
    <ISBILLWISEON>${party ? 'Yes' : 'No'}</ISBILLWISEON>
    <AFFECTSSTOCK>No</AFFECTSSTOCK>
    <OPENINGBALANCE>${(-a.openingBalance).toFixed(2)}</OPENINGBALANCE>${gst}${duty}
   </LEDGER>
  </TALLYMESSAGE>`;
  });
  return { buffer: Buffer.from(envelope(company, 'All Masters', [...groups, ...ledgers]), 'utf8'), filename: `${slug}-Tally-Masters-${month}.xml` };
}

/** Tally vouchers for the month (import after the masters). Debits are negative amounts, as Tally expects. */
export async function buildTallyVouchers(tenantId: string, month: string): Promise<{ buffer: Buffer; filename: string }> {
  const { company, vouchers, slug } = await tallyData(tenantId, month);
  const messages = vouchers.map((v) => {
    const type = TALLY_TYPE[v.voucherType] || 'Journal';
    const party = v.lines.find((l) => l.account.partyId)?.account.name;
    const entries = v.lines
      .map((l) => {
        const debit = l.debit > 0;
        return `    <ALLLEDGERENTRIES.LIST>
     <LEDGERNAME>${esc(l.account.name)}</LEDGERNAME>
     <ISDEEMEDPOSITIVE>${debit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
     <ISPARTYLEDGER>${l.account.partyId ? 'Yes' : 'No'}</ISPARTYLEDGER>
     <AMOUNT>${(debit ? -l.debit : l.credit).toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>`;
      })
      .join('\n');
    return `  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <VOUCHER VCHTYPE="${type}" ACTION="Create" OBJVIEW="Accounting Voucher View">
    <DATE>${tallyDate(v.date)}</DATE>
    <EFFECTIVEDATE>${tallyDate(v.date)}</EFFECTIVEDATE>
    <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${esc(v.voucherNumber)}</VOUCHERNUMBER>
    <REFERENCE>${esc(v.voucherNumber)}</REFERENCE>${party ? `\n    <PARTYLEDGERNAME>${esc(party)}</PARTYLEDGERNAME>` : ''}
    <NARRATION>${esc(v.narration)}</NARRATION>
    <ISINVOICE>No</ISINVOICE>
    <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
${entries}
   </VOUCHER>
  </TALLYMESSAGE>`;
  });
  return { buffer: Buffer.from(envelope(company, 'Vouchers', messages), 'utf8'), filename: `${slug}-Tally-Vouchers-${month}.xml` };
}

/** Email the month's workbook + Tally files to the CA (and cc list). */
export async function emailCaPack(tenantId: string, month: string): Promise<{ sentTo: string[]; status: 'SENT' | 'SIMULATED' }> {
  const [books, company] = await Promise.all([getSetting(tenantId, 'books'), getSetting(tenantId, 'company')]);
  const to = [books.caEmail, ...books.ccEmails.split(',')].map((e) => e.trim()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (!to.length) throw new Error("Add the CA's email in Books → CA pack first.");
  const { from, to: until } = monthRange(month);
  const [xlsx, masters, vouchers, overview] = await Promise.all([buildCaWorkbook(tenantId, month), buildTallyMasters(tenantId, month), buildTallyVouchers(tenantId, month), booksOverview(tenantId, from, until)]);
  const firm = company.legalName || company.name;
  const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const text = `Dear ${books.caName || 'Sir/Madam'},

Please find attached the accounts of ${firm} for ${monthLabel(month)}.

Sales (taxable): ${inr(overview.sales)}
Purchases (taxable): ${inr(overview.purchases)}
Expenses: ${inr(overview.expenses)}
Receipts: ${inr(overview.receipts)}
Net profit (month): ${inr(overview.netProfit)}
GST payable (GSTR-3B, cash): ${inr(overview.gstPayable)}
Receivables: ${inr(overview.receivables)} · Payables: ${inr(overview.payables)}

Attachments:
1. ${xlsx.filename} — sales & purchase registers, GSTR-1 (B2B, B2C, HSN), GSTR-3B, cash & bank book, day book, outstanding & ageing, party ledgers, stock summary, trial balance, P&L and balance sheet.
2. ${masters.filename} — Tally ledgers (Gateway of Tally → Import → Masters). Import this first.
3. ${vouchers.filename} — Tally vouchers for the month (Gateway of Tally → Import → Transactions).

Regards,
${firm}${company.phone ? `\n${company.phone}` : ''}`;
  const { emailReady, sendEmail } = await import('../messaging/email');
  const attachments = [
    { filename: xlsx.filename, content: xlsx.buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { filename: masters.filename, content: masters.buffer, contentType: 'application/xml' },
    { filename: vouchers.filename, content: vouchers.buffer, contentType: 'application/xml' },
  ];
  for (const address of to) {
    const r = await sendEmail(tenantId, address, `${firm} — accounts for ${monthLabel(month)}`, text, 'CA_PACK', attachments);
    if (r.status === 'FAILED') throw new Error(`Email to ${address} failed: ${r.error}. Check Settings → Email.`);
  }
  return { sentTo: to, status: (await emailReady(tenantId)) ? 'SENT' : 'SIMULATED' };
}
