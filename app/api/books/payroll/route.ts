import { prisma, transaction } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, businessDate, handle, num, ok, optStr, readJson, str } from '@/lib/server/http';
import { buildRun, giveAdvance, monthAttendance, payRun, postRun, saveAttendance, unpostRun, updateLine } from '@/lib/server/payroll';

/** GET ?month=YYYY-MM → that month's payroll (if built), attendance grid and incentive rates. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  const month = new URL(request.url).searchParams.get('month') || businessDate().slice(0, 7);
  const [run, attendance, employees] = await Promise.all([
    prisma.payrollRun.findUnique({ where: { tenantId_month: { tenantId: auth.tenantId, month } }, include: { lines: { orderBy: { employeeName: 'asc' } } } }),
    monthAttendance(auth.tenantId, month),
    prisma.employee.findMany({ where: { tenantId: auth.tenantId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, salary: true, salaryType: true, paidHoliday: true, userId: true, designation: true, role: true, extra: true } }),
  ]);
  return ok({ month, run, attendance, employees: employees.map((e) => ({ ...e, incentivePerCylinder: Number((e.extra as { incentivePerCylinder?: number } | null)?.incentivePerCylinder) || 0, extra: undefined })) });
});

/** { action: build | line | post | unpost | pay | advance | attendance | rate, … } */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const action = str(body.action, 'Action', { required: true });
  switch (action) {
    case 'build':
      return ok(await buildRun(auth.tenantId, str(body.month, 'Month', { required: true }), auth), 'Payroll calculated.');
    case 'line':
      return ok(await updateLine(auth.tenantId, str(body.lineId, 'Line', { required: true }), { bonus: body.bonus as number | undefined, incentive: body.incentive as number | undefined, advanceDeduct: body.advanceDeduct as number | undefined, otherDeduct: body.otherDeduct as number | undefined, basicEarned: body.basicEarned as number | undefined, remarks: body.remarks === undefined ? undefined : optStr(body.remarks) }, auth));
    case 'post':
      await transaction((tx) => postRun(tx, auth, str(body.runId, 'Payroll', { required: true })));
      return ok(null, 'Salary journal posted to the books.');
    case 'unpost':
      await transaction((tx) => unpostRun(tx, auth, str(body.runId, 'Payroll', { required: true })));
      return ok(null, 'Payroll moved back to draft.');
    case 'pay':
      await transaction((tx) => payRun(tx, auth, str(body.runId, 'Payroll', { required: true }), str(body.fromAccountId, 'Paid from', { required: true }), str(body.date, 'Date', { required: true })));
      return ok(null, 'Salary payment recorded.');
    case 'advance': {
      const v = await transaction((tx) => giveAdvance(tx, auth, { employeeId: str(body.employeeId, 'Employee', { required: true }), amount: num(body.amount, 'Amount', { required: true, min: 0 }), fromAccountId: str(body.fromAccountId, 'Paid from', { required: true }), date: str(body.date, 'Date', { required: true }), note: optStr(body.note) }));
      return ok(v, `Advance ${v.voucherNumber} recorded.`);
    }
    case 'attendance': {
      const cells = Array.isArray(body.cells) ? (body.cells as { employeeId: string; date: string; status: string; overtimeHours?: number }[]) : [];
      if (!cells.length) throw badRequest('Nothing to save.');
      const n = await saveAttendance(auth.tenantId, cells, auth);
      return ok({ saved: n }, 'Attendance saved.');
    }
    case 'rate': {
      const employeeId = str(body.employeeId, 'Employee', { required: true });
      const rate = num(body.rate, 'Incentive', { min: 0 });
      const e = await prisma.employee.findFirst({ where: { id: employeeId, tenantId: auth.tenantId } });
      if (!e) throw badRequest('Employee not found.');
      await prisma.employee.update({ where: { id: e.id }, data: { extra: { ...((e.extra as object) || {}), incentivePerCylinder: rate } } });
      await audit(prisma, auth, { action: 'INCENTIVE_RATE_SET', entityType: 'Employee', entityId: e.id, reference: e.name, newValue: { rate } });
      return ok(null, `Incentive for ${e.name}: ₹${rate} per cylinder.`);
    }
    default:
      throw badRequest('Unknown action.');
  }
});
