import { transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, businessDate, handle, num, ok, optStr, readJson, str } from '@/lib/server/http';
import { cancelTds, createTds, depositTds, markCertificate, tdsRegister } from '@/lib/server/tds';

/** GET ?from&to&direction=RECEIVABLE|PAYABLE → TDS register. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || businessDate();
  const from = url.searchParams.get('from') || `${to.slice(0, 7)}-01`;
  const direction = url.searchParams.get('direction') || undefined;
  return ok(await tdsRegister(auth.tenantId, from, to, direction));
});

/** Record a TDS entry. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const direction = str(body.direction, 'Direction', { required: true }) as 'RECEIVABLE';
  const referenceType = (optStr(body.referenceType) as 'INVOICE' | null) || null;
  const e = await transaction((tx) =>
    createTds(tx, auth, {
      direction,
      date: str(body.date, 'Date', { required: true }),
      partyId: str(body.partyId, 'Party', { required: true }),
      section: str(body.section, 'Section', { required: true }),
      baseAmount: num(body.baseAmount, 'Amount paid / billed', { min: 0 }),
      rate: num(body.rate, 'Rate', { min: 0 }),
      amount: num(body.amount, 'TDS amount', { min: 0 }),
      referenceType,
      referenceId: optStr(body.referenceId),
      pan: optStr(body.pan),
      notes: optStr(body.notes),
    })
  );
  return ok(e, `TDS ${e.entryNumber} recorded.`);
});

/** { action: cancel | deposit | certificate, … } */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const action = str(body.action, 'Action', { required: true });
  if (action === 'cancel') {
    await transaction((tx) => cancelTds(tx, auth, str(body.id, 'Entry', { required: true }), str(body.reason, 'Reason', { required: true })));
    return ok(null, 'TDS entry cancelled.');
  }
  if (action === 'deposit') {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    const r = await transaction((tx) => depositTds(tx, auth, { ids, date: str(body.date, 'Date', { required: true }), challanNo: str(body.challanNo, 'Challan no.', { required: true }), bankAccountId: str(body.bankAccountId, 'Bank', { required: true }) }));
    return ok(r, `Challan recorded — payment voucher ${r.voucherNumber}.`);
  }
  if (action === 'certificate') {
    await transaction((tx) => markCertificate(tx, auth, str(body.id, 'Entry', { required: true }), optStr(body.certificateNo) || '', optStr(body.certificateDate) || ''));
    return ok(null, 'Certificate saved.');
  }
  throw badRequest('Unknown action.');
});
