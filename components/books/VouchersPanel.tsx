'use client';

import React, { useMemo, useState } from 'react';
import { BookText, ChevronDown, ChevronRight, Plus, Trash2, XCircle } from 'lucide-react';
import { MANUAL_VOUCHER_TYPES, VOUCHER_TYPES, VoucherType } from '../../lib/books';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Button, Card, Empty, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, LedgerOption, money, PeriodBar, plain, useBooksReport, usePeriod, VoucherBadge } from './shared';

interface DayLine { accountId: string; account: string; group: string; debit: number; credit: number }
interface DayRow { id: string; voucherNumber: string; voucherType: VoucherType; date: string; partyName: string | null; narration: string | null; amount: number; sourceType: string; cancelled: boolean; createdBy: string; lines: DayLine[] }
interface Bill { id: string; billNumber: string; supplierId: string; supplierName: string; supplierInvoiceNo: string; grandTotal: number; paidAmount: number; status: string }

const SOURCE: Record<string, string> = { CUSTOMER_LEDGER: 'Customer ledger', CASH_SUBMISSION: 'Cash handover', PURCHASE_BILL: 'Purchase bill', EXPENSE: 'Expense', MANUAL: 'Manual' };

export default function VouchersPanel() {
  const [toast, showToast] = useToast();
  const [period, setPeriod] = usePeriod('month');
  const [type, setType] = useState<string>('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<DayRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const q = useBooksReport<DayRow[]>('day-book', period, type ? `&type=${type}` : '', (m) => showToast(m, 'error'));
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    rows.filter((r) => !r.cancelled).forEach((r) => (t[r.voucherType] = (t[r.voucherType] || 0) + r.amount));
    return t;
  }, [rows]);

  const toggle = (id: string) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  const cancel = async () => {
    if (!cancelling || !reason.trim()) return;
    setBusy(true);
    try {
      await api('/api/books/vouchers', { method: 'PATCH', body: { id: cancelling.id, reason } });
      showToast(`${cancelling.voucherNumber} cancelled.`);
      setCancelling(null);
      setReason('');
      q.reload();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={BookText} title="Day book & vouchers" subtitle="Every voucher in the books. Sales, receipts, purchases and expenses post automatically; enter other receipts, payments, contra and journals here." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New voucher</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodBar value={period} onChange={setPeriod} />
        <select value={type} onChange={(e) => setType(e.target.value)} className={cx(inputClass, 'w-56 py-1.5 text-xs')}>
          <option value="">All voucher types</option>
          {Object.entries(VOUCHER_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(totals).map(([k, v]) => (
          <div key={k} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2">
            <VoucherBadge type={k} label={VOUCHER_TYPES[k as VoucherType]?.label || k} />
            <span className="font-mono font-black">{money(v)}</span>
          </div>
        ))}
      </div>

      <Card>
        {q.loading && !q.data ? (
          <Empty>Loading…</Empty>
        ) : rows.length === 0 ? (
          <Empty>No vouchers in this period.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left border-b border-slate-200">
                <tr>
                  <th className="p-2 w-6" />
                  <th className="p-2">Date</th>
                  <th className="p-2">Voucher</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Particulars</th>
                  <th className="p-2 text-right">Debit</th>
                  <th className="p-2 text-right">Credit</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const isOpen = open.has(v.id);
                  return (
                    <React.Fragment key={v.id}>
                      <tr className={cx('border-t border-slate-100 hover:bg-slate-50 cursor-pointer', v.cancelled && 'opacity-50')} onClick={() => toggle(v.id)}>
                        <td className="p-2 text-slate-400">{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                        <td className="p-2 whitespace-nowrap">{v.date}</td>
                        <td className="p-2 font-mono font-bold whitespace-nowrap">{v.voucherNumber}</td>
                        <td className="p-2"><VoucherBadge type={v.voucherType} label={VOUCHER_TYPES[v.voucherType]?.label || v.voucherType} /></td>
                        <td className="p-2">
                          <div className="font-bold text-slate-900">{v.partyName || v.lines[0]?.account}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{v.narration}</div>
                        </td>
                        <td className={cx('p-2 text-right font-mono font-bold', v.cancelled && 'line-through')}>{plain(v.amount)}</td>
                        <td className={cx('p-2 text-right font-mono font-bold', v.cancelled && 'line-through')}>{plain(v.amount)}</td>
                        <td className="p-2 text-right whitespace-nowrap">
                          {v.cancelled ? (
                            <span className="text-[10px] font-black text-rose-600 uppercase">Cancelled</span>
                          ) : v.sourceType === 'MANUAL' ? (
                            <button onClick={(e) => { e.stopPropagation(); setCancelling(v); }} className="text-rose-600 hover:text-rose-800" title="Cancel voucher">
                              <XCircle className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">{SOURCE[v.sourceType] || v.sourceType}</span>
                          )}
                        </td>
                      </tr>
                      {isOpen &&
                        v.lines.map((l, i) => (
                          <tr key={`${v.id}-${i}`} className="bg-slate-50/70 text-[11px]">
                            <td />
                            <td />
                            <td colSpan={3} className="px-2 py-1">
                              <span className={cx('inline-block w-7 font-black', l.debit ? 'text-slate-900' : 'text-slate-400 pl-4')}>{l.debit ? 'Dr' : 'Cr'}</span>
                              <span className={cx(!l.debit && 'pl-4')}>{l.account}</span>
                              <span className="text-slate-400"> · {l.group}</span>
                            </td>
                            <td className="px-2 py-1 text-right font-mono">{l.debit ? plain(l.debit) : ''}</td>
                            <td className="px-2 py-1 text-right font-mono">{l.credit ? plain(l.credit) : ''}</td>
                            <td />
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <VoucherForm
          onClose={() => setCreating(false)}
          onSaved={(m) => {
            showToast(m);
            setCreating(false);
            q.reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}

      <Modal
        open={!!cancelling}
        title={`Cancel ${cancelling?.voucherNumber || ''}`}
        onClose={() => setCancelling(null)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setCancelling(null)}>Back</Button>
            <Button tone="danger" busy={busy} disabled={!reason.trim()} onClick={cancel}>Cancel voucher</Button>
          </>
        }
      >
        <p className="text-xs text-slate-600">The voucher stays in the day book marked cancelled and stops counting in every report.</p>
        <Field label="Reason (required)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>
      </Modal>
    </div>
  );
}

type Line = { accountId: string; side: 'Dr' | 'Cr'; amount: string };

const HELP: Record<string, string> = {
  RECEIPT: 'Money received (other than from customers): capital brought in, loan taken, other income, refund. Debit cash/bank.',
  PAYMENT: 'Money paid: supplier / plant payment, salary, rent, loan repayment, drawings. Credit cash/bank.',
  CONTRA: 'Money moved between your own cash and bank ledgers: cash deposited in bank, cash withdrawn.',
  JOURNAL: 'Non-cash adjustment: depreciation, provisions, opening capital, transfer between ledgers.',
};

function VoucherForm({ onClose, onSaved, onError }: { onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const ledgersQ = useApiData<LedgerOption[]>('/api/books/accounts', onError);
  const billsQ = useApiData<Bill[]>('/api/books/purchases', onError);
  const ledgers = useMemo(() => (ledgersQ.data ?? []).filter((l) => !(l.groupName === 'Sundry Debtors' && l.partyId)), [ledgersQ.data]);
  const openBills = (billsQ.data ?? []).filter((b) => b.status === 'Unpaid' || b.status === 'Partial');
  const [type, setType] = useState<VoucherType>('PAYMENT');
  const [date, setDate] = useState(today());
  const [narration, setNarration] = useState('');
  const [billId, setBillId] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { accountId: '', side: 'Dr', amount: '' },
    { accountId: '', side: 'Cr', amount: '' },
  ]);
  const [busy, setBusy] = useState(false);

  const dr = lines.filter((l) => l.side === 'Dr').reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const cr = lines.filter((l) => l.side === 'Cr').reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const diff = Math.round((dr - cr) * 100) / 100;
  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const pickBill = (id: string) => {
    setBillId(id);
    const bill = openBills.find((b) => b.id === id);
    if (!bill) return;
    const supplier = ledgers.find((l) => l.partyId === bill.supplierId);
    const due = Math.round((bill.grandTotal - bill.paidAmount) * 100) / 100;
    const money = ledgers.find((l) => l.groupName === 'Bank Accounts') || ledgers.find((l) => l.groupName === 'Cash-in-Hand');
    setLines([
      { accountId: supplier?.id || '', side: 'Dr', amount: String(due) },
      { accountId: money?.id || '', side: 'Cr', amount: String(due) },
    ]);
    setNarration(`Payment against ${bill.billNumber} (supplier bill ${bill.supplierInvoiceNo})`);
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        voucherType: type,
        date,
        narration,
        againstBillId: type === 'PAYMENT' && billId ? billId : null,
        lines: lines.filter((l) => l.accountId && Number(l.amount) > 0).map((l) => ({ accountId: l.accountId, debit: l.side === 'Dr' ? Number(l.amount) : 0, credit: l.side === 'Cr' ? Number(l.amount) : 0 })),
      };
      const v = await api<{ voucherNumber: string }>('/api/books/vouchers', { body });
      onSaved(`Voucher ${v.voucherNumber} saved.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const g = new Map<string, LedgerOption[]>();
    ledgers.forEach((l) => g.set(l.groupName, [...(g.get(l.groupName) || []), l]));
    return [...g.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [ledgers]);

  return (
    <Modal
      open
      wide
      title="New voucher"
      onClose={onClose}
      footer={
        <>
          <Button tone="secondary" onClick={onClose}>Close</Button>
          <Button busy={busy} disabled={diff !== 0 || dr <= 0} onClick={save}>Save voucher</Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 w-fit">
        {MANUAL_VOUCHER_TYPES.map((t) => (
          <button key={t} onClick={() => { setType(t); setBillId(''); }} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', type === t ? 'bg-white shadow text-slate-900' : 'text-slate-500')}>
            {VOUCHER_TYPES[t].label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{HELP[type]} Customer receipts go through Accounts → Payments so the customer ledger stays exact.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        {type === 'PAYMENT' && (
          <Field label="Against purchase bill (optional)" className="sm:col-span-2">
            <select value={billId} onChange={(e) => pickBill(e.target.value)} className={inputClass}>
              <option value="">— on account / not against a bill —</option>
              {openBills.map((b) => (
                <option key={b.id} value={b.id}>{b.billNumber} · {b.supplierName} · bill {b.supplierInvoiceNo} · due {money(b.grandTotal - b.paidAmount)}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 w-24 text-left">Dr/Cr</th>
              <th className="p-2 text-left">Ledger</th>
              <th className="p-2 w-36 text-right">Amount</th>
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-1.5">
                  <select value={l.side} onChange={(e) => set(i, { side: e.target.value as 'Dr' | 'Cr' })} className={cx(inputClass, 'py-1.5 text-xs font-bold')}>
                    <option>Dr</option>
                    <option>Cr</option>
                  </select>
                </td>
                <td className="p-1.5">
                  <select value={l.accountId} onChange={(e) => set(i, { accountId: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs')}>
                    <option value="">Choose ledger…</option>
                    {grouped.map(([g, list]) => (
                      <optgroup key={g} label={g}>
                        {list.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td className="p-1.5">
                  <input type="number" min={0} step="0.01" value={l.amount} onChange={(e) => set(i, { amount: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs text-right font-mono')} />
                </td>
                <td className="p-1.5 text-center">
                  {lines.length > 2 && (
                    <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200 text-xs">
            <tr>
              <td colSpan={2} className="p-2">
                <button onClick={() => setLines([...lines, { accountId: '', side: diff > 0 ? 'Cr' : 'Dr', amount: diff ? String(Math.abs(diff)) : '' }])} className="font-bold text-emerald-700 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add line
                </button>
              </td>
              <td className="p-2 text-right font-mono">
                <div>Dr {plain(dr)}</div>
                <div>Cr {plain(cr)}</div>
                {diff !== 0 && <div className="text-rose-600 font-black">Difference {plain(Math.abs(diff))}</div>}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <Field label="Narration">
        <input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Salary for September paid to Ramesh" className={inputClass} />
      </Field>
    </Modal>
  );
}
