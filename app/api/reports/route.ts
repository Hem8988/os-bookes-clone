import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { addDays, badRequest, businessDate, forbidden, handle, ok, round2 } from '@/lib/server/http';

// Reporting suite (SRS Phase 8). Scope follows the permission matrix:
// admin → everything, manager → operations, accountant → financial,
// delivery boy → own performance.

const SCOPE: Record<string, string[]> = {
  sales: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  collection: ['SUPER_ADMIN', 'ACCOUNTANT'],
  outstanding: ['SUPER_ADMIN', 'ACCOUNTANT', 'MANAGER'],
  inventory: ['SUPER_ADMIN', 'MANAGER'],
  'cylinder-balance': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  'delivery-performance': ['SUPER_ADMIN', 'MANAGER', 'DELIVERY_BOY'],
  accountant: ['SUPER_ADMIN', 'ACCOUNTANT'],
};

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'sales';
  if (!SCOPE[type]) throw badRequest('Unknown report.');
  if (!SCOPE[type].includes(auth.role)) throw forbidden();
  const to = url.searchParams.get('to') || businessDate();
  const from = url.searchParams.get('from') || addDays(to, -30);
  const tenantId = auth.tenantId;
  const range = { gte: from, lte: to };

  switch (type) {
    case 'sales': {
      const invoices = await prisma.invoice.findMany({ where: { tenantId, date: range, status: { not: 'Cancelled' } }, include: { items: true } });
      const byProduct = new Map<string, { productName: string; qty: number; amount: number }>();
      const byDay = new Map<string, { date: string; invoices: number; amount: number; tax: number }>();
      for (const inv of invoices) {
        const d = byDay.get(inv.date) || { date: inv.date, invoices: 0, amount: 0, tax: 0 };
        d.invoices += 1;
        d.amount = round2(d.amount + inv.grandTotal);
        d.tax = round2(d.tax + inv.totalCgst + inv.totalSgst + inv.totalIgst);
        byDay.set(inv.date, d);
        for (const it of inv.items) {
          const p = byProduct.get(it.productName) || { productName: it.productName, qty: 0, amount: 0 };
          p.qty += it.quantity;
          p.amount = round2(p.amount + it.totalAmount);
          byProduct.set(it.productName, p);
        }
      }
      return ok({ from, to, total: round2(invoices.reduce((s, i) => s + i.grandTotal, 0)), count: invoices.length, byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)), byProduct: [...byProduct.values()] });
    }
    case 'collection': {
      const payments = await prisma.payment.findMany({ where: { tenantId, paymentDate: range, status: 'VERIFIED' } });
      const byMode: Record<string, number> = {};
      payments.forEach((p) => (byMode[p.mode] = round2((byMode[p.mode] || 0) + p.amount)));
      const credit = await prisma.delivery.findMany({ where: { tenantId, deliveryDate: range, status: 'VERIFIED' }, select: { invoiceAmount: true, paymentAmount: true } });
      return ok({ from, to, total: round2(payments.reduce((s, p) => s + p.amount, 0)), byMode, creditGiven: round2(credit.reduce((s, d) => s + Math.max(d.invoiceAmount - d.paymentAmount, 0), 0)), payments });
    }
    case 'outstanding': {
      const today = businessDate();
      const customers = await prisma.customer.findMany({ where: { tenantId, type: 'Customer', balance: { gt: 0 } }, orderBy: { balance: 'desc' } });
      const unpaid = await prisma.invoice.findMany({ where: { tenantId, status: { in: ['Unpaid', 'Partial'] } }, select: { customerId: true, dueDate: true, grandTotal: true, paidAmount: true } });
      const lastPayments = await prisma.payment.groupBy({ by: ['customerId'], where: { tenantId, status: 'VERIFIED' }, _max: { paymentDate: true } });
      const rows = customers.map((c) => {
        const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
        unpaid
          .filter((i) => i.customerId === c.id)
          .forEach((i) => {
            const due = i.grandTotal - i.paidAmount;
            const overdueDays = Math.floor((new Date(today).getTime() - new Date(i.dueDate).getTime()) / 86_400_000);
            if (overdueDays <= 0) buckets.current += due;
            else if (overdueDays <= 30) buckets.d30 += due;
            else if (overdueDays <= 60) buckets.d60 += due;
            else buckets.d90 += due;
          });
        return {
          customerId: c.id,
          customerCode: c.customerCode,
          name: c.name,
          phone: c.phone,
          outstanding: c.balance,
          creditLimit: c.creditLimit,
          overLimit: c.creditLimit > 0 && c.balance > c.creditLimit,
          lastPayment: lastPayments.find((p) => p.customerId === c.id)?._max.paymentDate || null,
          ...Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, round2(v)])),
        };
      });
      return ok({ asOf: today, total: round2(rows.reduce((s, r) => s + r.outstanding, 0)), rows });
    }
    case 'inventory': {
      const [balances, movements] = await Promise.all([
        prisma.stockBalance.findMany({ where: { tenantId }, orderBy: [{ locationType: 'asc' }, { locationName: 'asc' }] }),
        prisma.inventoryTransaction.groupBy({ by: ['transactionType', 'productName'], where: { tenantId, createdAt: { gte: new Date(`${from}T00:00:00+05:30`), lte: new Date(`${to}T23:59:59+05:30`) } }, _sum: { fullQty: true, emptyQty: true } }),
      ]);
      return ok({ from, to, balances, movements: movements.map((m) => ({ type: m.transactionType, productName: m.productName, full: m._sum.fullQty || 0, empty: m._sum.emptyQty || 0 })) });
    }
    case 'cylinder-balance': {
      const rows = await prisma.customerCylinderBalance.findMany({ where: { tenantId, currentBalance: { not: 0 } }, include: { customer: { select: { name: true, customerCode: true, phone: true, area: true } } }, orderBy: { currentBalance: 'desc' } });
      return ok(rows);
    }
    case 'delivery-performance': {
      const where = { tenantId, deliveryDate: range, ...(auth.role === 'DELIVERY_BOY' ? { deliveryBoyId: auth.userId } : {}) };
      const deliveries = await prisma.delivery.findMany({ where, select: { deliveryBoyId: true, deliveryBoyName: true, deliveredQtyTotal: true, emptyReceivedTotal: true, hasVariance: true, revision: true, status: true, paymentMode: true, paymentAmount: true, submittedAt: true, verifiedAt: true } });
      const byBoy = new Map<string, { name: string; deliveries: number; cylinders: number; empties: number; variances: number; corrections: number; cash: number; avgVerifyHours: number; _verifySum: number; _verified: number }>();
      for (const d of deliveries) {
        const r = byBoy.get(d.deliveryBoyId) || { name: d.deliveryBoyName, deliveries: 0, cylinders: 0, empties: 0, variances: 0, corrections: 0, cash: 0, avgVerifyHours: 0, _verifySum: 0, _verified: 0 };
        r.deliveries += 1;
        r.cylinders += d.deliveredQtyTotal;
        r.empties += d.emptyReceivedTotal;
        r.variances += d.hasVariance ? 1 : 0;
        r.corrections += d.revision > 1 ? 1 : 0;
        if (d.paymentMode === 'CASH') r.cash = round2(r.cash + d.paymentAmount);
        if (d.verifiedAt) {
          r._verifySum += (d.verifiedAt.getTime() - d.submittedAt.getTime()) / 3_600_000;
          r._verified += 1;
        }
        byBoy.set(d.deliveryBoyId, r);
      }
      return ok({
        from,
        to,
        rows: [...byBoy.entries()].map(([id, { _verifySum, _verified, ...r }]) => ({ deliveryBoyId: id, ...r, avgVerifyHours: _verified ? round2(_verifySum / _verified) : null })),
      });
    }
    case 'accountant': {
      const closings = await prisma.dailyClosing.findMany({ where: { tenantId, date: range }, orderBy: { date: 'desc' } });
      const verifications = await prisma.approvalRequest.groupBy({ by: ['type', 'status'], where: { tenantId, createdAt: { gte: new Date(`${from}T00:00:00+05:30`) }, type: { in: ['DELIVERY_VERIFICATION', 'PAYMENT_VERIFICATION', 'CASH_SUBMISSION'] } }, _count: true });
      return ok({ from, to, closings, verifications });
    }
  }
  throw badRequest('Unknown report.');
});
