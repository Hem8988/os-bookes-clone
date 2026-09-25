'use client';

import React, { useMemo, useState } from 'react';
import { Paperclip, Pencil, Plus, Receipt, Target, XCircle } from 'lucide-react';
import { DEFAULT_EXPENSE_HEADS } from '../../lib/books';
import { api, errorMessage, uploadFile } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Column, LedgerOption, money, PeriodBar, plain, ReportTable, sum, usePeriod } from './shared';
import { SupplierSelect } from './SupplierSelect';

interface Expense {
  id: string;
  entryNumber: string;
  date: string;
  headName: string;
  description: string | null;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  paidFrom: 'CASH' | 'BANK' | 'CREDIT';
  paidAccountId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  supplierGstin: string | null;
  billNumber: string | null;
  attachmentUrl: string | null;
  cancelled: boolean;
  createdBy: string;
}

export default function ExpensesPanel() {
  const [toast, showToast] = useToast();
  const [period, setPeriod] = usePeriod('month');
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [budgets, setBudgets] = useState(false);
  const [cancelling, setCancelling] = useState<Expense | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const q = useApiData<Expense[]>(`/api/books/expenses?from=${period.from}&to=${period.to}`, (m) => showToast(m, 'error'));
  const rows = q.data ?? [];
  const live = rows.filter((r) => !r.cancelled);
  const byHead = useMemo(() => {
    const m = new Map<string, number>();
    live.forEach((r) => m.set(r.headName, (m.get(r.headName) || 0) + r.totalAmount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [live]);
  const total = sum(live, (r) => r.totalAmount);

  const cancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await api('/api/books/expenses', { method: 'PATCH', body: { id: cancelling.id, reason } });
      showToast(`${cancelling.entryNumber} cancelled.`);
      setCancelling(null);
      setReason('');
      q.reload();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Expense>[] = [
    { label: 'Date', render: (r) => r.date },
    { label: 'No.', render: (r) => <span className="font-mono font-bold">{r.entryNumber}</span> },
    { label: 'Head', render: (r) => <div><div className="font-bold">{r.headName}</div>{r.description && <div className="text-[10px] text-slate-400">{r.description}</div>}</div> },
    { label: 'Paid', render: (r) => <Badge tone={r.paidFrom === 'CREDIT' ? 'amber' : r.paidFrom === 'BANK' ? 'blue' : 'green'}>{r.paidFrom === 'CREDIT' ? `Credit · ${r.supplierName}` : r.paidFrom}</Badge> },
    { label: 'Amount', align: 'right', render: (r) => plain(r.amount), total: (xs) => plain(sum(xs.filter((x) => !x.cancelled), (x) => x.amount)) },
    { label: 'GST', align: 'right', render: (r) => (r.gstAmount ? `${plain(r.gstAmount)}${r.supplierGstin ? '' : '*'}` : '—'), total: (xs) => plain(sum(xs.filter((x) => !x.cancelled), (x) => x.gstAmount)) },
    { label: 'Total', align: 'right', render: (r) => <strong className={cx(r.cancelled && 'line-through text-slate-400')}>{plain(r.totalAmount)}</strong>, total: (xs) => plain(sum(xs.filter((x) => !x.cancelled), (x) => x.totalAmount)) },
    {
      label: '',
      render: (r) =>
        r.cancelled ? (
          <span className="text-[10px] font-black text-rose-600 uppercase">Cancelled</span>
        ) : (
          <div className="flex justify-end gap-1">
            {r.attachmentUrl && <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="p-1 text-slate-500" title="Bill photo"><Paperclip className="h-4 w-4" /></a>}
            <button onClick={() => setEditing(r)} className="p-1 text-slate-500 hover:text-slate-900" title="Edit"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => setCancelling(r)} className="p-1 text-rose-600 hover:text-rose-800" title="Cancel"><XCircle className="h-4 w-4" /></button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={Receipt} title="Expenses" subtitle="Salary, fuel, rent, repairs, freight… paid in cash, from the bank or on credit. Each expense posts to its ledger; GST with the supplier's GSTIN becomes input credit." actions={<><Button tone="secondary" onClick={() => setBudgets(true)}><Target className="h-4 w-4" /> Monthly budgets</Button><Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add expense</Button></>} />
      <PeriodBar value={period} onChange={setPeriod} />
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-2">
          <ReportTable rows={rows} columns={columns} rowKey={(r) => r.id} empty="No expenses in this period." />
          <p className="text-[10px] text-slate-400">* GST without a supplier GSTIN is not claimable — it is added to the expense.</p>
        </div>
        <Card title={`By head · ${money(total)}`}>
          {byHead.length === 0 ? (
            <p className="text-xs text-slate-400">Nothing yet.</p>
          ) : (
            <div className="space-y-2">
              {byHead.map(([head, amount]) => (
                <div key={head} className="text-xs">
                  <div className="flex justify-between"><span className="font-semibold">{head}</span><span className="font-mono font-bold">{plain(amount)}</span></div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${total ? (amount / total) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {budgets && <BudgetEditor onClose={() => setBudgets(false)} onSaved={() => { setBudgets(false); showToast('Budgets saved. See Reports → Budget vs Actual.'); }} onError={(m) => showToast(m, 'error')} />}
      {editing && (
        <ExpenseForm
          expense={editing === 'new' ? null : editing}
          heads={[...new Set([...DEFAULT_EXPENSE_HEADS.map((h) => h.name), ...rows.map((r) => r.headName)])]}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            showToast(m);
            setEditing(null);
            q.reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}
      <Modal
        open={!!cancelling}
        title={`Cancel ${cancelling?.entryNumber || ''}`}
        onClose={() => setCancelling(null)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setCancelling(null)}>Back</Button>
            <Button tone="danger" busy={busy} disabled={!reason.trim()} onClick={cancel}>Cancel expense</Button>
          </>
        }
      >
        <Field label="Reason (required)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>
      </Modal>
    </div>
  );
}

function ExpenseForm({ expense, heads, onClose, onSaved, onError }: { expense: Expense | null; heads: string[]; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const ledgersQ = useApiData<LedgerOption[]>('/api/books/accounts', onError);
  const cash = (ledgersQ.data ?? []).filter((l) => l.groupName === 'Cash-in-Hand');
  const banks = (ledgersQ.data ?? []).filter((l) => l.groupName === 'Bank Accounts');
  const [date, setDate] = useState(expense?.date || today());
  const [head, setHead] = useState(expense?.headName || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [gstRate, setGstRate] = useState(expense ? String(expense.gstRate) : '0');
  const [paidFrom, setPaidFrom] = useState<Expense['paidFrom']>(expense?.paidFrom || 'CASH');
  const [accountId, setAccountId] = useState(expense?.paidAccountId || '');
  const [supplierId, setSupplierId] = useState(expense?.supplierId || '');
  const [gstin, setGstin] = useState(expense?.supplierGstin || '');
  const [billNumber, setBillNumber] = useState(expense?.billNumber || '');
  const [attachmentUrl, setAttachmentUrl] = useState(expense?.attachmentUrl || '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const gst = ((Number(amount) || 0) * (Number(gstRate) || 0)) / 100;
  const options = paidFrom === 'BANK' ? banks : cash;
  const account = accountId && options.some((o) => o.id === accountId) ? accountId : options[0]?.id || '';

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setAttachmentUrl(await uploadFile(file));
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const saved = await api<{ entryNumber: string }>('/api/books/expenses', {
        body: { id: expense?.id, date, headName: head, description, amount: Number(amount), gstRate: Number(gstRate), paidFrom, paidAccountId: paidFrom === 'CREDIT' ? null : account || null, supplierId: paidFrom === 'CREDIT' ? supplierId : supplierId || null, supplierGstin: gstin || null, billNumber, attachmentUrl: attachmentUrl || null },
      });
      onSaved(`Expense ${saved.entryNumber} saved.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={expense ? `Edit ${expense.entryNumber}` : 'Add expense'}
      onClose={onClose}
      footer={
        <>
          <Button tone="secondary" onClick={onClose}>Close</Button>
          <Button busy={busy} disabled={!head.trim() || !(Number(amount) > 0) || (paidFrom === 'CREDIT' && !supplierId)} onClick={save}>Save · {money((Number(amount) || 0) + gst)}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Expense head">
          <input list="expense-heads" value={head} onChange={(e) => setHead(e.target.value)} placeholder="Choose or type a new head" className={inputClass} />
          <datalist id="expense-heads">{heads.map((h) => <option key={h} value={h} />)}</datalist>
        </Field>
      </div>
      <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Diesel for Tata Ace MH12 AB 1234" className={inputClass} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount (before GST)"><input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></Field>
        <Field label="GST %">
          <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} className={inputClass}>
            {['0', '5', '12', '18', '28'].map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </Field>
        <Field label="Total"><div className="px-3 py-2 rounded-xl bg-slate-100 text-sm font-black font-mono">{money((Number(amount) || 0) + gst)}</div></Field>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 w-fit">
        {(['CASH', 'BANK', 'CREDIT'] as const).map((p) => (
          <button key={p} onClick={() => setPaidFrom(p)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', paidFrom === p ? 'bg-white shadow text-slate-900' : 'text-slate-500')}>
            {p === 'CASH' ? 'Paid in cash' : p === 'BANK' ? 'Paid from bank' : 'On credit'}
          </button>
        ))}
      </div>
      {paidFrom !== 'CREDIT' ? (
        <Field label={paidFrom === 'BANK' ? 'Bank ledger' : 'Cash ledger'} hint={options.length ? undefined : paidFrom === 'BANK' ? 'Add your bank in Masters → Banks.' : undefined}>
          <select value={account} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.name} · balance {money(o.closing)}</option>)}
          </select>
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label={paidFrom === 'CREDIT' ? 'Supplier (required)' : 'Supplier (optional)'}>
          <SupplierSelect value={supplierId} placeholder="—" onError={onError} onChange={(id, s) => { setSupplierId(id); if (s?.gstin) setGstin(s.gstin); }} />
        </Field>
        <Field label="Supplier GSTIN (for ITC)"><input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bill / receipt no."><input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className={inputClass} /></Field>
        <Field label="Bill photo">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-600 cursor-pointer">
            <Paperclip className="h-4 w-4" /> {uploading ? 'Uploading…' : attachmentUrl ? 'Attached ✓ (change)' : 'Attach'}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
        </Field>
      </div>
    </Modal>
  );
}

function BudgetEditor({ onClose, onSaved, onError }: { onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const ledgers = (useApiData<LedgerOption[]>('/api/books/accounts', onError).data ?? []).filter((l) => l.groupName === 'Direct Expenses' || l.groupName === 'Indirect Expenses');
  const saved = useApiData<{ heads: Record<string, number> }>('/api/books/budgets', onError).data;
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const values = draft ?? Object.fromEntries(Object.entries(saved?.heads || {}).map(([k, v]) => [k, String(v)]));
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/books/budgets', { method: 'PUT', body: { heads: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v) || 0])) } });
      onSaved();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);
  return (
    <Modal open title="Monthly budgets" onClose={onClose} footer={<Button busy={busy} onClick={save}>Save · {money(total)} / month</Button>}>
      <p className="text-[11px] text-slate-500">Monthly limit per expense head. The owner report and Reports → Budget vs Actual flag heads that go over.</p>
      <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
        {ledgers.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
            <span className="font-semibold">{l.name}<span className="block text-[10px] text-slate-400">{l.groupName}</span></span>
            <input type="number" min={0} value={values[l.name] ?? ''} onChange={(e) => setDraft({ ...values, [l.name]: e.target.value })} placeholder="0" className={cx(inputClass, 'w-32 py-1 text-xs text-right')} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
