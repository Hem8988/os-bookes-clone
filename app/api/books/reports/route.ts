import { fyStart } from '@/lib/books';
import { requireAuth } from '@/lib/server/auth';
import { reportWorkbook } from '@/lib/server/books/capack';
import { REPORTS, runReport } from '@/lib/server/books/catalog';
import { syncBooks } from '@/lib/server/books/sync';
import { badRequest, businessDate, handle, notFound, ok } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * GET                      → the report list
 * GET ?key=…&from&to       → one report as { columns, rows, summary }
 * GET ?key=…&format=xlsx   → the same report as an Excel file
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return ok(REPORTS.map((r) => ({ key: r.key, title: r.title, group: r.group, description: r.description, asOf: !!r.asOf })));
  const books = await getSetting(auth.tenantId, 'books');
  const to = isDate(url.searchParams.get('to')) ? url.searchParams.get('to')! : businessDate();
  const from = isDate(url.searchParams.get('from')) ? url.searchParams.get('from')! : fyStart(to, books.fyStartMonth);
  if (from > to) throw badRequest('From date must be before To date.');
  await syncBooks(auth.tenantId);
  const report = await runReport(auth.tenantId, key, from, to);
  if (!report) throw notFound('Report not found.');
  if (url.searchParams.get('format') === 'xlsx') {
    const buffer = await reportWorkbook(auth.tenantId, report, from, to);
    const name = `${report.title.replace(/[^A-Za-z0-9]+/g, '-')}-${from}-to-${to}.xlsx`;
    return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } });
  }
  return ok({ ...report, from, to });
});
