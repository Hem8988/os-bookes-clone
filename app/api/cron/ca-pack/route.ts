import { timingSafeEqual } from 'crypto';
import { ApiError, handle, ok } from '@/lib/server/http';
import { caPackJob } from '@/lib/server/jobs';

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
 * Monthly CA pack. The in-app scheduler already runs it; an external scheduler
 * may also call this with `Authorization: Bearer $CRON_SECRET` — last month's pack
 * is still emailed only once. ?force=1&month=YYYY-MM sends now.
 */
export const POST = handle(async (request: Request) => {
  if (!authorised(request)) throw new ApiError(401, 'Unauthorised.', 'UNAUTHORIZED');
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month')! : undefined;
  return ok(await caPackJob(TENANT, { force, month }));
});
