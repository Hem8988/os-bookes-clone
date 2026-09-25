import { timingSafeEqual } from 'crypto';
import { ApiError, handle, ok } from '@/lib/server/http';
import { remindersJob } from '@/lib/server/jobs';

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
 * Weekly outstanding reminder (SRS §13.3). The in-app scheduler already runs it;
 * an external scheduler may also call this with `Authorization: Bearer $CRON_SECRET`
 * — it still sends only once on the configured weekday. ?force=1 sends now.
 */
export const POST = handle(async (request: Request) => {
  if (!authorised(request)) throw new ApiError(401, 'Unauthorised.', 'UNAUTHORIZED');
  const force = new URL(request.url).searchParams.get('force') === '1';
  return ok(await remindersJob(TENANT, { force }));
});
