import { prisma, Prisma } from '@/lib/db';
import { PAYMENT_TERMS } from '@/lib/settings';
import { emailCaPack } from './books/capack';
import { businessDate } from './http';
import { notifyCustomer } from './notify';
import { sendOwnerReport } from './ownerReport';
import { runReorders, sendMonthlyStatements } from './reorder';
import { getSetting } from './settings';

// Recurring jobs (monthly CA pack, weekly outstanding reminders). They run from
// the in-app scheduler and from the /api/cron routes; a job is "claimed" for its
// period atomically, so it runs once per period even with several app copies.

/** Atomically mark job `name` as done for `period`; false when it already ran. */
export async function claimJob(tenantId: string, name: string, period: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ key: string }[]>(Prisma.sql`
    INSERT INTO settings ("tenantId", key, value, "updatedBy", "updatedAt")
    VALUES (${tenantId}, ${`job:${name}`}, jsonb_build_object('period', ${period}::text, 'at', now()::text), 'scheduler', now())
    ON CONFLICT ("tenantId", key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()
    WHERE settings.value->>'period' IS DISTINCT FROM ${period}::text
    RETURNING key`);
  return rows.length > 0;
}

/** Undo a claim when the job failed, so the next run tries again. */
async function releaseJob(tenantId: string, name: string) {
  await prisma.setting.deleteMany({ where: { tenantId, key: `job:${name}` } });
}

async function runClaimed(tenantId: string, name: string, period: string, fn: () => Promise<unknown>) {
  if (!(await claimJob(tenantId, name, period))) return { skipped: true as const, reason: `already done for ${period}` };
  try {
    return { done: true as const, period, result: await fn() };
  } catch (e) {
    await releaseJob(tenantId, name);
    throw e;
  }
}

/** India time parts for scheduling. */
function nowIst(at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find((p) => p.type === 'weekday')?.value || 'Sun');
  const date = businessDate(at);
  return { date, hour, weekday, day: Number(date.slice(8, 10)) };
}

const previousMonth = (date: string) => {
  const [y, m] = date.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

export async function sendOutstandingReminders(tenantId: string) {
  const customers = await prisma.customer.findMany({ where: { tenantId, type: 'Customer', status: 'ACTIVE', balance: { gt: 0 } } });
  for (const customer of customers) {
    const term = PAYMENT_TERMS.find((t) => t.value === customer.paymentTerms)?.label || customer.paymentTerms;
    await notifyCustomer(tenantId, customer, 'OUTSTANDING_REMINDER', { outstanding: customer.balance.toLocaleString('en-IN'), paymentTerms: term }, 'Outstanding balance reminder');
  }
  return { sent: customers.length };
}

/** Monthly CA pack: on/after the configured day (from 9 AM), last month's pack, once. */
export async function caPackJob(tenantId: string, opts: { force?: boolean; month?: string } = {}) {
  const books = await getSetting(tenantId, 'books');
  const t = nowIst();
  if (!opts.force && (!books.autoSendDay || !books.caEmail || t.day < books.autoSendDay || t.hour < 9)) return { skipped: true as const, reason: 'not due' };
  const month = opts.month || previousMonth(t.date);
  if (opts.force) return { done: true as const, period: month, result: await emailCaPack(tenantId, month) };
  return runClaimed(tenantId, 'ca-pack', month, () => emailCaPack(tenantId, month));
}

/** Weekly outstanding reminder on the configured weekday (from 10 AM), once per day. */
export async function remindersJob(tenantId: string, opts: { force?: boolean } = {}) {
  const operations = await getSetting(tenantId, 'operations');
  const t = nowIst();
  if (opts.force) return { done: true as const, period: t.date, result: await sendOutstandingReminders(tenantId) };
  if (t.weekday !== operations.outstandingReminderWeekday || t.hour < 10) return { skipped: true as const, reason: 'not due' };
  return runClaimed(tenantId, 'outstanding-reminders', t.date, () => sendOutstandingReminders(tenantId));
}

/** Owner's end-of-day summary at the configured hour, once per day. */
export async function ownerReportJob(tenantId: string, opts: { force?: boolean; date?: string } = {}) {
  const policy = await getSetting(tenantId, 'owner');
  const t = nowIst();
  const date = opts.date || t.date;
  if (opts.force) return { done: true as const, period: date, result: await sendOwnerReport(tenantId, date) };
  if (!policy.enabled || t.hour < (policy.hour ?? 21) || (!policy.phones.trim() && !policy.emails.trim())) return { skipped: true as const, reason: 'not due' };
  return runClaimed(tenantId, 'owner-report', date, () => sendOwnerReport(tenantId, date));
}

/** Refill reminders / auto-orders from 8 AM, once per day. */
export async function reorderJob(tenantId: string, opts: { force?: boolean } = {}) {
  const t = nowIst();
  if (opts.force) return { done: true as const, period: t.date, result: await runReorders(tenantId, t.date) };
  if (t.hour < 8) return { skipped: true as const, reason: 'not due' };
  return runClaimed(tenantId, 'reorders', t.date, () => runReorders(tenantId, t.date));
}

/** Last month's statement to every customer on the configured day (from 10 AM), once per month. */
export async function statementsJob(tenantId: string, opts: { force?: boolean; month?: string } = {}) {
  const operations = await getSetting(tenantId, 'operations');
  const t = nowIst();
  const month = opts.month || previousMonth(t.date);
  if (opts.force) return { done: true as const, period: month, result: await sendMonthlyStatements(tenantId, month) };
  if (!operations.statementDay || t.day < operations.statementDay || t.hour < 10) return { skipped: true as const, reason: 'not due' };
  return runClaimed(tenantId, 'monthly-statements', month, () => sendMonthlyStatements(tenantId, month));
}

/** Everything due right now, for every tenant. Errors are logged, never thrown. */
export async function runDueJobs() {
  const tenants = (await prisma.user.findMany({ distinct: ['tenantId'], select: { tenantId: true } })).map((u) => u.tenantId);
  for (const tenantId of tenants.length ? tenants : [process.env.DEFAULT_TENANT_ID || 'default']) {
    for (const [name, job] of [['ca-pack', caPackJob], ['outstanding-reminders', remindersJob], ['owner-report', ownerReportJob], ['reorders', reorderJob], ['monthly-statements', statementsJob]] as const) {
      try {
        const r = await job(tenantId);
        if ('done' in r) console.log(`[scheduler] ${name} (${tenantId}) done for ${r.period}`);
      } catch (e) {
        console.error(`[scheduler] ${name} (${tenantId}) failed:`, e instanceof Error ? e.message : e);
      }
    }
  }
}
