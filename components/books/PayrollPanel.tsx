'use client';

import React, { useState } from 'react';
import { BadgeIndianRupee, Calculator, CheckCircle2, Printer, Save, Send, Undo2, Users } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useCompany } from '../../lib/useCompany';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Empty, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Kpi, LedgerOption, money, plain, Tabs } from './shared';

interface Line { id: string; employeeId: string; employeeName: string; designation: string | null; monthlySalary: number; workingDays: number; presentDays: number; paidLeaves: number; basicEarned: number; overtimeHours: number; overtimePay: number; deliveries: number; cylinders: number; incentive: number; bonus: number; advanceDeduct: number; otherDeduct: number; gross: number; net: number; remarks: string | null }
interface Run { id: string; month: string; status: 'DRAFT' | 'POSTED' | 'PAID'; gross: number; deductions: number; net: number; paidAt: string | null; lines: Line[] }
interface Emp { id: string; name: string; salary: number; salaryType: string | null; paidHoliday: number | null; userId: string | null; designation: string | null; role: string; incentivePerCylinder: number }
interface Data { month: string; run: Run | null; attendance: { days: number; employees: { id: string; name: string; designation: string; marks: Record<string, { status: string; overtimeHours: number }> }[] }; employees: Emp[] }

const CYCLE = ['', 'P', 'A', 'H', 'L', 'O'];
const CELL: Record<string, string> = { P: 'bg-emerald-100 text-emerald-800', A: 'bg-rose-100 text-rose-700', H: 'bg-amber-100 text-amber-800', L: 'bg-sky-100 text-sky-800', O: 'bg-slate-200 text-slate-600' };

export default function PayrollPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [tab, setTab] = useState<'attendance' | 'salary' | 'advances'>('salary');
  const q = useApiData<Data>(`/api/books/payroll?month=${month}`, onError);
  const data = q.data;
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (label: string, body: object) => {
    setBusy(label);
    try {
      const r = await api<unknown>('/api/books/payroll', { body });
      q.reload();
      return r;
    } catch (e) {
      onError(errorMessage(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={BadgeIndianRupee} title="Salary & payroll" subtitle="Attendance → salary with overtime and per-cylinder delivery incentive, advances recovered, posted to the books and paid in one go." actions={<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={cx(inputClass, 'w-44')} />} />
      <Tabs value={tab} onChange={setTab} items={[['salary', 'Salary sheet'], ['attendance', 'Attendance'], ['advances', 'Advances & incentive']]} />
      {!data ? (
        <Empty>Loading…</Empty>
      ) : !data.employees.length ? (
        <Empty>Add employees (with monthly salary) in Masters → Employees first.</Empty>
      ) : tab === 'attendance' ? (
        <Attendance key={month} data={data} onSaved={() => { showToast('Attendance saved.'); q.reload(); }} onError={onError} />
      ) : tab === 'advances' ? (
        <Advances employees={data.employees} onDone={(m) => { showToast(m); q.reload(); }} onError={onError} />
      ) : (
        <Salary run={data.run} month={month} busy={busy} call={call} onToast={(m) => showToast(m)} onError={onError} />
      )}
    </div>
  );
}

function Attendance({ data, onSaved, onError }: { data: Data; onSaved: () => void; onError: (m: string) => void }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const days = Array.from({ length: data.attendance.days }, (_, i) => `${data.month}-${String(i + 1).padStart(2, '0')}`);
  const get = (empId: string, date: string) => edits[`${empId}|${date}`] ?? data.attendance.employees.find((e) => e.id === empId)?.marks[date]?.status ?? '';
  const cycle = (empId: string, date: string) => {
    const cur = get(empId, date);
    setEdits({ ...edits, [`${empId}|${date}`]: CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length] });
  };
  const fillSundays = () => {
    const next = { ...edits };
    for (const e of data.attendance.employees) for (const d of days) if (new Date(`${d}T00:00:00Z`).getUTCDay() === 0 && !get(e.id, d)) next[`${e.id}|${d}`] = 'O';
    setEdits(next);
  };
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/books/payroll', { body: { action: 'attendance', cells: Object.entries(edits).map(([k, status]) => ({ employeeId: k.split('|')[0], date: k.split('|')[1], status })) } });
      setEdits({});
      onSaved();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={`Attendance ${data.month}`} actions={<div className="flex gap-2"><Button size="sm" tone="secondary" onClick={fillSundays}>Mark Sundays off</Button><Button size="sm" busy={busy} disabled={!Object.keys(edits).length} onClick={save}><Save className="h-3.5 w-3.5" /> Save ({Object.keys(edits).length})</Button></div>}>
      <p className="text-[11px] text-slate-500 mb-2">Tap a day to cycle: <b>P</b> present · <b>A</b> absent · <b>H</b> half day · <b>L</b> paid leave · <b>O</b> week off · blank = counted present. Only absences, half days and leave beyond the allowed paid leave cut salary.</p>
      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white p-1 text-left min-w-36">Employee</th>
              {days.map((d) => {
                const sun = new Date(`${d}T00:00:00Z`).getUTCDay() === 0;
                return <th key={d} className={cx('w-7 p-0.5 text-center font-bold', sun ? 'text-rose-500' : 'text-slate-500')}>{Number(d.slice(8))}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {data.attendance.employees.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="sticky left-0 bg-white p-1 font-bold text-xs whitespace-nowrap">{e.name}<div className="text-[9px] font-normal text-slate-400">{e.designation}</div></td>
                {days.map((d) => {
                  const v = get(e.id, d);
                  const changed = edits[`${e.id}|${d}`] !== undefined;
                  return (
                    <td key={d} className="p-0.5">
                      <button onClick={() => cycle(e.id, d)} className={cx('w-6 h-6 rounded text-[10px] font-black', v ? CELL[v] : 'bg-slate-50 text-slate-300 hover:bg-slate-100', changed && 'ring-2 ring-emerald-500')}>{v || '·'}</button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Salary({ run, month, busy, call, onToast, onError }: { run: Run | null; month: string; busy: string | null; call: (l: string, b: object) => Promise<unknown>; onToast: (m: string) => void; onError: (m: string) => void }) {
  const [editing, setEditing] = useState<Line | null>(null);
  const [paying, setPaying] = useState(false);
  const [slip, setSlip] = useState<Line | null>(null);
  const draft = run?.status === 'DRAFT';
  if (!run)
    return (
      <Card>
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-slate-600">No payroll for {month} yet. Mark attendance first, then calculate.</p>
          <Button busy={busy === 'build'} onClick={() => call('build', { action: 'build', month }).then((r) => r && onToast('Payroll calculated.'))}><Calculator className="h-4 w-4" /> Calculate salary for {month}</Button>
        </div>
      </Card>
    );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Gross salary" value={money(run.gross)} />
        <Kpi label="Deductions" value={money(run.deductions)} tone="amber" />
        <Kpi label="Net payable" value={money(run.net)} tone="green" />
        <Kpi label="Status" value={run.status === 'PAID' ? `Paid ${run.paidAt}` : run.status === 'POSTED' ? 'Posted, unpaid' : 'Draft'} tone={run.status === 'PAID' ? 'green' : run.status === 'POSTED' ? 'blue' : 'slate'} />
      </div>
      <div className="flex flex-wrap gap-2">
        {draft && <Button tone="secondary" busy={busy === 'build'} onClick={() => call('build', { action: 'build', month }).then((r) => r && onToast('Recalculated from attendance and deliveries.'))}><Calculator className="h-4 w-4" /> Recalculate</Button>}
        {draft && <Button busy={busy === 'post'} onClick={() => call('post', { action: 'post', runId: run.id }).then((r) => r !== null && onToast('Salary journal posted.'))}><CheckCircle2 className="h-4 w-4" /> Post to books</Button>}
        {run.status === 'POSTED' && <Button busy={busy === 'pay'} onClick={() => setPaying(true)}><Send className="h-4 w-4" /> Pay salaries</Button>}
        {run.status === 'POSTED' && <Button tone="ghost" busy={busy === 'unpost'} onClick={() => call('unpost', { action: 'unpost', runId: run.id }).then((r) => r !== null && onToast('Back to draft.'))}><Undo2 className="h-4 w-4" /> Un-post</Button>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              {['Employee', 'Salary', 'Paid days', 'Basic', 'OT', 'Cyl.', 'Incentive', 'Bonus', 'Advance', 'Other ded.', 'Net', ''].map((h) => <th key={h} className={cx('px-2 py-2 font-bold', h === 'Employee' || h === '' ? 'text-left' : 'text-right')}>{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {run.lines.map((l) => (
              <tr key={l.id} className="hover:bg-emerald-50/40">
                <td className="px-2 py-2"><div className="font-bold">{l.employeeName}</div><div className="text-[10px] text-slate-400">{l.designation}{l.remarks ? ` · ${l.remarks}` : ''}</div></td>
                <td className="px-2 py-2 text-right font-mono">{plain(l.monthlySalary)}</td>
                <td className="px-2 py-2 text-right font-mono">{l.presentDays + l.paidLeaves}/{l.workingDays}</td>
                <td className="px-2 py-2 text-right font-mono">{plain(l.basicEarned)}</td>
                <td className="px-2 py-2 text-right font-mono">{l.overtimePay ? plain(l.overtimePay) : '—'}</td>
                <td className="px-2 py-2 text-right font-mono">{l.cylinders || '—'}</td>
                <td className="px-2 py-2 text-right font-mono">{l.incentive ? plain(l.incentive) : '—'}</td>
                <td className="px-2 py-2 text-right font-mono">{l.bonus ? plain(l.bonus) : '—'}</td>
                <td className="px-2 py-2 text-right font-mono text-rose-700">{l.advanceDeduct ? plain(l.advanceDeduct) : '—'}</td>
                <td className="px-2 py-2 text-right font-mono text-rose-700">{l.otherDeduct ? plain(l.otherDeduct) : '—'}</td>
                <td className="px-2 py-2 text-right font-mono font-black">{plain(l.net)}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  {draft && <Button size="sm" tone="ghost" onClick={() => setEditing(l)}>Edit</Button>}
                  <Button size="sm" tone="ghost" onClick={() => setSlip(l)}><Printer className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
            <tr>
              <td className="px-2 py-2">Total ({run.lines.length})</td>
              <td colSpan={2} />
              <td className="px-2 py-2 text-right font-mono">{plain(run.lines.reduce((s, l) => s + l.basicEarned, 0))}</td>
              <td className="px-2 py-2 text-right font-mono">{plain(run.lines.reduce((s, l) => s + l.overtimePay, 0))}</td>
              <td className="px-2 py-2 text-right font-mono">{run.lines.reduce((s, l) => s + l.cylinders, 0)}</td>
              <td className="px-2 py-2 text-right font-mono">{plain(run.lines.reduce((s, l) => s + l.incentive, 0))}</td>
              <td className="px-2 py-2 text-right font-mono">{plain(run.lines.reduce((s, l) => s + l.bonus, 0))}</td>
              <td className="px-2 py-2 text-right font-mono">{plain(run.lines.reduce((s, l) => s + l.advanceDeduct, 0))}</td>
              <td className="px-2 py-2 text-right font-mono">{plain(run.lines.reduce((s, l) => s + l.otherDeduct, 0))}</td>
              <td className="px-2 py-2 text-right font-mono">{plain(run.net)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {editing && <EditLine line={editing} onClose={() => setEditing(null)} onSave={async (patch) => { const r = await call('line', { action: 'line', lineId: editing.id, ...patch }); if (r) setEditing(null); }} />}
      {paying && <PayModal net={run.net} onClose={() => setPaying(false)} onPay={async (fromAccountId, date) => { const r = await call('pay', { action: 'pay', runId: run.id, fromAccountId, date }); if (r !== null) { setPaying(false); onToast('Salary payment recorded.'); } }} onError={onError} />}
      {slip && <Slip line={slip} month={month} onClose={() => setSlip(null)} />}
    </div>
  );
}

function EditLine({ line, onClose, onSave }: { line: Line; onClose: () => void; onSave: (p: object) => void }) {
  const [v, setV] = useState({ basicEarned: String(line.basicEarned), incentive: String(line.incentive), bonus: String(line.bonus), advanceDeduct: String(line.advanceDeduct), otherDeduct: String(line.otherDeduct), remarks: line.remarks || '' });
  const f = (k: keyof typeof v, label: string) => <Field label={label}><input type={k === 'remarks' ? 'text' : 'number'} min={0} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={inputClass} /></Field>;
  return (
    <Modal open title={`Edit ${line.employeeName}`} onClose={onClose} footer={<Button onClick={() => onSave({ basicEarned: Number(v.basicEarned), incentive: Number(v.incentive), bonus: Number(v.bonus), advanceDeduct: Number(v.advanceDeduct), otherDeduct: Number(v.otherDeduct), remarks: v.remarks })}>Save</Button>}>
      <div className="grid grid-cols-2 gap-3">
        {f('basicEarned', 'Basic earned')}
        {f('incentive', `Incentive (${line.cylinders} cyl.)`)}
        {f('bonus', 'Bonus')}
        {f('advanceDeduct', 'Advance recovery')}
        {f('otherDeduct', 'Other deduction')}
        {f('remarks', 'Remarks')}
      </div>
    </Modal>
  );
}

function PayModal({ net, onClose, onPay, onError }: { net: number; onClose: () => void; onPay: (from: string, date: string) => void; onError: (m: string) => void }) {
  const ledgers = (useApiData<LedgerOption[]>('/api/books/accounts', onError).data ?? []).filter((l) => l.groupName === 'Cash-in-Hand' || l.groupName === 'Bank Accounts');
  const [from, setFrom] = useState('');
  const [date, setDate] = useState(today());
  const source = from || ledgers.find((l) => l.groupName === 'Bank Accounts')?.id || ledgers[0]?.id || '';
  return (
    <Modal open title="Pay salaries" onClose={onClose} footer={<Button disabled={!source} onClick={() => onPay(source, date)}>Pay {money(net)}</Button>}>
      <Field label="Paid from"><select value={source} onChange={(e) => setFrom(e.target.value)} className={inputClass}>{ledgers.map((l) => <option key={l.id} value={l.id}>{l.name} · balance {money(l.closing)}</option>)}</select></Field>
      <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}

function Slip({ line, month, onClose }: { line: Line; month: string; onClose: () => void }) {
  const company = useCompany();
  const monthName = new Date(`${month}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const row = (label: string, value: number, bold = false) => (
    <div className={cx('flex justify-between py-1 border-b border-slate-100', bold && 'font-black')}><span>{label}</span><span className="font-mono">{plain(value)}</span></div>
  );
  return (
    <Modal open title="Salary slip" onClose={onClose} footer={<Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>}>
      <div id="printable-invoice" className="text-xs space-y-3">
        <div className="text-center">
          <div className="text-base font-black">{company.legalName || company.name}</div>
          <div className="text-slate-500">{company.address}</div>
          <div className="mt-1 font-bold uppercase tracking-wide">Salary slip — {monthName}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50">
          <div><span className="text-slate-500">Employee</span><div className="font-bold">{line.employeeName}</div></div>
          <div><span className="text-slate-500">Designation</span><div className="font-bold">{line.designation || '—'}</div></div>
          <div><span className="text-slate-500">Paid days</span><div className="font-bold">{line.presentDays + line.paidLeaves} / {line.workingDays}</div></div>
          <div><span className="text-slate-500">Monthly salary</span><div className="font-bold">{money(line.monthlySalary)}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-black mb-1">Earnings</div>
            {row('Basic earned', line.basicEarned)}
            {row(`Overtime (${line.overtimeHours} h)`, line.overtimePay)}
            {row(`Delivery incentive (${line.cylinders} cyl.)`, line.incentive)}
            {row('Bonus', line.bonus)}
            {row('Gross', line.gross, true)}
          </div>
          <div>
            <div className="font-black mb-1">Deductions</div>
            {row('Advance recovery', line.advanceDeduct)}
            {row('Other', line.otherDeduct)}
            {row('Total deductions', line.advanceDeduct + line.otherDeduct, true)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 flex justify-between text-sm font-black"><span>Net pay</span><span className="font-mono">{money(line.net)}</span></div>
        <div className="flex justify-between pt-8 text-[11px] text-slate-500"><span>Employee signature</span><span>For {company.legalName || company.name}</span></div>
      </div>
    </Modal>
  );
}

function Advances({ employees, onDone, onError }: { employees: Emp[]; onDone: (m: string) => void; onError: (m: string) => void }) {
  const ledgers = useApiData<LedgerOption[]>('/api/books/accounts', onError).data ?? [];
  const advances = new Map(ledgers.filter((l) => l.name.startsWith('Advance - ')).map((l) => [l.name.slice(10), l.closing]));
  const money2 = ledgers.filter((l) => l.groupName === 'Cash-in-Hand' || l.groupName === 'Bank Accounts');
  const [form, setForm] = useState<{ employeeId: string; amount: string; from: string; date: string; note: string } | null>(null);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const post = async (body: object, msg: string) => {
    setBusy(true);
    try {
      await api('/api/books/payroll', { body });
      onDone(msg);
      return true;
    } catch (e) {
      onError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={<span className="flex items-center gap-2"><Users className="h-4 w-4" /> Employees</span>}>
      <table className="w-full text-xs">
        <thead className="text-slate-500 border-b border-slate-200"><tr><th className="p-2 text-left">Employee</th><th className="p-2 text-right">Salary</th><th className="p-2 text-right">Advance due</th><th className="p-2 text-right">Incentive / cylinder</th><th className="p-2" /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {employees.map((e) => (
            <tr key={e.id}>
              <td className="p-2"><div className="font-bold">{e.name}</div><div className="text-[10px] text-slate-400">{e.designation || e.role}{e.userId ? ' · delivery login linked' : ''}</div></td>
              <td className="p-2 text-right font-mono">{plain(e.salary)}{e.salaryType === 'DAILY' ? '/day' : ''}</td>
              <td className="p-2 text-right font-mono">{advances.get(e.name) ? <Badge tone="amber">{plain(advances.get(e.name)!)}</Badge> : '—'}</td>
              <td className="p-2 text-right">
                <div className="flex justify-end gap-1">
                  <input type="number" min={0} value={rates[e.id] ?? String(e.incentivePerCylinder)} onChange={(ev) => setRates({ ...rates, [e.id]: ev.target.value })} className={cx(inputClass, 'w-20 py-1 text-xs text-right')} />
                  {rates[e.id] !== undefined && <Button size="sm" busy={busy} onClick={() => post({ action: 'rate', employeeId: e.id, rate: Number(rates[e.id]) }, `Incentive saved for ${e.name}.`)}>Save</Button>}
                </div>
              </td>
              <td className="p-2 text-right"><Button size="sm" tone="secondary" onClick={() => setForm({ employeeId: e.id, amount: '', from: money2[0]?.id || '', date: today(), note: '' })}>Give advance</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">Incentive counts cylinders in verified deliveries by the employee’s delivery login (link it in Masters → Employees → user). Advances are recovered from the next salary.</p>
      {form && (
        <Modal open title="Salary advance" onClose={() => setForm(null)} footer={<Button busy={busy} disabled={!(Number(form.amount) > 0) || !form.from} onClick={async () => { if (await post({ action: 'advance', employeeId: form.employeeId, amount: Number(form.amount), fromAccountId: form.from, date: form.date, note: form.note }, 'Advance recorded.')) setForm(null); }}>Give advance</Button>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount"><input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} /></Field>
          </div>
          <Field label="Paid from"><select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={inputClass}>{money2.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
          <Field label="Note"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} /></Field>
        </Modal>
      )}
    </Card>
  );
}
