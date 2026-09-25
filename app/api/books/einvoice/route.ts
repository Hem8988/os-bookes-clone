import { transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { buildEinvoiceJson, buildEwayJson, einvoiceList, saveEinvoiceDetails } from '@/lib/server/books/einvoice';
import { badRequest, businessDate, handle, num, ok, optStr, readJson, str } from '@/lib/server/http';

/** GET ?from&to → invoices with IRN / e-way bill state. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || businessDate();
  const from = url.searchParams.get('from') || `${to.slice(0, 7)}-01`;
  return ok(await einvoiceList(auth.tenantId, from, to));
});

/** { kind: einvoice | ewaybill, ids[], vehicleNo?, distanceKm? } → JSON file for the portal (+ problems). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const body = await readJson(request);
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 500) : [];
  if (!ids.length) throw badRequest('Choose the invoices.');
  const kind = str(body.kind, 'Type', { required: true });
  if (kind === 'einvoice') return ok(await buildEinvoiceJson(auth.tenantId, ids));
  if (kind === 'ewaybill') return ok(await buildEwayJson(auth.tenantId, ids, { vehicleNo: optStr(body.vehicleNo), distanceKm: body.distanceKm ? num(body.distanceKm, 'Distance', { min: 0 }) : 0 }));
  throw badRequest('Unknown file type.');
});

/** Save IRN / Ack / signed QR / e-way bill no. returned by the portal. */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  await transaction((tx) =>
    saveEinvoiceDetails(tx, auth, str(body.id, 'Invoice', { required: true }), {
      irn: optStr(body.irn),
      ackNo: optStr(body.ackNo),
      ackDate: optStr(body.ackDate),
      signedQr: typeof body.signedQr === 'string' ? body.signedQr.slice(0, 4000) : undefined,
      ewbNo: optStr(body.ewbNo),
      ewbDate: optStr(body.ewbDate),
      ewbValidUpto: optStr(body.ewbValidUpto),
    })
  );
  return ok(null, 'Saved — it will print on the invoice.');
});
