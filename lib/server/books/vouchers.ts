import type { Db } from '@/lib/db';
import { VOUCHER_TYPES, VoucherType } from '@/lib/books';
import { badRequest } from '../http';
import { nextNumber } from '../sequence';
import { systemAccount } from './accounts';

export interface VoucherLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
  narration?: string | null;
}

export interface VoucherInput {
  tenantId: string;
  voucherType: VoucherType;
  date: string;
  partyName?: string | null;
  narration?: string | null;
  sourceType: string;
  sourceId?: string | null;
  sourceStamp?: string | null;
  againstBillId?: string | null;
  createdBy: string;
  lines: VoucherLineInput[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Merge lines per account/side, drop zeros, and push paise-level rounding into Round Off. */
async function normalise(db: Db, tenantId: string, lines: VoucherLineInput[], allowRoundOff: boolean) {
  const merged = new Map<string, { accountId: string; debit: number; credit: number; narration: string | null }>();
  for (const l of lines) {
    const debit = r2(Number(l.debit) || 0);
    const credit = r2(Number(l.credit) || 0);
    // A negative amount belongs on the other side, so post the net of the two.
    const signed = r2(debit - credit);
    const d = signed > 0 ? signed : 0;
    const c = signed < 0 ? -signed : 0;
    if (!d && !c) continue;
    const key = `${l.accountId}:${d ? 'D' : 'C'}`;
    const cur = merged.get(key) || { accountId: l.accountId, debit: 0, credit: 0, narration: l.narration ?? null };
    cur.debit = r2(cur.debit + d);
    cur.credit = r2(cur.credit + c);
    merged.set(key, cur);
  }
  const out = [...merged.values()];
  const diff = r2(out.reduce((s, l) => s + l.debit - l.credit, 0));
  if (diff !== 0) {
    if (!allowRoundOff || Math.abs(diff) > 1) throw badRequest(`Voucher does not balance: debit and credit differ by ₹${Math.abs(diff).toFixed(2)}.`);
    const round = await systemAccount(db, tenantId, 'ROUND_OFF');
    out.push({ accountId: round.id, debit: diff < 0 ? -diff : 0, credit: diff > 0 ? diff : 0, narration: 'Rounding' });
  }
  if (out.length < 2) throw badRequest('A voucher needs at least one debit and one credit line.');
  return out;
}

/**
 * Create a voucher, or (for a document-generated one) replace the voucher
 * already made from the same source. Returns null when nothing is left to post.
 */
export async function writeVoucher(db: Db, input: VoucherInput) {
  const generated = input.sourceType !== 'MANUAL' && !!input.sourceId;
  const lines = await normalise(db, input.tenantId, input.lines, generated);
  const amount = r2(lines.reduce((s, l) => s + l.debit, 0));
  const data = {
    voucherType: input.voucherType,
    date: input.date,
    partyName: input.partyName ?? null,
    narration: input.narration ?? null,
    amount,
    sourceStamp: input.sourceStamp ?? null,
    againstBillId: input.againstBillId ?? null,
    cancelled: false,
  };
  if (generated) {
    const existing = await db.accountVoucher.findUnique({ where: { tenantId_sourceType_sourceId: { tenantId: input.tenantId, sourceType: input.sourceType, sourceId: input.sourceId! } } });
    if (existing) {
      await db.accountVoucherLine.deleteMany({ where: { voucherId: existing.id } });
      return db.accountVoucher.update({ where: { id: existing.id }, data: { ...data, lines: { create: lines } }, include: { lines: true } });
    }
  }
  const voucherNumber = await nextNumber(db, input.tenantId, VOUCHER_TYPES[input.voucherType].prefix);
  return db.accountVoucher.create({
    data: { tenantId: input.tenantId, voucherNumber, sourceType: input.sourceType, sourceId: input.sourceId ?? null, createdBy: input.createdBy, ...data, lines: { create: lines } },
    include: { lines: true },
  });
}

/** Mark the voucher made from a source as cancelled (kept for the audit trail). */
export async function cancelSourceVoucher(db: Db, tenantId: string, sourceType: string, sourceId: string) {
  await db.accountVoucher.updateMany({ where: { tenantId, sourceType, sourceId }, data: { cancelled: true } });
}
