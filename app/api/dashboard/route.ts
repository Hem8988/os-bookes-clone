import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { businessDate, handle, ok, round2 } from '@/lib/server/http';

/** KPIs for the dashboard, scoped to the user's role. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'dashboard.view');
  const tenantId = auth.tenantId;
  const today = businessDate();

  const [ordersByStatus, approvals, deliveriesToday, paymentsToday, outstanding, stock, wallets, lowStock, closing] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: { tenantId, requestedDeliveryDate: today }, _count: true }),
    prisma.approvalRequest.groupBy({ by: ['type'], where: { tenantId, status: 'PENDING', ...(auth.role === 'SUPER_ADMIN' ? {} : { approverRoles: { has: auth.role } }) }, _count: true }),
    prisma.delivery.findMany({ where: { tenantId, deliveryDate: today }, select: { deliveredQtyTotal: true, emptyReceivedTotal: true, paymentMode: true, paymentAmount: true, invoiceAmount: true, status: true } }),
    prisma.payment.aggregate({ where: { tenantId, paymentDate: today, status: 'VERIFIED' }, _sum: { amount: true } }),
    prisma.customer.aggregate({ where: { tenantId, type: 'Customer', balance: { gt: 0 } }, _sum: { balance: true }, _count: true }),
    prisma.stockBalance.groupBy({ by: ['locationType', 'productName'], where: { tenantId }, _sum: { fullQty: true, emptyQty: true } }),
    prisma.cashWallet.findMany({ where: { tenantId }, select: { ownerType: true, ownerName: true, balance: true } }),
    prisma.product.findMany({ where: { tenantId, active: true, minStockAlert: { gt: 0 } }, select: { name: true, stock: true, minStockAlert: true } }),
    prisma.dailyClosing.findUnique({ where: { tenantId_date: { tenantId, date: today } } }),
  ]);

  const sum = (rows: typeof deliveriesToday, pick: (d: (typeof deliveriesToday)[number]) => number) => round2(rows.reduce((s, d) => s + pick(d), 0));
  return ok({
    date: today,
    dayStatus: closing?.status || 'OPEN',
    orders: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
    pendingApprovals: Object.fromEntries(approvals.map((a) => [a.type, a._count])),
    deliveries: {
      count: deliveriesToday.length,
      cylinders: sum(deliveriesToday, (d) => d.deliveredQtyTotal),
      empties: sum(deliveriesToday, (d) => d.emptyReceivedTotal),
      pendingVerification: deliveriesToday.filter((d) => d.status === 'PENDING_VERIFICATION').length,
      sales: sum(deliveriesToday, (d) => d.invoiceAmount),
    },
    collections: {
      cash: sum(deliveriesToday.filter((d) => d.paymentMode === 'CASH'), (d) => d.paymentAmount),
      online: sum(deliveriesToday.filter((d) => d.paymentMode === 'ONLINE'), (d) => d.paymentAmount),
      cheque: sum(deliveriesToday.filter((d) => d.paymentMode === 'CHEQUE'), (d) => d.paymentAmount),
      credit: sum(deliveriesToday, (d) => Math.max(d.invoiceAmount - d.paymentAmount, 0)),
      latePayments: paymentsToday._sum.amount || 0,
    },
    outstanding: { total: round2(outstanding._sum.balance || 0), customers: outstanding._count },
    stock: stock.map((s) => ({ location: s.locationType, productName: s.productName, full: s._sum.fullQty || 0, empty: s._sum.emptyQty || 0 })),
    cash: {
      withDeliveryBoys: round2(wallets.filter((w) => w.ownerType === 'DELIVERY_BOY').reduce((s, w) => s + w.balance, 0)),
      company: round2(wallets.filter((w) => w.ownerType === 'COMPANY').reduce((s, w) => s + w.balance, 0)),
    },
    lowStock: lowStock.filter((p) => p.stock <= p.minStockAlert),
  });
});
