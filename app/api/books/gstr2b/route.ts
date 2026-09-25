import { requireAuth } from '@/lib/server/auth';
import { reportWorkbook } from '@/lib/server/books/capack';
import { match2b, parse2b } from '@/lib/server/books/gstr2b';
import { badRequest, handle, ok } from '@/lib/server/http';

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Upload GSTR-2B (multipart: file, from, to[, format=xlsx]) → match with the books. Nothing is saved. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const from = form?.get('from');
  const to = form?.get('to');
  if (!file || typeof file === 'string') throw badRequest('Choose the GSTR-2B file (JSON or Excel from the GST portal).');
  if (file.size > 10 * 1024 * 1024) throw badRequest('The file is larger than 10 MB.');
  if (!isDate(from) || !isDate(to) || from > to) throw badRequest('Choose the GSTR-2B month.');
  const rows = await parse2b(Buffer.from(await file.arrayBuffer()), file.name || 'gstr2b');
  const report = await match2b(auth.tenantId, rows, from, to);
  if (form?.get('format') === 'xlsx') {
    const buffer = await reportWorkbook(auth.tenantId, report, from, to);
    return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="GSTR-2B-reconciliation-${from.slice(0, 7)}.xlsx"`, 'Cache-Control': 'no-store' } });
  }
  return ok({ ...report, from, to, uploaded: rows.length });
});
