import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, num, ok, readJson } from '@/lib/server/http';
import { emailReady, sendEmail, verifySmtp } from '@/lib/server/messaging/email';
import { seal } from '@/lib/server/secretBox';
import { getSetting, saveSetting } from '@/lib/server/settings';

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/** SMTP settings without the password (only whether one is stored). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage');
  const s = await getSetting(auth.tenantId, 'email');
  return ok({
    host: s.host,
    port: s.port,
    secure: s.secure,
    user: s.user,
    from: s.from,
    hasPassword: !!s.passwordSealed,
    source: s.host ? 'settings' : process.env.SMTP_HOST ? 'env' : 'none',
    ready: await emailReady(auth.tenantId),
  });
});

/** Save SMTP settings. A blank password keeps the stored one; clearPassword removes it. */
export const PUT = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage', { write: true });
  const body = await readJson(request);
  const before = await getSetting(auth.tenantId, 'email');
  const host = text(body.host).toLowerCase();
  const port = num(body.port || 587, 'Port', { min: 1 });
  if (port > 65535) throw badRequest('Port must be between 1 and 65535.');
  const user = text(body.user);
  const from = text(body.from);
  if (host && !/^[a-z0-9.-]+$/.test(host)) throw badRequest('Enter the SMTP server name, e.g. smtp.gmail.com.');
  if (from && !isEmail(from.replace(/^.*<([^>]+)>\s*$/, '$1'))) throw badRequest('From must be an email address, e.g. accounts@yourfirm.in or "Firm Name <accounts@yourfirm.in>".');
  const password = typeof body.password === 'string' ? body.password : '';
  let passwordSealed = before.passwordSealed;
  try {
    if (body.clearPassword === true) passwordSealed = '';
    else if (password) passwordSealed = seal(password);
  } catch (e) {
    throw badRequest(e instanceof Error ? e.message : 'Could not store the password.');
  }
  const saved = await saveSetting(auth.tenantId, 'email', { host, port, secure: body.secure === true || port === 465, user, from, passwordSealed }, auth.name);
  // Never log the sealed password itself.
  const redact = (x: typeof saved) => ({ ...x, passwordSealed: x.passwordSealed ? '••••' : '' });
  await audit(prisma, auth, { action: 'SETTINGS_UPDATED', entityType: 'Setting', entityId: 'email', oldValue: redact(before), newValue: redact(saved), sensitive: true });
  return ok({ saved: true }, 'Email settings saved.');
});

/** Log in to the SMTP server and send a test email. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage', { write: true });
  const body = await readJson(request);
  const to = text(body.to) || auth.email;
  if (!isEmail(to)) throw badRequest('Enter the email address to send the test to.');
  try {
    await verifySmtp(auth.tenantId);
  } catch (e) {
    throw badRequest(`Could not log in to the email server: ${e instanceof Error ? e.message : String(e)}`);
  }
  const company = await getSetting(auth.tenantId, 'company');
  const r = await sendEmail(auth.tenantId, to, `Test email — ${company.name}`, `This is a test from DeskShark.\n\nIf you can read this, email is working: CA packs, invoices and reminders will be delivered.\n\nSent by ${auth.name}.`, 'SMTP_TEST');
  if (r.status === 'FAILED') throw badRequest(`Sending failed: ${r.error}`);
  return ok({ to }, `Test email sent to ${to}.`);
});
