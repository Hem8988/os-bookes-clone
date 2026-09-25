import { prisma, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { cancelExpense, ExpenseInput, saveExpense } from '@/lib/server/books/entries';
import { handle, num, ok, optStr, readJson, str } from '@/lib/server/http';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const rows = await prisma.expenseEntry.findMany({
    where: { tenantId: auth.tenantId, ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 1000,
  });
  return ok(rows);
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const saved = await transaction((tx) =>
    saveExpense(
      tx,
      auth,
      {
        date: str(body.date, 'Date', { required: true }),
        headName: str(body.headName, 'Expense head', { required: true, max: 80 }),
        description: optStr(body.description),
        amount: num(body.amount, 'Amount', { required: true, min: 0 }),
        gstRate: num(body.gstRate, 'GST rate', { min: 0 }),
        paidFrom: str(body.paidFrom, 'Paid from', { required: true }) as ExpenseInput['paidFrom'],
        paidAccountId: optStr(body.paidAccountId),
        supplierId: optStr(body.supplierId),
        supplierGstin: optStr(body.supplierGstin),
        billNumber: optStr(body.billNumber),
        attachmentUrl: optStr(body.attachmentUrl),
      },
      optStr(body.id)
    )
  );
  return ok(saved, `Expense ${saved.entryNumber} saved.`);
});

export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const id = str(body.id, 'Expense', { required: true });
  const reason = str(body.reason, 'Reason', { required: true, max: 300 });
  await transaction((tx) => cancelExpense(tx, auth, id, reason));
  return ok(null, 'Expense cancelled.');
});
