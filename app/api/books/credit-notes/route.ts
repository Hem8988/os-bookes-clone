import { prisma, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { handle, num, ok, optStr, readJson, str } from '@/lib/server/http';
import { cancelCreditNote, createCreditNote, CreditNoteInput } from '@/lib/server/returns';

/**
 * GET ?from&to                 → credit notes of the period
 * GET ?invoicesFor=customerId  → that customer's invoices with what is left to credit
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const customerId = url.searchParams.get('invoicesFor');
  if (customerId) {
    const [invoices, notes] = await Promise.all([
      prisma.invoice.findMany({ where: { tenantId: auth.tenantId, customerId, status: { not: 'Cancelled' } }, include: { items: true }, orderBy: { date: 'desc' }, take: 100 }),
      prisma.creditNote.findMany({ where: { tenantId: auth.tenantId, customerId, status: 'Active', invoiceId: { not: null } }, include: { items: true } }),
    ]);
    return ok(
      invoices.map((i) => {
        const mine = notes.filter((n) => n.invoiceId === i.id);
        const credited = mine.reduce((s, n) => s + n.grandTotal, 0);
        return {
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          date: i.date,
          grandTotal: i.grandTotal,
          isIgst: i.isIgst,
          credited: Math.round(credited * 100) / 100,
          items: i.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            hsnCode: it.hsnCode,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
            returned: mine.filter((n) => n.stockReturned).flatMap((n) => n.items).filter((x) => x.productId === it.productId).reduce((s, x) => s + x.quantity, 0),
          })),
        };
      })
    );
  }
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  return ok(
    await prisma.creditNote.findMany({
      where: { tenantId: auth.tenantId, ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      include: { items: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    })
  );
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const note = await transaction((tx) =>
    createCreditNote(tx, auth, {
      date: str(body.date, 'Date', { required: true }),
      customerId: str(body.customerId, 'Customer', { required: true }),
      invoiceId: optStr(body.invoiceId),
      reason: str(body.reason, 'Reason', { required: true }) as CreditNoteInput['reason'],
      returnStock: body.returnStock === true,
      warehouseId: optStr(body.warehouseId),
      refundMode: (optStr(body.refundMode) || 'NONE') as CreditNoteInput['refundMode'],
      refundAccountId: optStr(body.refundAccountId),
      refundAmount: num(body.refundAmount, 'Refund', { min: 0 }),
      notes: optStr(body.notes),
      items: Array.isArray(body.items) ? (body.items as CreditNoteInput['items']) : [],
    })
  );
  return ok(note, `Credit note ${note.noteNumber} saved.`);
});

export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const id = str(body.id, 'Credit note', { required: true });
  const reason = str(body.reason, 'Reason', { required: true, max: 300 });
  await transaction((tx) => cancelCreditNote(tx, auth, id, reason));
  return ok(null, 'Credit note cancelled.');
});
