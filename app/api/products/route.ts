import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { handle, ok } from '@/lib/server/http';

/** Active products for order forms (staff, delivery app and customer portal). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const products = await prisma.product.findMany({
    where: { tenantId: auth.tenantId, active: true },
    // Cost price is internal: only for office roles (purchase bills, stock value).
    select: { id: true, sku: true, name: true, productHindiName: true, category: true, productType: true, gasType: true, weightVolume: true, weightUnit: true, salePrice: true, taxRate: true, hsnCode: true, unit: true, emptyDepositValue: true, image: true, purchasePrice: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(auth.role) },
    orderBy: { name: 'asc' },
  });
  return ok(products);
});
