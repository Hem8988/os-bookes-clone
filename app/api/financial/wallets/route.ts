import { prisma } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, ok } from '@/lib/server/http';
import { availableToSubmit, COMPANY_WALLET, getWallet } from '@/lib/server/wallet';

/** Cash wallets: own wallet for a delivery boy, all wallets for accounts/admin. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  if (auth.role === 'DELIVERY_BOY') {
    const info = await availableToSubmit(prisma, auth.tenantId, auth.userId, auth.name);
    const transactions = await prisma.cashWalletTransaction.findMany({ where: { walletId: info.wallet.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    const receivers = await prisma.user.findMany({ where: { tenantId: auth.tenantId, role: { in: ['ACCOUNTANT', 'SUPER_ADMIN'] }, status: 'ACTIVE' }, select: { id: true, name: true, role: true } });
    return ok({ ...info, transactions, receivers });
  }
  if (!can(auth.role, 'wallet.viewAll')) throw forbidden();
  await getWallet(prisma, auth.tenantId, 'COMPANY', COMPANY_WALLET.ownerId, COMPANY_WALLET.ownerName);
  const walletId = url.searchParams.get('walletId');
  if (walletId) {
    return ok(await prisma.cashWalletTransaction.findMany({ where: { walletId, wallet: { tenantId: auth.tenantId } }, orderBy: { createdAt: 'desc' }, take: 200 }));
  }
  const [wallets, pending] = await Promise.all([
    prisma.cashWallet.findMany({ where: { tenantId: auth.tenantId }, orderBy: [{ ownerType: 'asc' }, { ownerName: 'asc' }] }),
    prisma.cashSubmission.groupBy({ by: ['deliveryBoyId'], where: { tenantId: auth.tenantId, status: 'PENDING' }, _sum: { amount: true } }),
  ]);
  return ok(wallets.map((w) => ({ ...w, pendingSubmission: pending.find((p) => p.deliveryBoyId === w.ownerId)?._sum.amount || 0 })));
});
