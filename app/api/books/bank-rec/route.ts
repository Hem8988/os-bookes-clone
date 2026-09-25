import { transaction } from '@/lib/db';
import { requireAuth, rateLimit } from '@/lib/server/auth';
import { autoMatch, createVoucherForLine, importStatement, matchLine, parseStatement, reconciliation, setLineStatus } from '@/lib/server/books/bankRec';
import { syncBooks } from '@/lib/server/books/sync';
import { badRequest, businessDate, handle, ok, optStr, readJson, str } from '@/lib/server/http';

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** GET ?accountId=…&asOf=… → statement lines, unreconciled book entries, BRS. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const accountId = url.searchParams.get('accountId');
  if (!accountId) throw badRequest('Choose a bank ledger.');
  await syncBooks(auth.tenantId);
  const asOf = url.searchParams.get('asOf');
  return ok(await reconciliation(auth.tenantId, accountId, isDate(asOf) ? asOf : businessDate()));
});

/** Upload a statement (multipart: file, accountId). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  rateLimit(`bankrec:${auth.userId}`, 20, 60_000);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const accountId = String(form?.get('accountId') || '');
  if (!file || typeof file === 'string') throw badRequest('Choose the bank statement file (Excel or CSV).');
  if (file.size > 5 * 1024 * 1024) throw badRequest('The file is larger than 5 MB.');
  if (!accountId) throw badRequest('Choose the bank ledger.');
  await syncBooks(auth.tenantId);
  const rows = await parseStatement(Buffer.from(await file.arrayBuffer()), file.name || 'statement');
  const r = await importStatement(auth.tenantId, accountId, rows, auth);
  return ok(r, `${r.added} new line(s) imported, ${r.matched} matched automatically${r.skipped ? `, ${r.skipped} already imported` : ''}.`);
});

/** { action: auto | match | unmatch | ignore | create, … } */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const action = str(body.action, 'Action', { required: true });
  if (action === 'auto') {
    await syncBooks(auth.tenantId);
    const n = await autoMatch(auth.tenantId, str(body.accountId, 'Bank ledger', { required: true }));
    return ok({ matched: n }, `${n} line(s) matched.`);
  }
  const lineId = str(body.lineId, 'Statement line', { required: true });
  if (action === 'match') {
    await matchLine(auth.tenantId, lineId, str(body.voucherLineId, 'Book entry', { required: true }), auth);
    return ok(null, 'Matched.');
  }
  if (action === 'unmatch' || action === 'ignore') {
    await setLineStatus(auth.tenantId, lineId, action === 'ignore' ? 'IGNORED' : 'UNMATCHED', auth);
    return ok(null, action === 'ignore' ? 'Ignored.' : 'Unmatched.');
  }
  if (action === 'create') {
    await syncBooks(auth.tenantId);
    const v = await transaction((tx) => createVoucherForLine(tx, auth, lineId, str(body.counterAccountId, 'Ledger', { required: true }), optStr(body.narration)));
    return ok(v, `Voucher ${v.voucherNumber} created and matched.`);
  }
  throw badRequest('Unknown action.');
});
