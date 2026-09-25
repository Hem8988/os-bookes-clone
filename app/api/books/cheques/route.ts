import { transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { businessDate, handle, num, ok, optStr, readJson, str } from '@/lib/server/http';
import { chequeRegister, updateCheque } from '@/lib/server/registers';

/** Cheques received: post-dated, deposited, cleared, bounced. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || businessDate();
  const from = url.searchParams.get('from') || `${to.slice(0, 7)}-01`;
  return ok(await chequeRegister(auth.tenantId, from, to));
});

/** { id, action: deposit | clear | bounce, date, reason?, charges? } */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const action = str(body.action, 'Action', { required: true }) as 'deposit' | 'clear' | 'bounce';
  const effects = new Effects();
  await transaction((tx) => updateCheque(tx, auth, str(body.id, 'Cheque', { required: true }), { action, date: str(body.date, 'Date', { required: true }), reason: optStr(body.reason), charges: num(body.charges, 'Charges', { min: 0 }) }, effects));
  effects.schedule();
  return ok(null, action === 'bounce' ? 'Cheque marked bounced — the amount is due again.' : action === 'clear' ? 'Cheque cleared.' : 'Cheque deposited.');
});
