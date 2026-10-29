import type { Db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';

// Every staff login is also an employee (for attendance and salary), so a delivery boy,
// manager or accountant is entered once. The employee is linked by userId; an employee
// added earlier with the same mobile is linked instead of being duplicated.

/** Logins that are not staff on the payroll: customers, and the owner (Super Admin). */
const NOT_STAFF = ['CUSTOMER', 'SUPER_ADMIN'];

const DESIGNATION: Record<string, string> = { DELIVERY_BOY: 'Delivery boy', MANAGER: 'Operations manager', ACCOUNTANT: 'Accountant' };

export interface StaffPay {
  salary?: unknown;
  salaryType?: unknown;
  incentivePerCylinder?: unknown;
}

const money = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? undefined : Math.max(0, Number(v)));

/** Create or update the employee behind a staff login. Returns the employee id, or null for non-staff. */
export async function syncEmployeeForUser(
  db: Db,
  user: { id: string; tenantId: string; name: string; email: string; mobile: string | null; role: string; status: string },
  pay: StaffPay = {}
) {
  if (NOT_STAFF.includes(user.role)) return null;
  const phone10 = (user.mobile || '').replace(/\D/g, '').slice(-10);
  const existing =
    (await db.employee.findFirst({ where: { tenantId: user.tenantId, userId: user.id } })) ||
    (phone10.length === 10 ? await db.employee.findFirst({ where: { tenantId: user.tenantId, userId: null, phone: { endsWith: phone10 } } }) : null);

  const salary = money(pay.salary);
  const incentive = money(pay.incentivePerCylinder);
  const salaryType = pay.salaryType === 'Day' || pay.salaryType === 'Month' ? pay.salaryType : undefined;
  const extra = { ...((existing?.extra as Record<string, unknown> | null) || {}), ...(incentive !== undefined ? { incentivePerCylinder: incentive } : {}) };

  const data = {
    userId: user.id,
    name: user.name,
    role: user.role,
    phone: user.mobile || existing?.phone || '',
    email: user.email,
    active: user.status === 'ACTIVE',
    designation: existing?.designation || DESIGNATION[user.role] || user.role,
    ...(salary !== undefined ? { salary } : {}),
    ...(salaryType ? { salaryType } : {}),
    extra: extra as Prisma.InputJsonValue,
  };
  if (existing) {
    await db.employee.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await db.employee.create({
    data: { ...data, tenantId: user.tenantId, salary: salary ?? 0, salaryType: salaryType ?? 'Month', joiningDate: new Date().toISOString().slice(0, 10) },
  });
  return created.id;
}

/** Give every staff login made before this sync existed its employee. Cheap when nothing is missing. */
export async function syncMissingEmployees(db: Db, tenantId: string) {
  const linked = (await db.employee.findMany({ where: { tenantId, userId: { not: null } }, select: { userId: true } })).map((e) => e.userId as string);
  const missing = await db.user.findMany({
    where: { tenantId, role: { notIn: NOT_STAFF }, id: { notIn: linked } },
    select: { id: true, tenantId: true, name: true, email: true, mobile: true, role: true, status: true },
  });
  for (const user of missing) await syncEmployeeForUser(db, user);
}
