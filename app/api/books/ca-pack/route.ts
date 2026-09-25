import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { buildCaWorkbook, buildTallyMasters, buildTallyVouchers, emailCaPack } from '@/lib/server/books/capack';
import { emailReady } from '@/lib/server/messaging/email';
import { badRequest, handle, num, ok, readJson } from '@/lib/server/http';
import { getSetting, saveSetting } from '@/lib/server/settings';

const monthOf = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw badRequest('Choose a month (YYYY-MM).');
  return v;
};

/** GET ?month=YYYY-MM&format=xlsx|tally-masters|tally-vouchers → file download; without format → pack settings + send log. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  if (!format) {
    const [settings, log] = await Promise.all([
      getSetting(auth.tenantId, 'books'),
      prisma.messageLog.findMany({ where: { tenantId: auth.tenantId, templateKey: 'CA_PACK' }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, recipient: true, subject: true, status: true, error: true, createdAt: true } }),
    ]);
    return ok({ settings, log, emailConfigured: await emailReady(auth.tenantId) });
  }
  const month = monthOf(url.searchParams.get('month'));
  const file = format === 'tally-masters' ? await buildTallyMasters(auth.tenantId, month) : format === 'tally-vouchers' || format === 'tally' ? await buildTallyVouchers(auth.tenantId, month) : await buildCaWorkbook(auth.tenantId, month);
  await audit(prisma, auth, { action: 'CA_PACK_DOWNLOADED', entityType: 'Books', reference: `${month} ${format}` });
  return new Response(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': format.startsWith('tally') ? 'application/xml; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});

/** Email the month's pack to the CA now. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const month = monthOf(body.month);
  try {
    const result = await emailCaPack(auth.tenantId, month);
    await audit(prisma, auth, { action: 'CA_PACK_EMAILED', entityType: 'Books', reference: month, newValue: result });
    return ok(result, result.status === 'SENT' ? `Sent to ${result.sentTo.join(', ')}.` : 'Email is not configured (SMTP) — the send was only logged.');
  } catch (e) {
    throw badRequest(e instanceof Error ? e.message : 'Could not send the pack.');
  }
});

/** Save CA email / auto-send / financial-year settings. */
export const PUT = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const email = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const caEmail = email(body.caEmail);
  if (caEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(caEmail)) throw badRequest('Enter a valid CA email.');
  const autoSendDay = num(body.autoSendDay, 'Auto-send day', { min: 0 });
  if (autoSendDay > 28) throw badRequest('Auto-send day must be between 1 and 28 (0 = off).');
  const fyStartMonth = num(body.fyStartMonth || DEFAULT_SETTINGS.books.fyStartMonth, 'Financial year start', { min: 1 });
  if (fyStartMonth > 12) throw badRequest('Financial year start must be a month (1–12).');
  const before = await getSetting(auth.tenantId, 'books');
  const saved = await saveSetting(auth.tenantId, 'books', { caName: email(body.caName), caEmail, ccEmails: email(body.ccEmails), autoSendDay: Math.floor(autoSendDay), fyStartMonth: Math.floor(fyStartMonth) }, auth.name);
  await audit(prisma, auth, { action: 'SETTINGS_UPDATED', entityType: 'Setting', entityId: 'books', oldValue: before, newValue: saved });
  return ok(saved, 'CA pack settings saved.');
});
