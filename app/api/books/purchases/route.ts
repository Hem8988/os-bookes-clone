import { prisma, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { cancelPurchaseBill, PurchaseBillInput, savePurchaseBill } from '@/lib/server/books/entries';
import { handle, ok, optStr, readJson, str } from '@/lib/server/http';

/** Purchase bills, newest first (optionally for one month / supplier). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const supplierId = url.searchParams.get('supplierId');
  const bills = await prisma.purchaseBill.findMany({
    where: { tenantId: auth.tenantId, ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(supplierId ? { supplierId } : {}) },
    include: { items: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });
  return ok(bills);
});

/** Create (or edit an unpaid, stock-free) purchase bill. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const bill = await transaction((tx) =>
    savePurchaseBill(
      tx,
      auth,
      {
        supplierId: str(body.supplierId, 'Supplier', { required: true }),
        supplierInvoiceNo: str(body.supplierInvoiceNo, 'Supplier invoice number', { required: true, max: 40 }),
        date: str(body.date, 'Date', { required: true }),
        dueDate: optStr(body.dueDate),
        itcEligible: body.itcEligible !== false,
        receiveStock: body.receiveStock === true,
        warehouseId: optStr(body.warehouseId),
        notes: optStr(body.notes),
        items: Array.isArray(body.items) ? (body.items as PurchaseBillInput['items']) : [],
      },
      optStr(body.id)
    )
  );
  return ok(bill, `Purchase bill ${bill.billNumber} saved.`);
});

/** Cancel a bill (reverses the stock it brought in). */
export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const id = str(body.id, 'Bill', { required: true });
  const reason = str(body.reason, 'Reason', { required: true, max: 300 });
  await transaction((tx) => cancelPurchaseBill(tx, auth, id, reason));
  return ok(null, 'Purchase bill cancelled.');
});
