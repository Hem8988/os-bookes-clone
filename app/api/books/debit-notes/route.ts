import { prisma, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { cancelDebitNote, createDebitNote, DebitNoteInput } from '@/lib/server/returns';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  return ok(
    await prisma.debitNote.findMany({
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
    createDebitNote(tx, auth, {
      date: str(body.date, 'Date', { required: true }),
      supplierId: str(body.supplierId, 'Supplier', { required: true }),
      purchaseBillId: optStr(body.purchaseBillId),
      reason: str(body.reason, 'Reason', { required: true }) as DebitNoteInput['reason'],
      returnStock: body.returnStock === true,
      warehouseId: optStr(body.warehouseId),
      itcReversed: body.itcReversed !== false,
      notes: optStr(body.notes),
      items: Array.isArray(body.items) ? (body.items as DebitNoteInput['items']) : [],
    })
  );
  return ok(note, `Debit note ${note.noteNumber} saved.`);
});

export const PATCH = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const id = str(body.id, 'Debit note', { required: true });
  const reason = str(body.reason, 'Reason', { required: true, max: 300 });
  await transaction((tx) => cancelDebitNote(tx, auth, id, reason));
  return ok(null, 'Debit note cancelled.');
});
