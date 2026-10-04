import { gstinProblem } from '@/lib/gst';
import { requireAuth } from '@/lib/server/auth';
import { lookupGstin } from '@/lib/server/gstLookup';
import { badRequest, handle, ok } from '@/lib/server/http';

/** GET ?gstin= → registered name, trade name, address and status from the GST service. */
export const GET = handle(async (request: Request) => {
  await requireAuth(request, 'customers.view');
  const gstin = (new URL(request.url).searchParams.get('gstin') || '').trim().toUpperCase();
  const problem = gstinProblem(gstin);
  if (problem) throw badRequest(problem);
  return ok(await lookupGstin(gstin));
});
