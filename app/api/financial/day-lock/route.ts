import { prisma, transaction } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { closingSummary, lockDay, reopenDay, requestDayReopen } from '@/lib/server/closing';
import { Effects } from '@/lib/server/effects';
import { badRequest, businessDate, forbidden, handle, ok, optStr, readJson, str } from '@/lib/server/http';

/** Accountant day closing: reconciliation summary, lock, re-open (SRS §12). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'dayclose.perform');
  const url = new URL(request.url);
  if (url.searchParams.get('history')) {
    return ok(await prisma.dailyClosing.findMany({ where: { tenantId: auth.tenantId }, orderBy: { date: 'desc' }, take: 60 }));
  }
  return ok(await closingSummary(prisma, auth.tenantId, url.searchParams.get('date') || businessDate()));
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const body = await readJson(request);
  const action = String(body.action || '');
  const date = str(body.date, 'Date', { required: true });
  const effects = new Effects();
  const message = await transaction(async (tx) => {
    if (action === 'LOCK_DAY') {
      if (!can(auth.role, 'dayclose.perform')) throw forbidden();
      await lockDay(tx, auth, date, { force: !!body.force, notes: optStr(body.notes) || undefined });
      return `${date} locked. Entries for this date are now frozen.`;
    }
    if (action === 'REOPEN_DAY') {
      if (!can(auth.role, 'dayclose.reopen')) throw forbidden('Only the Super Admin can re-open a locked day.');
      await reopenDay(tx, auth, date, str(body.reason, 'Reason', { required: true, max: 300 }));
      return `${date} re-opened. This action is flagged in the audit log.`;
    }
    if (action === 'REQUEST_REOPEN') {
      if (!can(auth.role, 'dayclose.reopen.request')) throw forbidden();
      await requestDayReopen(tx, auth, { scope: 'ACCOUNTS', date, reason: str(body.reason, 'Reason', { required: true, max: 300 }) }, effects);
      return 'Re-open request sent to the admin.';
    }
    throw badRequest('Unknown action.');
  });
  effects.schedule();
  return ok(null, message);
});
