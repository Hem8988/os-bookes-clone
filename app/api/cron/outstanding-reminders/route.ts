import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { PAYMENT_TERMS } from '@/lib/settings';
import { ApiError, handle, ok } from '@/lib/server/http';
import { notifyCustomer } from '@/lib/server/notify';
import { getSetting } from '@/lib/server/settings';

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Weekly outstanding reminder (SRS §13.3). Call daily from a scheduler with
 * `Authorization: Bearer $CRON_SECRET`; it only sends on the configured weekday
 * unless ?force=1.
 */
export const POST = handle(async (request: Request) => {
  if (!authorised(request)) throw new ApiError(401, 'Unauthorised.', 'UNAUTHORIZED');
  const operations = await getSetting(TENANT, 'operations');
  const force = new URL(request.url).searchParams.get('force') === '1';
  if (!force && new Date().getDay() !== operations.outstandingReminderWeekday) return ok({ skipped: true });

  const customers = await prisma.customer.findMany({ where: { tenantId: TENANT, type: 'Customer', status: 'ACTIVE', balance: { gt: 0 } } });
  let sent = 0;
  for (const customer of customers) {
    const term = PAYMENT_TERMS.find((t) => t.value === customer.paymentTerms)?.label || customer.paymentTerms;
    await notifyCustomer(TENANT, customer, 'OUTSTANDING_REMINDER', { outstanding: customer.balance.toLocaleString('en-IN'), paymentTerms: term }, 'Outstanding balance reminder');
    sent += 1;
  }
  return ok({ sent });
});
