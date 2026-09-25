import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { addDays, badRequest, businessDate, handle, ok, optStr, readJson } from '@/lib/server/http';
import { AssetInput, assetSummary, importAssets, saveAsset } from '@/lib/server/registers';

/** GET ?filter=all|due|overdue&search= → cylinders with a summary. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.view');
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search')?.trim();
  const today = businessDate();
  const where = {
    tenantId: auth.tenantId,
    ...(filter === 'overdue' ? { nextTestDue: { lt: today }, status: { not: 'CONDEMNED' } } : filter === 'due' ? { nextTestDue: { gte: today, lte: addDays(today, 30) }, status: { not: 'CONDEMNED' } } : {}),
    ...(search ? { OR: [{ serialNo: { contains: search, mode: 'insensitive' as const } }, { locationName: { contains: search, mode: 'insensitive' as const } }] } : {}),
  };
  const [rows, summary] = await Promise.all([prisma.cylinderAsset.findMany({ where, orderBy: [{ nextTestDue: 'asc' }, { serialNo: 'asc' }], take: 1000 }), assetSummary(auth.tenantId)]);
  return ok({ rows, summary });
});

/** Register or edit one cylinder. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.manage', { write: true });
  const body = await readJson(request);
  return ok(await saveAsset(auth.tenantId, body as unknown as AssetInput, auth, optStr(body.id)), 'Cylinder saved.');
});

/** Bulk import: { rows: [{ serialNo, productName, manufacturer, mfgDate, lastTestDate, … }] } */
export const PUT = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'ops.manage', { write: true });
  const body = await readJson(request);
  const rows = Array.isArray(body.rows) ? (body.rows as AssetInput[]) : [];
  if (!rows.length) throw badRequest('Nothing to import.');
  if (rows.length > 5000) throw badRequest('Import at most 5000 cylinders at a time.');
  const r = await importAssets(auth.tenantId, rows, auth);
  return ok(r, `${r.added} added, ${r.updated} updated${r.errors.length ? `, ${r.errors.length} errors` : ''}.`);
});
