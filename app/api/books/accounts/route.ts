import { fyStart } from '@/lib/books';
import { transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { saveLedger } from '@/lib/server/books/entries';
import { accountBalances } from '@/lib/server/books/reports';
import { syncBooks } from '@/lib/server/books/sync';
import { businessDate, handle, num, ok, optStr, readJson, str } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';

/** Chart of accounts with financial-year-to-date balances. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  await syncBooks(auth.tenantId);
  const to = businessDate();
  const books = await getSetting(auth.tenantId, 'books');
  return ok(await accountBalances(auth.tenantId, fyStart(to, books.fyStartMonth), to));
});

/** Create or edit a ledger. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const saved = await transaction((tx) =>
    saveLedger(tx, auth, {
      id: optStr(body.id),
      name: str(body.name, 'Name', { required: true, max: 100 }),
      groupName: str(body.groupName, 'Group', { required: true }),
      openingBalance: num(body.openingBalance, 'Opening balance'),
      gstin: optStr(body.gstin),
      notes: optStr(body.notes),
      active: body.active !== false,
    })
  );
  return ok(saved, 'Ledger saved.');
});
