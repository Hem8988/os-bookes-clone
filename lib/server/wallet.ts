import type { Db, Tx } from '@/lib/db';
import { round2 } from './http';

// Cash wallets (SRS §9.5): Opening + Collected − Submitted = Current.
export const COMPANY_WALLET = { ownerType: 'COMPANY', ownerId: 'COMPANY', ownerName: 'Company Cash' } as const;

export async function getWallet(db: Db, tenantId: string, ownerType: 'DELIVERY_BOY' | 'COMPANY', ownerId: string, ownerName: string) {
  return db.cashWallet.upsert({
    where: { tenantId_ownerType_ownerId: { tenantId, ownerType, ownerId } },
    create: { tenantId, ownerType, ownerId, ownerName },
    update: {},
  });
}

export async function postWallet(
  tx: Tx,
  walletId: string,
  entry: { type: 'OPENING' | 'COLLECTION' | 'SUBMISSION' | 'RECEIPT' | 'ADJUSTMENT' | 'REVERSAL'; amount: number; referenceType?: string; referenceId?: string; notes?: string; performedBy: string }
) {
  const amount = round2(entry.amount);
  if (amount === 0) return null;
  const wallet = await tx.cashWallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } });
  return tx.cashWalletTransaction.create({
    data: {
      walletId,
      type: entry.type,
      amount,
      balanceAfter: round2(wallet.balance),
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      notes: entry.notes,
      performedBy: entry.performedBy,
    },
  });
}

/** Cash a delivery boy can still submit (wallet minus submissions awaiting approval). */
export async function availableToSubmit(db: Db, tenantId: string, deliveryBoyId: string, deliveryBoyName: string) {
  const wallet = await getWallet(db, tenantId, 'DELIVERY_BOY', deliveryBoyId, deliveryBoyName);
  const pending = await db.cashSubmission.aggregate({ where: { tenantId, deliveryBoyId, status: 'PENDING' }, _sum: { amount: true } });
  return { wallet, pending: pending._sum.amount || 0, available: round2(wallet.balance - (pending._sum.amount || 0)) };
}
