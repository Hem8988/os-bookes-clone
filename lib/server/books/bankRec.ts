import { createHash } from 'crypto';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import type { Tx } from '@/lib/db';
import { audit, Actor } from '../audit';
import { badRequest, conflict, notFound } from '../http';
import { createManualVoucher } from './entries';

// Bank reconciliation: import a bank statement (Excel / CSV from any Indian
// bank), match its lines with the bank ledger in the books, create vouchers for
// what the books are missing (charges, interest, direct transfers) and show the
// bank reconciliation statement (BRS).

export interface StatementRow {
  date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number | null;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Bank dates: 25/09/2026, 25-09-26, 2026-09-25, 25 Sep 2026, 25-Sep-26, Excel dates. */
export function parseBankDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10);
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /^(\d{1,2})[-/. ]([A-Za-z]{3})[A-Za-z]*[-/. ,]+(\d{2,4})/.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

export const amount = (v: unknown) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[₹,\s]/g, '').replace(/(Cr|Dr)\.?$/i, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export async function readGrid(buffer: Buffer, filename: string, sheet?: RegExp): Promise<unknown[][]> {
  if (/\.xls$/i.test(filename)) throw badRequest('Old .xls files are not supported — open it in Excel and save as .xlsx or CSV.');
  // .xlsx files are zip archives ("PK"); everything else is read as CSV text.
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (!isZip) return parseCsv(buffer.toString('utf8').replace(/^﻿/, ''));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = (sheet && wb.worksheets.find((w) => sheet.test(w.name))) || wb.worksheets[0];
  if (!ws) throw badRequest('The Excel file has no sheet.');
  const grid: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1).map((v) => (v && typeof v === 'object' && 'result' in (v as object) ? (v as { result: unknown }).result : v && typeof v === 'object' && 'text' in (v as object) ? (v as { text: unknown }).text : v));
    grid.push(values);
  });
  return grid;
}

const HEAD = {
  date: /^(txn |transaction |value )?date$|^date$|^tran date|^txn date|^posting date/i,
  description: /narration|description|particulars|details|remarks/i,
  reference: /chq|cheque|ref|utr|instrument/i,
  debit: /withdrawal|debit|dr\b|paid out|money out/i,
  credit: /deposit|credit|cr\b|paid in|money in/i,
  amount: /^amount/i,
  type: /^(dr ?\/ ?cr|type|cr ?\/ ?dr)$/i,
  balance: /balance/i,
};

/** Find the header row and turn the statement into rows. */
export async function parseStatement(buffer: Buffer, filename: string): Promise<StatementRow[]> {
  const grid = await readGrid(buffer, filename);
  let headerAt = -1;
  let cols: Partial<Record<keyof typeof HEAD, number>> = {};
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    const cells = grid[i].map((c) => String(c ?? '').trim());
    const found: Partial<Record<keyof typeof HEAD, number>> = {};
    cells.forEach((c, j) => {
      for (const k of Object.keys(HEAD) as (keyof typeof HEAD)[]) if (found[k] === undefined && c && HEAD[k].test(c)) found[k] = j;
    });
    // "Value date" and "Txn date" both match date; keep the first.
    if (found.date !== undefined && found.description !== undefined && (found.debit !== undefined || found.credit !== undefined || found.amount !== undefined)) {
      headerAt = i;
      cols = found;
      break;
    }
  }
  if (headerAt < 0) throw badRequest('Could not find the columns. The statement needs Date, Narration/Description and Withdrawal/Deposit (or Amount + Dr/Cr) columns.');
  if (cols.debit !== undefined && cols.credit === cols.debit) cols.credit = undefined;
  const rows: StatementRow[] = [];
  for (const r of grid.slice(headerAt + 1)) {
    const date = parseBankDate(r[cols.date!]);
    if (!date) continue;
    let debit = cols.debit !== undefined ? Math.abs(amount(r[cols.debit])) : 0;
    let credit = cols.credit !== undefined ? Math.abs(amount(r[cols.credit])) : 0;
    if (cols.amount !== undefined && !debit && !credit) {
      const a = amount(r[cols.amount]);
      const kind = cols.type !== undefined ? String(r[cols.type] ?? '') : '';
      if (/^d/i.test(kind) || (!kind && a < 0)) debit = Math.abs(a);
      else credit = Math.abs(a);
    }
    if (!debit && !credit) continue;
    rows.push({ date, description: String(r[cols.description!] ?? '').replace(/\s+/g, ' ').trim().slice(0, 300), reference: cols.reference !== undefined ? String(r[cols.reference] ?? '').trim().slice(0, 80) || null : null, debit: r2(debit), credit: r2(credit), balance: cols.balance !== undefined && r[cols.balance] !== '' && r[cols.balance] != null ? r2(amount(r[cols.balance])) : null });
  }
  if (!rows.length) throw badRequest('No transactions found under the header row.');
  return rows;
}

async function bankLedger(db: Tx | typeof prisma, tenantId: string, accountId: string) {
  const acc = await db.ledgerAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!acc || acc.groupName !== 'Bank Accounts') throw badRequest('Choose a bank ledger.');
  return acc;
}

export async function importStatement(tenantId: string, accountId: string, rows: StatementRow[], actor: Actor) {
  await bankLedger(prisma, tenantId, accountId);
  const batch = `IMP-${Date.now()}`;
  let added = 0;
  for (const [i, r] of rows.entries()) {
    // Same date + text + amount + running balance = the same bank line (re-uploads are skipped).
    const fingerprint = createHash('sha1').update(`${r.date}|${r.description}|${r.reference || ''}|${r.debit}|${r.credit}|${r.balance ?? `#${i}`}`).digest('hex');
    const exists = await prisma.bankStatementLine.findUnique({ where: { tenantId_accountId_fingerprint: { tenantId, accountId, fingerprint } } });
    if (exists) continue;
    await prisma.bankStatementLine.create({ data: { tenantId, accountId, importBatch: batch, fingerprint, ...r } });
    added++;
  }
  await audit(prisma, actor, { action: 'BANK_STATEMENT_IMPORTED', entityType: 'LedgerAccount', entityId: accountId, reference: batch, newValue: { rows: rows.length, added } });
  const matched = await autoMatch(tenantId, accountId);
  return { rows: rows.length, added, skipped: rows.length - added, matched };
}

/** Pair unmatched statement lines with book entries: same amount and side, closest date within ±5 days. */
export async function autoMatch(tenantId: string, accountId: string) {
  const [lines, bookLines] = await Promise.all([
    prisma.bankStatementLine.findMany({ where: { tenantId, accountId, status: 'UNMATCHED' }, orderBy: { date: 'asc' } }),
    prisma.accountVoucherLine.findMany({ where: { accountId, voucher: { tenantId, cancelled: false } }, include: { voucher: { select: { date: true, voucherNumber: true, narration: true } } } }),
  ]);
  const taken = new Set((await prisma.bankStatementLine.findMany({ where: { tenantId, accountId, matchedLineId: { not: null } }, select: { matchedLineId: true } })).map((x) => x.matchedLineId));
  const day = (d: string) => new Date(`${d}T00:00:00Z`).getTime() / 86_400_000;
  let matched = 0;
  for (const s of lines) {
    // Money into the bank (statement credit) is a debit to the bank ledger.
    const candidates = bookLines
      .filter((b) => !taken.has(b.id) && (s.credit ? Math.abs(b.debit - s.credit) < 0.01 : Math.abs(b.credit - s.debit) < 0.01) && Math.abs(day(b.voucher.date) - day(s.date)) <= 5)
      .map((b) => {
        const refHit = s.reference && ((b.voucher.narration || '').includes(s.reference) || s.description.includes(b.voucher.voucherNumber));
        return { b, score: Math.abs(day(b.voucher.date) - day(s.date)) - (refHit ? 10 : 0) };
      })
      .sort((a, b) => a.score - b.score);
    if (!candidates.length) continue;
    const pick = candidates[0].b;
    taken.add(pick.id);
    await prisma.bankStatementLine.update({ where: { id: s.id }, data: { status: 'MATCHED', matchedLineId: pick.id, matchedBy: 'auto', matchedAt: new Date() } });
    matched++;
  }
  return matched;
}

export async function matchLine(tenantId: string, statementLineId: string, voucherLineId: string, actor: Actor) {
  const s = await prisma.bankStatementLine.findFirst({ where: { id: statementLineId, tenantId } });
  if (!s) throw notFound('Statement line not found.');
  const b = await prisma.accountVoucherLine.findFirst({ where: { id: voucherLineId, accountId: s.accountId, voucher: { tenantId, cancelled: false } } });
  if (!b) throw badRequest('That entry is not in this bank ledger.');
  if (s.credit ? Math.abs(b.debit - s.credit) > 0.01 : Math.abs(b.credit - s.debit) > 0.01) throw badRequest('Amounts do not match.');
  const clash = await prisma.bankStatementLine.findFirst({ where: { matchedLineId: b.id, NOT: { id: s.id } } });
  if (clash) throw conflict('That book entry is already matched to another bank line.');
  await prisma.bankStatementLine.update({ where: { id: s.id }, data: { status: 'MATCHED', matchedLineId: b.id, matchedBy: actor.name, matchedAt: new Date() } });
}

export async function setLineStatus(tenantId: string, statementLineId: string, status: 'UNMATCHED' | 'IGNORED', actor: Actor) {
  const s = await prisma.bankStatementLine.findFirst({ where: { id: statementLineId, tenantId } });
  if (!s) throw notFound('Statement line not found.');
  await prisma.bankStatementLine.update({ where: { id: s.id }, data: { status, matchedLineId: null, matchedBy: status === 'IGNORED' ? actor.name : null, matchedAt: null } });
}

/** Book what the bank shows but the books do not (charges, interest, direct transfers) and match it. */
export async function createVoucherForLine(tx: Tx, actor: Actor, statementLineId: string, counterAccountId: string, narration: string | null) {
  const s = await tx.bankStatementLine.findFirst({ where: { id: statementLineId, tenantId: actor.tenantId } });
  if (!s) throw notFound('Statement line not found.');
  if (s.status === 'MATCHED') throw conflict('This line is already matched.');
  const amt = s.credit || s.debit;
  const voucher = await createManualVoucher(tx, actor, {
    voucherType: s.credit ? 'RECEIPT' : 'PAYMENT',
    date: s.date,
    narration: narration || `${s.description}${s.reference ? ` (${s.reference})` : ''}`,
    lines: s.credit ? [{ accountId: s.accountId, debit: amt }, { accountId: counterAccountId, credit: amt }] : [{ accountId: counterAccountId, debit: amt }, { accountId: s.accountId, credit: amt }],
  });
  const bankLine = voucher.lines.find((l) => l.accountId === s.accountId)!;
  await tx.bankStatementLine.update({ where: { id: s.id }, data: { status: 'MATCHED', matchedLineId: bankLine.id, matchedBy: actor.name, matchedAt: new Date() } });
  return voucher;
}

/** Everything the reconciliation screen needs for one bank ledger. */
export async function reconciliation(tenantId: string, accountId: string, asOf: string) {
  const acc = await bankLedger(prisma, tenantId, accountId);
  const [statement, bookLines] = await Promise.all([
    prisma.bankStatementLine.findMany({ where: { tenantId, accountId, date: { lte: asOf } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }),
    prisma.accountVoucherLine.findMany({ where: { accountId, voucher: { tenantId, cancelled: false, date: { lte: asOf } } }, include: { voucher: { select: { id: true, date: true, voucherNumber: true, voucherType: true, narration: true, partyName: true } } }, orderBy: { voucher: { date: 'asc' } } }),
  ]);
  const matchedIds = new Set(statement.map((s) => s.matchedLineId).filter(Boolean));
  const bookBalance = r2(acc.openingBalance + bookLines.reduce((s, l) => s + l.debit - l.credit, 0));
  const lastWithBalance = [...statement].reverse().find((s) => s.balance !== null);
  const unpresented = bookLines.filter((l) => !matchedIds.has(l.id));
  const depositsNotCredited = r2(unpresented.reduce((s, l) => s + l.debit, 0));
  const chequesNotPresented = r2(unpresented.reduce((s, l) => s + l.credit, 0));
  const unmatched = statement.filter((s) => s.status === 'UNMATCHED');
  const bankOnlyIn = r2(unmatched.reduce((s, l) => s + l.credit, 0));
  const bankOnlyOut = r2(unmatched.reduce((s, l) => s + l.debit, 0));
  return {
    account: { id: acc.id, name: acc.name },
    asOf,
    bookBalance,
    bankBalance: lastWithBalance?.balance ?? null,
    bankBalanceDate: lastWithBalance?.date ?? null,
    // Book balance − deposits not yet in the bank + cheques not yet cleared + bank-only credits − bank-only debits = bank balance.
    computedBankBalance: r2(bookBalance - depositsNotCredited + chequesNotPresented + bankOnlyIn - bankOnlyOut),
    depositsNotCredited,
    chequesNotPresented,
    bankOnlyIn,
    bankOnlyOut,
    statement: statement.map((s) => ({ ...s, matchedTo: s.matchedLineId ? bookLines.find((b) => b.id === s.matchedLineId)?.voucher.voucherNumber || '' : '' })),
    unreconciledBook: unpresented.map((l) => ({ id: l.id, date: l.voucher.date, voucherNumber: l.voucher.voucherNumber, voucherType: l.voucher.voucherType, party: l.voucher.partyName, narration: l.voucher.narration, debit: l.debit, credit: l.credit })),
    counts: { total: statement.length, matched: statement.filter((s) => s.status === 'MATCHED').length, unmatched: unmatched.length, ignored: statement.filter((s) => s.status === 'IGNORED').length },
  };
}
