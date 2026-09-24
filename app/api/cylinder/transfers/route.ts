import { prisma, transaction } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { forbidden, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { requestTransfer, TransferType } from '@/lib/server/stock';

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const where: Prisma.StockTransferWhereInput = { tenantId: auth.tenantId };
  if (auth.role === 'DELIVERY_BOY') where.OR = [{ fromId: auth.userId }, { toId: auth.userId }];
  else if (!can(auth.role, 'inventory.view')) throw forbidden();
  const transfers = await prisma.stockTransfer.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  return ok(transfers);
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'stock.transfer.request', { write: true });
  const body = await readJson(request);
  const effects = new Effects();
  const transfer = await transaction((tx) =>
    requestTransfer(
      tx,
      auth,
      {
        transferType: str(body.transferType, 'Transfer type', { required: true }) as TransferType,
        fromId: str(body.fromId, 'From', { required: true }),
        toId: str(body.toId, 'To', { required: true }),
        items: Array.isArray(body.items) ? (body.items as { productId: string; fullQty?: number; emptyQty?: number }[]) : [],
        notes: optStr(body.notes),
      },
      effects
    )
  );
  effects.schedule();
  return ok(transfer, `Transfer ${transfer.transferNumber} sent for approval.`);
});
