import { fyStart } from '@/lib/books';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, businessDate, handle, notFound, ok } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';
import {
  balanceSheet,
  booksOverview,
  cashBankBook,
  cylinderHoldings,
  dayBook,
  dayClosings,
  expenseRegister,
  gstr1,
  gstr3b,
  ledgerStatement,
  partySummary,
  payables,
  profitAndLoss,
  purchaseRegister,
  receiptsRegister,
  receivablesAgeing,
  salesRegister,
  stockSummary,
  trialBalance,
} from '@/lib/server/books/reports';
import { syncBooks } from '@/lib/server/books/sync';

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Books of accounts reports: GET /api/books?report=…&from=YYYY-MM-DD&to=YYYY-MM-DD */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const report = url.searchParams.get('report') || 'overview';
  const today = businessDate();
  const books = await getSetting(auth.tenantId, 'books');
  const to = isDate(url.searchParams.get('to')) ? url.searchParams.get('to')! : today;
  const from = isDate(url.searchParams.get('from')) ? url.searchParams.get('from')! : fyStart(to, books.fyStartMonth);
  if (from > to) throw badRequest('From date must be before To date.');
  const t = auth.tenantId;

  await syncBooks(t);

  switch (report) {
    case 'overview':
      return ok(await booksOverview(t, from, to));
    case 'trial-balance':
      return ok(await trialBalance(t, from, to));
    case 'pl':
      return ok(await profitAndLoss(t, from, to));
    case 'balance-sheet':
      return ok(await balanceSheet(t, to));
    case 'day-book':
      return ok(await dayBook(t, from, to, url.searchParams.get('type')));
    case 'cash-book':
      return ok(await cashBankBook(t, 'CASH', from, to));
    case 'bank-book':
      return ok(await cashBankBook(t, 'BANK', from, to));
    case 'ledger': {
      const accountId = url.searchParams.get('accountId');
      if (!accountId) throw badRequest('Choose a ledger.');
      const statement = await ledgerStatement(t, accountId, from, to);
      if (!statement) throw notFound('Ledger not found.');
      return ok(statement);
    }
    case 'gstr1':
      return ok(await gstr1(t, from, to));
    case 'gstr3b':
      return ok(await gstr3b(t, from, to));
    case 'sales-register':
      return ok(await salesRegister(t, from, to));
    case 'purchase-register':
      return ok(await purchaseRegister(t, from, to));
    case 'expense-register':
      return ok(await expenseRegister(t, from, to));
    case 'receipts':
      return ok(await receiptsRegister(t, from, to));
    case 'ageing':
      return ok(await receivablesAgeing(t, to));
    case 'parties':
      return ok(await partySummary(t, from, to));
    case 'payables':
      return ok(await payables(t, to));
    case 'stock':
      return ok(await stockSummary(t, from, to));
    case 'cylinders':
      return ok(await cylinderHoldings(t));
    case 'closings':
      return ok(await dayClosings(t, from, to));
    default:
      throw badRequest('Unknown report.');
  }
});
