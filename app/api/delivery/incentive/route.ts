import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { businessDate, handle, ok, round2 } from '@/lib/server/http';
import { deliveryIncentive } from '@/lib/server/incentive';

/** GET ?month=YYYY-MM → the delivery boy's own incentive: cylinders paid for this month, those awaiting payment, and past payroll. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'delivery.execute');
  const asked = new URL(request.url).searchParams.get('month') || '';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : businessDate().slice(0, 7);

  // Same link payroll uses: the employee behind this login, or one with the same mobile.
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { mobile: true } });
  const phone10 = String(user?.mobile || '').replace(/\D/g, '').slice(-10);
  const employee =
    (await prisma.employee.findFirst({ where: { tenantId: auth.tenantId, userId: auth.userId } })) ||
    (phone10.length === 10 ? await prisma.employee.findFirst({ where: { tenantId: auth.tenantId, userId: null, phone: { endsWith: phone10 } } }) : null);
  const rate = Number((employee?.extra as { incentivePerCylinder?: number } | null)?.incentivePerCylinder) || 0;

  const [earned, history] = await Promise.all([
    deliveryIncentive(auth.tenantId, auth.userId, month),
    employee
      ? prisma.payrollLine.findMany({
          where: { employeeId: employee.id, run: { tenantId: auth.tenantId, status: { in: ['POSTED', 'PAID'] } } },
          select: { id: true, cylinders: true, incentive: true, net: true, run: { select: { month: true, status: true } } },
          orderBy: { run: { month: 'desc' } },
          take: 6,
        })
      : [],
  ]);

  return ok({
    month,
    rate,
    deliveries: earned.deliveries,
    cylinders: earned.cylinders,
    incentive: round2(earned.cylinders * rate),
    pendingCylinders: earned.pendingCylinders,
    pendingIncentive: round2(earned.pendingCylinders * rate),
    paid: earned.paid.slice(-50).reverse(),
    pending: earned.pending.slice(0, 50),
    history: history.map((h) => ({ id: h.id, month: h.run.month, status: h.run.status, cylinders: h.cylinders, incentive: h.incentive, net: h.net })),
  });
});
