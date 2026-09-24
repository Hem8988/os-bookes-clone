import { prisma, transaction } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, forbidden, handle, ok, optStr, readJson } from '@/lib/server/http';
import { getDefaultWarehouse } from '@/lib/server/inventory';
import { recordPlantMovement } from '@/lib/server/stock';
import { getWallet } from '@/lib/server/wallet';

/** Three-tier stock snapshot: warehouses, delivery boys, customer holdings. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  if (auth.role === 'DELIVERY_BOY') {
    const [stock, wallet] = await Promise.all([
      prisma.stockBalance.findMany({ where: { tenantId: auth.tenantId, locationType: 'DELIVERY_BOY', locationId: auth.userId }, orderBy: { productName: 'asc' } }),
      getWallet(prisma, auth.tenantId, 'DELIVERY_BOY', auth.userId, auth.name),
    ]);
    return ok({ stock, wallet });
  }
  if (!can(auth.role, 'inventory.view')) throw forbidden();

  await getDefaultWarehouse(prisma, auth.tenantId);
  const [warehouses, balances, boys, holdings, products, wallets] = await Promise.all([
    prisma.warehouse.findMany({ where: { tenantId: auth.tenantId, active: true }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }),
    prisma.stockBalance.findMany({ where: { tenantId: auth.tenantId }, orderBy: { productName: 'asc' } }),
    prisma.user.findMany({ where: { tenantId: auth.tenantId, role: 'DELIVERY_BOY' }, select: { id: true, name: true, status: true, mobile: true } }),
    prisma.customerCylinderBalance.groupBy({ by: ['productId', 'productName'], where: { tenantId: auth.tenantId }, _sum: { currentBalance: true, deliveredQtyTotal: true, emptyReceivedTotal: true } }),
    prisma.product.findMany({ where: { tenantId: auth.tenantId, active: true }, orderBy: { name: 'asc' } }),
    prisma.cashWallet.findMany({ where: { tenantId: auth.tenantId, ownerType: 'DELIVERY_BOY' } }),
  ]);
  const at = (type: string, id: string) => balances.filter((b) => b.locationType === type && b.locationId === id);
  return ok({
    products,
    warehouses: warehouses.map((w) => ({ ...w, stock: at('WAREHOUSE', w.id) })),
    deliveryBoys: boys.map((b) => ({ ...b, stock: at('DELIVERY_BOY', b.id), cash: wallets.find((w) => w.ownerId === b.id)?.balance || 0 })),
    customerHoldings: holdings.map((h) => ({ productId: h.productId, productName: h.productName, held: h._sum.currentBalance || 0, delivered: h._sum.deliveredQtyTotal || 0, emptiesReceived: h._sum.emptyReceivedTotal || 0 })),
  });
});

/** Plant receipt, empties sent for refill, or damaged cylinders at a godown. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'inventory.receive', { write: true });
  const body = await readJson(request);
  const kind = String(body.kind || '');
  if (!['RECEIPT', 'EMPTY_TO_PLANT', 'DAMAGE'].includes(kind)) throw badRequest('Kind must be RECEIPT, EMPTY_TO_PLANT or DAMAGE.');
  await transaction((tx) =>
    recordPlantMovement(tx, auth, {
      kind: kind as 'RECEIPT' | 'EMPTY_TO_PLANT' | 'DAMAGE',
      warehouseId: optStr(body.warehouseId) || undefined,
      items: Array.isArray(body.items) ? (body.items as { productId: string; fullQty?: number; emptyQty?: number }[]) : [],
      reference: optStr(body.reference),
      notes: optStr(body.notes),
    })
  );
  return ok(null, 'Stock updated.');
});
