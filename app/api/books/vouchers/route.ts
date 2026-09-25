import type { VoucherType } from '@/lib/books';
import { transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { cancelManualVoucher, createManualVoucher } from '@/lib/server/books/entries';
import { syncBooks } from '@/lib/server/books/sync';
import { handle, ok, optStr, readJson, str } from '@/lib/server/http';

/** Manual Receipt / Payment / Contra / Journal voucher. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  await syncBooks(auth.tenantId);
  const voucher = await transaction((tx) =>
    createManualVoucher(tx, auth, {
      voucherType: str(body.voucherType, 'Voucher type', { required: true }) as VoucherType,
      date: str(body.date, 'Date', { required: true }),
      narration: optStr(body.narration),
      againstBillId: optStr(body.againstBillId),
      lines: Array.isArray(body.lines) ? (body.lines as { accountId: string; debit?: number; credit?: number }[]) : [],
    })
  );
  return ok(voucher, `Voucher ${voucher.voucherNumber} saved.`);
});

/** Cancel a manual voucher (document vouchers follow their document). */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const id = str(body.id, 'Voucher', { required: true });
  const reason = str(body.reason, 'Reason', { required: true, max: 300 });
  await transaction((tx) => cancelManualVoucher(tx, auth, id, reason));
  return ok(null, 'Voucher cancelled.');
});
