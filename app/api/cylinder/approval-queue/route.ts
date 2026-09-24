import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { requireAuth } from '@/lib/server/auth';
import { decideApproval } from '@/lib/server/approvalDecision';
import { badRequest, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { withShortNames } from '@/lib/server/shortNames';

/**
 * Central approval queue (SRS §8). Each role sees what it may decide; the
 * detail of every referenced record is attached for side-by-side review.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'approvals.view');
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'PENDING';
  const where: Prisma.ApprovalRequestWhereInput = { tenantId: auth.tenantId, status };
  const type = url.searchParams.get('type');
  if (type) where.type = { in: type.split(',') };
  if (url.searchParams.get('mine') !== 'false' && auth.role !== 'SUPER_ADMIN') where.approverRoles = { has: auth.role };

  const items = await prisma.approvalRequest.findMany({ where, include: { logs: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' }, take: 200 });

  // Attach the referenced records so the reviewer sees everything at once.
  const ids = (t: string) => items.filter((i) => i.referenceType === t && i.referenceId).map((i) => i.referenceId!);
  const [rawOrders, rawDeliveries, rawPayments, cash, transfers, invoices, devices] = await Promise.all([
    prisma.order.findMany({ where: { id: { in: ids('ORDER') } }, include: { items: true, customer: { select: { balance: true, creditLimit: true, phone: true } } } }),
    prisma.delivery.findMany({ where: { id: { in: ids('DELIVERY') } }, include: { items: true, order: { include: { items: true } } } }),
    prisma.payment.findMany({ where: { id: { in: ids('PAYMENT') } } }),
    prisma.cashSubmission.findMany({ where: { id: { in: ids('CASH_SUBMISSION') } } }),
    prisma.stockTransfer.findMany({ where: { id: { in: ids('STOCK_TRANSFER') } }, include: { items: true } }),
    prisma.invoice.findMany({ where: { id: { in: ids('INVOICE') } }, include: { items: true } }),
    prisma.userDevice.findMany({ where: { id: { in: ids('DEVICE') } }, include: { user: { select: { name: true, mobile: true } } } }),
  ]);
  const [orders, deliveries, payments] = await Promise.all([withShortNames(auth.tenantId, rawOrders), withShortNames(auth.tenantId, rawDeliveries), withShortNames(auth.tenantId, rawPayments)]);
  // Invoice raised when a delivery was verified, so the reviewer can open / print it.
  const deliveryInvoices = deliveries.length ? await prisma.invoice.findMany({ where: { tenantId: auth.tenantId, deliveryId: { in: deliveries.map((d) => d.id) } }, include: { items: true } }) : [];
  const withInvoice = deliveries.map((d) => ({ ...d, invoice: deliveryInvoices.find((i) => i.deliveryId === d.id) ?? null }));
  const byId = new Map<string, unknown>([...orders, ...withInvoice, ...payments, ...cash, ...transfers, ...invoices, ...devices].map((r) => [r.id, r]));
  return ok(items.map((i) => ({ ...i, reference: i.referenceId ? byId.get(i.referenceId) ?? null : null })));
});

/** { itemId, action: 'APPROVE' | 'REJECT', note } */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'approvals.view', { write: true });
  const body = await readJson(request);
  const action = String(body.action || '').toUpperCase();
  if (action !== 'APPROVE' && action !== 'REJECT') throw badRequest('Action must be APPROVE or REJECT.');
  const item = await decideApproval(auth, str(body.itemId, 'Item', { required: true }), action, optStr(body.note));
  return ok(item, action === 'APPROVE' ? 'Approved.' : 'Rejected.');
});
