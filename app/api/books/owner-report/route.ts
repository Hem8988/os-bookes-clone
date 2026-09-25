import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, businessDate, handle, ok, readJson } from '@/lib/server/http';
import { dailySummary, sendOwnerReport } from '@/lib/server/ownerReport';

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Preview the owner's daily report for a date. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const date = new URL(request.url).searchParams.get('date');
  return ok(await dailySummary(auth.tenantId, isDate(date) ? date : businessDate()));
});

/** Send it now to the owner's phones / emails. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage', { write: true });
  const body = await readJson(request);
  const date = isDate(body.date) ? body.date : businessDate();
  try {
    const r = await sendOwnerReport(auth.tenantId, date);
    await audit(prisma, auth, { action: 'OWNER_REPORT_SENT', entityType: 'Report', reference: date, newValue: r.sentTo });
    return ok(r, `Sent to ${r.sentTo.map((s) => s.to).join(', ')}.`);
  } catch (e) {
    throw badRequest(e instanceof Error ? e.message : 'Could not send the report.');
  }
});
