import { transaction } from '@/lib/db';
import { requireAuth, rateLimit } from '@/lib/server/auth';
import { autoMatch, clearUnmatched, createVoucherForLine, importStatement, linkLines, matchLine, parseStatement, previewStatement, reconciliation, setLineStatus } from '@/lib/server/books/bankRec';
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

/** Upload a statement (multipart: file, accountId, preview?). */
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
  // preview=1: show what would be imported; nothing is saved.
  if (form?.get('preview') === '1') return ok(await previewStatement(auth.tenantId, accountId, rows));
  // links: the matches chosen in the preview ({ rowIndex: bookEntryId | null }); without it the auto-match runs.
  let links: Record<string, string | null> | undefined;
  const raw = form?.get('links');
  if (typeof raw === 'string' && raw) {
    try {
      links = JSON.parse(raw);
    } catch {
      throw badRequest('Invalid match selection.');
    }
  }
  const r = await importStatement(auth.tenantId, accountId, rows, auth, links);
  const receipts = r.receipts ? `, ${r.receipts} customer receipt(s) created${r.pendingReceipts ? ` (${r.pendingReceipts} waiting in the Approval queue — approve them, then Auto-match)` : ''}` : '';
  return ok(r, `${r.added} new line(s) imported, ${r.matched} matched${links ? '' : ' automatically'}${receipts}${r.failed ? `, ${r.failed} could not be linked (match them by hand)` : ''}${r.skipped ? `, ${r.skipped} already imported` : ''}.`);
});

/** { action: auto | clear | match | unmatch | ignore | create, … } */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const action = str(body.action, 'Action', { required: true });
  if (action === 'auto') {
    await syncBooks(auth.tenantId);
    const n = await autoMatch(auth.tenantId, str(body.accountId, 'Bank ledger', { required: true }));
    return ok({ matched: n }, `${n} line(s) matched.`);
  }
  if (action === 'link' || action === 'ignore-many') {
    // One or many lines: link: book entry id | pay:<customerId> | led:<accountId>.
    const accountId = str(body.accountId, 'Bank ledger', { required: true });
    const lineIds = Array.isArray(body.lineIds) ? body.lineIds.map(String).slice(0, 500) : [];
    if (!lineIds.length) throw badRequest('Select at least one line.');
    if (action === 'ignore-many') {
      for (const id of lineIds) await setLineStatus(auth.tenantId, id, 'IGNORED', auth);
      return ok(null, `${lineIds.length} line(s) ignored.`);
    }
    const link = str(body.link, 'Customer / ledger', { required: true });
    await syncBooks(auth.tenantId);
    const r = await linkLines(auth.tenantId, accountId, lineIds.map((lineId) => ({ lineId, link })), auth);
    const receipts = r.receipts ? `${r.receipts} customer receipt(s) created${r.pendingReceipts ? ` — ${r.pendingReceipts} waiting in the Approval queue (approve, then Auto-match)` : ''}. ` : '';
    return ok(r, `${receipts}${r.matched} matched${r.failed ? `, ${r.failed} could not be linked` : ''}.`);
  }
  if (action === 'clear') {
    const n = await clearUnmatched(auth.tenantId, str(body.accountId, 'Bank ledger', { required: true }), auth);
    return ok({ removed: n }, `${n} unmatched line(s) removed — upload the statement again.`);
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
