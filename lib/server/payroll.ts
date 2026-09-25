import { prisma } from '@/lib/db';
import type { Db, Tx } from '@/lib/db';
import { monthRange } from '@/lib/books';
import { audit, Actor } from './audit';
import { expenseAccount } from './books/accounts';
import { ledgerStatement } from './books/reports';
import { writeVoucher, cancelSourceVoucher } from './books/vouchers';
import { badRequest, conflict, notFound } from './http';

// Monthly payroll: attendance → paid days → salary; delivery staff get a per
// cylinder incentive from their verified deliveries; advances are recovered.
// Posting creates the salary journal; paying creates the payment voucher.

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const isMonth = (m: unknown): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
export const ATTENDANCE_CODES = ['P', 'A', 'H', 'L', 'O'] as const; // present, absent, half day, paid leave, week off

async function upsertLedger(db: Db, tenantId: string, systemKey: string, code: string, name: string, groupName: string, nature: string) {
  const existing = await db.ledgerAccount.findUnique({ where: { tenantId_systemKey: { tenantId, systemKey } } });
  if (existing) return existing.name === name ? existing : db.ledgerAccount.update({ where: { id: existing.id }, data: { name } });
  let c = code;
  for (let n = 2; await db.ledgerAccount.findUnique({ where: { tenantId_code: { tenantId, code: c } } }); n++) c = `${code}-${n}`;
  return db.ledgerAccount.create({ data: { tenantId, systemKey, code: c, name, groupName, nature, isSystem: true } });
}

export const salaryPayable = (db: Db, tenantId: string) => upsertLedger(db, tenantId, 'SALARY_PAYABLE', 'SYS-SALPAY', 'Salary Payable', 'Current Liabilities', 'LIABILITY');
const salaryRecovery = (db: Db, tenantId: string) => upsertLedger(db, tenantId, 'SALARY_RECOVERY', 'SYS-SALREC', 'Salary Deductions (Recovery)', 'Indirect Incomes', 'INCOME');
export const advanceLedger = (db: Db, tenantId: string, e: { id: string; name: string }) => upsertLedger(db, tenantId, `EMPLOYEE_ADVANCE:${e.id}`, `ADV-${e.id.slice(-6).toUpperCase()}`, `Advance - ${e.name}`, 'Loans & Advances (Asset)', 'ASSET');

// ───────────────────────── Attendance ─────────────────────────

export async function monthAttendance(tenantId: string, month: string) {
  if (!isMonth(month)) throw badRequest('Choose a month.');
  const { from, to } = monthRange(month);
  const [employees, marks] = await Promise.all([
    prisma.employee.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } }),
    prisma.attendance.findMany({ where: { tenantId, date: { gte: from, lte: to } } }),
  ]);
  return {
    month,
    days: Number(to.slice(8, 10)),
    employees: employees.map((e) => ({ id: e.id, name: e.name, designation: e.designation || e.role, marks: Object.fromEntries(marks.filter((m) => m.employeeId === e.id).map((m) => [m.date, { status: m.status, overtimeHours: m.overtimeHours }])) })),
  };
}

/** Save attendance cells: [{ employeeId, date, status ('' clears), overtimeHours }]. */
export async function saveAttendance(tenantId: string, cells: { employeeId: string; date: string; status: string; overtimeHours?: number }[], actor: Actor) {
  const employees = new Map((await prisma.employee.findMany({ where: { tenantId, id: { in: [...new Set(cells.map((c) => c.employeeId))] } } })).map((e) => [e.id, e]));
  let saved = 0;
  for (const c of cells) {
    const e = employees.get(c.employeeId);
    if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) continue;
    const existing = await prisma.attendance.findFirst({ where: { tenantId, employeeId: e.id, date: c.date } });
    if (!c.status) {
      if (existing) await prisma.attendance.delete({ where: { id: existing.id } });
      continue;
    }
    if (!(ATTENDANCE_CODES as readonly string[]).includes(c.status)) throw badRequest('Attendance must be P, A, H, L or O.');
    const data = { status: c.status, overtimeHours: Math.max(0, Number(c.overtimeHours) || 0) };
    if (existing) await prisma.attendance.update({ where: { id: existing.id }, data });
    else await prisma.attendance.create({ data: { tenantId, employeeId: e.id, employeeName: e.name, date: c.date, checkIn: '', checkOut: '', ...data } });
    saved++;
  }
  await audit(prisma, actor, { action: 'ATTENDANCE_SAVED', entityType: 'Attendance', reference: `${saved} cells` });
  return saved;
}

// ───────────────────────── Payroll run ─────────────────────────

async function computeLine(tenantId: string, e: { id: string; name: string; salary: number; salaryType: string | null; paidHoliday: number | null; userId: string | null; designation: string | null; role: string; extra: unknown }, month: string) {
  const { from, to } = monthRange(month);
  const days = Number(to.slice(8, 10));
  const marks = await prisma.attendance.findMany({ where: { tenantId, employeeId: e.id, date: { gte: from, lte: to } } });
  const count = (s: string) => marks.filter((m) => m.status === s).length;
  const absent = count('A');
  const half = count('H');
  const leaves = count('L');
  const paidLeaveAllowed = e.paidHoliday ?? 0;
  const unpaidLeave = Math.max(0, leaves - paidLeaveAllowed);
  // Unmarked days count as present — only absences, half days and extra leave reduce pay.
  const paidDays = Math.max(0, days - absent - half * 0.5 - unpaidLeave);
  const daily = e.salaryType === 'DAILY';
  const perDay = daily ? e.salary : e.salary / days;
  const basicEarned = r2(daily ? e.salary * paidDays : (e.salary * paidDays) / days);
  const overtimeHours = marks.reduce((s, m) => s + (m.overtimeHours || 0), 0);
  const overtimePay = r2((overtimeHours * perDay) / 8);
  let deliveries = 0;
  let cylinders = 0;
  if (e.userId) {
    const agg = await prisma.delivery.aggregate({ where: { tenantId, deliveryBoyId: e.userId, deliveryDate: { gte: from, lte: to }, status: 'VERIFIED' }, _count: true, _sum: { deliveredQtyTotal: true } });
    deliveries = agg._count;
    cylinders = Math.round(agg._sum.deliveredQtyTotal || 0);
  }
  const rate = Number((e.extra as { incentivePerCylinder?: number } | null)?.incentivePerCylinder) || 0;
  const incentive = r2(cylinders * rate);
  const adv = await prisma.ledgerAccount.findUnique({ where: { tenantId_systemKey: { tenantId, systemKey: `EMPLOYEE_ADVANCE:${e.id}` } } });
  const advanceBalance = adv ? (await ledgerStatement(tenantId, adv.id, '2000-01-01', to))?.closing || 0 : 0;
  return {
    employeeId: e.id,
    employeeName: e.name,
    designation: e.designation || e.role,
    monthlySalary: e.salary,
    workingDays: days,
    presentDays: paidDays - Math.min(leaves, paidLeaveAllowed),
    paidLeaves: Math.min(leaves, paidLeaveAllowed),
    basicEarned,
    overtimeHours,
    overtimePay,
    deliveries,
    cylinders,
    incentive,
    bonus: 0,
    // Recover up to the whole advance outstanding (editable before posting).
    advanceDeduct: r2(Math.max(0, Math.min(advanceBalance, basicEarned + overtimePay + incentive))),
    otherDeduct: 0,
    advanceBalance: r2(advanceBalance),
  };
}

const lineTotals = <L extends { basicEarned: number; overtimePay: number; incentive: number; bonus: number; advanceDeduct: number; otherDeduct: number }>(l: L) => {
  const gross = r2(l.basicEarned + l.overtimePay + l.incentive + l.bonus);
  return { gross, net: r2(gross - l.advanceDeduct - l.otherDeduct) };
};

async function refreshRunTotals(db: Db, runId: string) {
  const lines = await db.payrollLine.findMany({ where: { runId } });
  const gross = r2(lines.reduce((s, l) => s + l.gross, 0));
  const net = r2(lines.reduce((s, l) => s + l.net, 0));
  return db.payrollRun.update({ where: { id: runId }, data: { gross, net, deductions: r2(gross - net) }, include: { lines: { orderBy: { employeeName: 'asc' } } } });
}

/** Create or (while still a draft) rebuild the month's payroll from attendance and deliveries. */
export async function buildRun(tenantId: string, month: string, actor: Actor) {
  if (!isMonth(month)) throw badRequest('Choose a month.');
  const existing = await prisma.payrollRun.findUnique({ where: { tenantId_month: { tenantId, month } } });
  if (existing && existing.status !== 'DRAFT') throw conflict(`Payroll for ${month} is already ${existing.status.toLowerCase()}.`);
  const employees = await prisma.employee.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } });
  if (!employees.length) throw badRequest('Add employees in Masters → Employees first.');
  type LineData = Omit<Awaited<ReturnType<typeof computeLine>>, 'advanceBalance'> & { gross: number; net: number; remarks: string | null };
  const lines: LineData[] = [];
  for (const e of employees) {
    const l = await computeLine(tenantId, e, month);
    const { advanceBalance, ...rest } = l;
    lines.push({ ...rest, ...lineTotals(rest), remarks: advanceBalance ? `Advance outstanding ₹${advanceBalance.toFixed(2)}` : null });
  }
  const run = existing
    ? await prisma.$transaction(async (tx) => {
        await tx.payrollLine.deleteMany({ where: { runId: existing.id } });
        await tx.payrollLine.createMany({ data: lines.map((l) => ({ ...l, runId: existing.id })) });
        return refreshRunTotals(tx, existing.id);
      })
    : await prisma.$transaction(async (tx) => {
        const r = await tx.payrollRun.create({ data: { tenantId, month, createdBy: actor.name, lines: { create: lines } } });
        return refreshRunTotals(tx, r.id);
      });
  await audit(prisma, actor, { action: 'PAYROLL_BUILT', entityType: 'PayrollRun', entityId: run.id, reference: month, newValue: { employees: lines.length, net: run.net } });
  return run;
}

export async function updateLine(tenantId: string, lineId: string, patch: { bonus?: number; incentive?: number; advanceDeduct?: number; otherDeduct?: number; basicEarned?: number; remarks?: string | null }, actor: Actor) {
  const line = await prisma.payrollLine.findFirst({ where: { id: lineId, run: { tenantId } }, include: { run: true } });
  if (!line) throw notFound('Payroll line not found.');
  if (line.run.status !== 'DRAFT') throw conflict('Posted payroll cannot be changed — un-post it first.');
  const next = { ...line };
  for (const k of ['bonus', 'incentive', 'advanceDeduct', 'otherDeduct', 'basicEarned'] as const) {
    if (patch[k] !== undefined) {
      const v = Number(patch[k]);
      if (!Number.isFinite(v) || v < 0) throw badRequest('Amounts cannot be negative.');
      next[k] = r2(v);
    }
  }
  const t = lineTotals(next);
  if (t.net < 0) throw badRequest('Deductions are more than the salary.');
  await prisma.payrollLine.update({ where: { id: line.id }, data: { bonus: next.bonus, incentive: next.incentive, advanceDeduct: next.advanceDeduct, otherDeduct: next.otherDeduct, basicEarned: next.basicEarned, remarks: patch.remarks !== undefined ? patch.remarks : line.remarks, ...t } });
  await audit(prisma, actor, { action: 'PAYROLL_LINE_EDITED', entityType: 'PayrollLine', entityId: line.id, reference: `${line.run.month} ${line.employeeName}`, newValue: patch });
  return refreshRunTotals(prisma, line.runId);
}

/** Salary journal: Dr salary & incentive expense, Cr salary payable / advances recovered / other deductions. */
export async function postRun(tx: Tx, actor: Actor, runId: string) {
  const run = await tx.payrollRun.findFirst({ where: { id: runId, tenantId: actor.tenantId }, include: { lines: true } });
  if (!run) throw notFound('Payroll not found.');
  if (run.status !== 'DRAFT') throw conflict('Payroll is already posted.');
  if (!run.lines.length || run.gross <= 0) throw badRequest('Nothing to post.');
  const { to } = monthRange(run.month);
  const [salary, incentiveAcc, payable, recovery] = await Promise.all([expenseAccount(tx, actor.tenantId, 'Salary & Wages'), expenseAccount(tx, actor.tenantId, 'Delivery Staff Incentive'), salaryPayable(tx, actor.tenantId), salaryRecovery(tx, actor.tenantId)]);
  const lines = [
    { accountId: salary.id, debit: r2(run.lines.reduce((s, l) => s + l.basicEarned + l.overtimePay + l.bonus, 0)) },
    { accountId: incentiveAcc.id, debit: r2(run.lines.reduce((s, l) => s + l.incentive, 0)) },
    { accountId: payable.id, credit: run.net },
    { accountId: recovery.id, credit: r2(run.lines.reduce((s, l) => s + l.otherDeduct, 0)) },
  ];
  for (const l of run.lines.filter((x) => x.advanceDeduct > 0)) {
    const adv = await advanceLedger(tx, actor.tenantId, { id: l.employeeId, name: l.employeeName });
    lines.push({ accountId: adv.id, credit: l.advanceDeduct });
  }
  await writeVoucher(tx, { tenantId: actor.tenantId, voucherType: 'JOURNAL', date: to, partyName: 'Salary', narration: `Salary for ${run.month} · ${run.lines.length} employees`, sourceType: 'PAYROLL', sourceId: run.id, createdBy: actor.name, lines });
  await tx.payrollRun.update({ where: { id: run.id }, data: { status: 'POSTED', postedBy: actor.name } });
  await audit(tx, actor, { action: 'PAYROLL_POSTED', entityType: 'PayrollRun', entityId: run.id, reference: run.month, newValue: { gross: run.gross, net: run.net } });
}

export async function unpostRun(tx: Tx, actor: Actor, runId: string) {
  const run = await tx.payrollRun.findFirst({ where: { id: runId, tenantId: actor.tenantId } });
  if (!run) throw notFound('Payroll not found.');
  if (run.status === 'PAID') throw conflict('Salary is already paid — cancel the payment voucher first.');
  if (run.status !== 'POSTED') throw conflict('Payroll is not posted.');
  await cancelSourceVoucher(tx, actor.tenantId, 'PAYROLL', run.id);
  // A re-post must be able to create a fresh voucher for the same run.
  await tx.accountVoucher.updateMany({ where: { tenantId: actor.tenantId, sourceType: 'PAYROLL', sourceId: run.id }, data: { sourceId: `${run.id}:void:${Date.now()}` } });
  await tx.payrollRun.update({ where: { id: run.id }, data: { status: 'DRAFT', postedBy: null } });
  await audit(tx, actor, { action: 'PAYROLL_UNPOSTED', entityType: 'PayrollRun', entityId: run.id, reference: run.month, sensitive: true });
}

/** Pay the net salaries: Dr Salary Payable, Cr cash / bank. */
export async function payRun(tx: Tx, actor: Actor, runId: string, fromAccountId: string, date: string) {
  const run = await tx.payrollRun.findFirst({ where: { id: runId, tenantId: actor.tenantId } });
  if (!run) throw notFound('Payroll not found.');
  if (run.status !== 'POSTED') throw conflict(run.status === 'PAID' ? 'Salary is already paid.' : 'Post the payroll first.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('Choose the payment date.');
  const from = await tx.ledgerAccount.findFirst({ where: { id: fromAccountId, tenantId: actor.tenantId } });
  if (!from || !['Cash-in-Hand', 'Bank Accounts'].includes(from.groupName)) throw badRequest('Choose the cash or bank ledger salaries are paid from.');
  const payable = await salaryPayable(tx, actor.tenantId);
  await writeVoucher(tx, { tenantId: actor.tenantId, voucherType: 'PAYMENT', date, partyName: 'Salary', narration: `Salary paid for ${run.month}`, sourceType: 'PAYROLL_PAY', sourceId: run.id, createdBy: actor.name, lines: [{ accountId: payable.id, debit: run.net }, { accountId: from.id, credit: run.net }] });
  await tx.payrollRun.update({ where: { id: run.id }, data: { status: 'PAID', paidFromId: from.id, paidAt: date } });
  await audit(tx, actor, { action: 'PAYROLL_PAID', entityType: 'PayrollRun', entityId: run.id, reference: run.month, newValue: { net: run.net, from: from.name } });
}

/** Salary advance to an employee: Dr Advance - name, Cr cash / bank. */
export async function giveAdvance(tx: Tx, actor: Actor, input: { employeeId: string; amount: number; fromAccountId: string; date: string; note?: string | null }) {
  const e = await tx.employee.findFirst({ where: { id: input.employeeId, tenantId: actor.tenantId } });
  if (!e) throw badRequest('Choose the employee.');
  const amount = r2(Number(input.amount) || 0);
  if (amount <= 0) throw badRequest('Enter the advance amount.');
  const from = await tx.ledgerAccount.findFirst({ where: { id: input.fromAccountId, tenantId: actor.tenantId } });
  if (!from || !['Cash-in-Hand', 'Bank Accounts'].includes(from.groupName)) throw badRequest('Choose the cash or bank ledger.');
  const adv = await advanceLedger(tx, actor.tenantId, e);
  const v = await writeVoucher(tx, { tenantId: actor.tenantId, voucherType: 'PAYMENT', date: input.date, partyName: e.name, narration: `Salary advance to ${e.name}${input.note ? ` · ${input.note}` : ''}`, sourceType: 'MANUAL', createdBy: actor.name, lines: [{ accountId: adv.id, debit: amount }, { accountId: from.id, credit: amount }] });
  await audit(tx, actor, { action: 'SALARY_ADVANCE', entityType: 'Employee', entityId: e.id, reference: e.name, newValue: { amount, from: from.name } });
  return v;
}
