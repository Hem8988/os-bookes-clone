'use client';

import React, { useMemo, useState } from 'react';
import { Percent, Plus } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { sectionLabel, TDS_SECTIONS } from '../../lib/tds';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Field, inputClass, Modal, today, useToast } from '../ui';
import { BooksHeader, Column, Kpi, LedgerOption, money, PeriodBar, plain, ReportTable, sum, Tabs, usePeriod } from './shared';
import { SupplierSelect } from './SupplierSelect';

interface Entry { id: string; entryNumber: string; direction: 'RECEIVABLE' | 'PAYABLE'; date: string; partyName: string; pan: string | null; section: string; baseAmount: number; rate: number; amount: number; referenceNo: string | null; certificateNo: string | null; challanNo: string | null; depositedOn: string | null; cancelled: boolean; quarter: string; dueOn: string | null; state: string }
interface Party { id: string; name: string; shortName?: string | null; gstin?: string | null }
interface InvoiceRef { id: string; invoiceNumber: string; date: string; grandTotal: number }
interface BillRef { id: string; billNumber: string; supplierInvoiceNo: string; date: string; grandTotal: number; paidAmount: number; status: string }

const STATE_TONE: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = { Deposited: 'green', 'Certificate received': 'green', 'To deposit': 'amber', 'Awaiting Form 16A': 'blue', Overdue: 'red', Cancelled: 'slate' };

export default function TdsPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [period, setPeriod] = usePeriod('month');
  const [dir, setDir] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const q = useApiData<Entry[]>(`/api/books/tds?from=${period.from}&to=${period.to}&direction=${dir}`, onError);
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const live = rows.filter((r) => !r.cancelled);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [depositing, setDepositing] = useState(false);
  const [cert, setCert] = useState<Entry | null>(null);
  const [cancelling, setCancelling] = useState<Entry | null>(null);

  const patch = async (body: object, done: () => void) => {
    try {
      await api('/api/books/tds', { method: 'PATCH', body });
      done();
      q.reload();
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  const columns: Column<Entry>[] = [
    ...(dir === 'PAYABLE' ? [{ label: '', render: (e: Entry) => (!e.cancelled && !e.depositedOn ? <input type="checkbox" checked={picked.includes(e.id)} onChange={(ev) => setPicked(ev.target.checked ? [...picked, e.id] : picked.filter((x) => x !== e.id))} /> : null) }] : []),
    { label: 'Date', render: (e) => e.date },
    { label: 'Entry', render: (e) => <span className="font-mono">{e.entryNumber}</span> },
    { label: dir === 'RECEIVABLE' ? 'Customer (deductor)' : 'Supplier (deductee)', render: (e) => <div><div className="font-bold">{e.partyName}</div><div className="text-[10px] text-slate-400">{e.pan || 'PAN not known'}{e.referenceNo ? ` · ${e.referenceNo}` : ''}</div></div> },
    { label: 'Section', render: (e) => <span title={sectionLabel(e.section)}>{e.section}</span> },
    { label: 'Paid / billed', align: 'right', render: (e) => (e.baseAmount ? plain(e.baseAmount) : '—') },
    { label: 'Rate', align: 'right', render: (e) => (e.rate ? `${e.rate}%` : '—') },
    { label: 'TDS', align: 'right', render: (e) => <span className={e.cancelled ? 'line-through text-slate-400' : 'font-bold'}>{plain(e.amount)}</span>, total: (r) => plain(sum(r.filter((x) => !x.cancelled), (x) => x.amount)) },
    { label: 'Status', render: (e) => <div><Badge tone={STATE_TONE[e.state] || 'slate'}>{e.state}</Badge><div className="text-[10px] text-slate-400">{e.direction === 'PAYABLE' ? (e.challanNo ? `Challan ${e.challanNo} · ${e.depositedOn}` : `Due ${e.dueOn}`) : e.certificateNo ? `16A ${e.certificateNo}` : e.quarter}</div></div> },
    {
      label: '',
      render: (e) =>
        e.cancelled ? null : (
          <div className="flex justify-end gap-1">
            {e.direction === 'RECEIVABLE' && <Button size="sm" tone="ghost" onClick={() => setCert(e)}>Form 16A</Button>}
            {!e.depositedOn && <Button size="sm" tone="ghost" onClick={() => setCancelling(e)}>Cancel</Button>}
          </div>
        ),
    },
  ];

  const toDeposit = live.filter((e) => e.direction === 'PAYABLE' && !e.depositedOn);
  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader
        icon={Percent}
        title="TDS"
        subtitle="TDS your customers cut from your bills (claim it via 26AS / Form 16A) and TDS you cut from suppliers (deposit by the 7th of next month). TCS on sale of goods ended on 1 April 2025, so it isn’t tracked."
        actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Record TDS</Button>}
      />
      <PeriodBar value={period} onChange={setPeriod} />
      <Tabs value={dir} onChange={(v) => { setDir(v); setPicked([]); }} items={[['RECEIVABLE', 'Deducted by customers (receivable)'], ['PAYABLE', 'Deducted by us (payable)']]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {dir === 'RECEIVABLE' ? (
          <>
            <Kpi label="TDS receivable" value={money(sum(live, (e) => e.amount))} tone="blue" />
            <Kpi label="Awaiting Form 16A" value={money(sum(live.filter((e) => !e.certificateNo), (e) => e.amount))} tone="amber" />
            <Kpi label="Certificates received" value={String(live.filter((e) => e.certificateNo).length)} tone="green" />
            <Kpi label="Entries" value={String(live.length)} />
          </>
        ) : (
          <>
            <Kpi label="TDS deducted" value={money(sum(live, (e) => e.amount))} />
            <Kpi label="To deposit" value={money(sum(toDeposit, (e) => e.amount))} tone="amber" />
            <Kpi label="Overdue" value={money(sum(live.filter((e) => e.state === 'Overdue'), (e) => e.amount))} tone="red" hint="Interest 1.5% a month" />
            <Kpi label="Deposited" value={money(sum(live.filter((e) => e.depositedOn), (e) => e.amount))} tone="green" />
          </>
        )}
      </div>
      {dir === 'PAYABLE' && picked.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
          <span><strong>{picked.length}</strong> selected · {money(sum(rows.filter((r) => picked.includes(r.id)), (r) => r.amount))}</span>
          <Button size="sm" onClick={() => setDepositing(true)}>Record challan payment</Button>
        </div>
      )}
      <ReportTable rows={rows} columns={columns} rowKey={(e) => e.id} dense empty="No TDS entries in this period." />

      {adding && <NewTds direction={dir} onClose={() => setAdding(false)} onSaved={(m) => { showToast(m); setAdding(false); q.reload(); }} onError={onError} />}
      {depositing && <Deposit ids={picked} total={sum(rows.filter((r) => picked.includes(r.id)), (r) => r.amount)} onClose={() => setDepositing(false)} onError={onError} onDone={() => { showToast('Challan recorded and the payment voucher posted.'); setDepositing(false); setPicked([]); q.reload(); }} />}
      {cert && <CertForm e={cert} onClose={() => setCert(null)} onSubmit={(certificateNo, certificateDate) => patch({ action: 'certificate', id: cert.id, certificateNo, certificateDate }, () => { showToast('Certificate saved.'); setCert(null); })} />}
      {cancelling && <CancelForm e={cancelling} onClose={() => setCancelling(null)} onSubmit={(reason) => patch({ action: 'cancel', id: cancelling.id, reason }, () => { showToast('Cancelled.'); setCancelling(null); })} />}
    </div>
  );
}

function NewTds({ direction, onClose, onSaved, onError }: { direction: 'RECEIVABLE' | 'PAYABLE'; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const parties = useApiData<Party[]>(direction === 'RECEIVABLE' ? '/api/customers' : null, onError).data ?? [];
  const [v, setV] = useState({ date: today(), partyId: '', section: direction === 'RECEIVABLE' ? '194Q' : '194C', baseAmount: '', rate: String(TDS_SECTIONS.find((s) => s.code === (direction === 'RECEIVABLE' ? '194Q' : '194C'))!.rate), amount: '', referenceId: '', pan: '', notes: '' });
  const invoices = useApiData<InvoiceRef[]>(direction === 'RECEIVABLE' && v.partyId ? `/api/books/credit-notes?invoicesFor=${v.partyId}` : null, onError).data ?? [];
  const bills = (useApiData<BillRef[]>(direction === 'PAYABLE' && v.partyId ? `/api/books/purchases?supplierId=${v.partyId}` : null, onError).data ?? []).filter((b) => b.status !== 'Cancelled' && b.grandTotal - b.paidAmount > 0.5);
  const [busy, setBusy] = useState(false);
  const calc = (base: string, rate: string) => (Number(base) && Number(rate) ? String(Math.round(Number(base) * Number(rate)) / 100) : '');
  const save = async () => {
    setBusy(true);
    try {
      const e = await api<{ entryNumber: string }>('/api/books/tds', { body: { ...v, direction, baseAmount: Number(v.baseAmount) || 0, rate: Number(v.rate) || 0, amount: Number(v.amount) || 0, referenceType: v.referenceId ? (direction === 'RECEIVABLE' ? 'INVOICE' : 'PURCHASE_BILL') : null } });
      onSaved(`TDS ${e.entryNumber} recorded${direction === 'RECEIVABLE' ? ' — the customer’s dues are reduced.' : ' — the supplier is owed less.'}`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open wide title={direction === 'RECEIVABLE' ? 'TDS deducted by a customer' : 'TDS deducted from a supplier'} onClose={onClose} footer={<Button busy={busy} disabled={!v.partyId || !(Number(v.amount) > 0)} onClick={save}>Save</Button>}>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Date"><input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className={inputClass} /></Field>
        <Field label={direction === 'RECEIVABLE' ? 'Customer' : 'Supplier'}>
          {direction === 'PAYABLE' ? (
            <SupplierSelect value={v.partyId} onError={onError} onChange={(id, p) => setV({ ...v, partyId: id, referenceId: '', pan: p?.gstin && p.gstin.length === 15 ? p.gstin.slice(2, 12) : '' })} />
          ) : (
            <select value={v.partyId} onChange={(e) => { const p = parties.find((x) => x.id === e.target.value); setV({ ...v, partyId: e.target.value, referenceId: '', pan: p?.gstin && p.gstin.length === 15 ? p.gstin.slice(2, 12) : '' }); }} className={inputClass}>
              <option value="">Choose…</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.shortName || p.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="PAN" hint="Taken from the GSTIN when available"><input value={v.pan} onChange={(e) => setV({ ...v, pan: e.target.value.toUpperCase() })} className={inputClass} maxLength={10} /></Field>
        <Field label="Section"><select value={v.section} onChange={(e) => { const rate = String(TDS_SECTIONS.find((s) => s.code === e.target.value)?.rate ?? 0); setV({ ...v, section: e.target.value, rate, amount: calc(v.baseAmount, rate) || v.amount }); }} className={inputClass}>{TDS_SECTIONS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}</select></Field>
        <Field label={direction === 'RECEIVABLE' ? 'Bill amount (before GST)' : 'Amount paid / credited'}><input type="number" value={v.baseAmount} onChange={(e) => setV({ ...v, baseAmount: e.target.value, amount: calc(e.target.value, v.rate) || v.amount })} className={inputClass} /></Field>
        <Field label="Rate %"><input type="number" step="0.01" value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value, amount: calc(v.baseAmount, e.target.value) || v.amount })} className={inputClass} /></Field>
        <Field label="TDS amount ₹"><input type="number" step="0.01" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} className={inputClass} /></Field>
        <Field label={direction === 'RECEIVABLE' ? 'Against invoice (optional)' : 'Against purchase bill (optional)'}>
          <select value={v.referenceId} onChange={(e) => setV({ ...v, referenceId: e.target.value })} className={inputClass}>
            <option value="">—</option>
            {direction === 'RECEIVABLE' ? invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.date} · {plain(i.grandTotal)}</option>) : bills.map((b) => <option key={b.id} value={b.id}>{b.billNumber} ({b.supplierInvoiceNo}) · due {plain(b.grandTotal - b.paidAmount)}</option>)}
          </select>
        </Field>
        <Field label="Notes"><input value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className={inputClass} /></Field>
      </div>
      <p className="text-[11px] text-slate-500">{direction === 'RECEIVABLE' ? 'Books: Dr TDS Receivable, Cr customer. The customer’s outstanding goes down by the TDS.' : 'Books: Dr supplier, Cr TDS Payable. Pay it by challan (ITNS 281) by the 7th of next month — 30 April for March.'}</p>
    </Modal>
  );
}

function Deposit({ ids, total, onClose, onDone, onError }: { ids: string[]; total: number; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const banks = (useApiData<LedgerOption[]>('/api/books/accounts', onError).data ?? []).filter((l) => l.groupName === 'Bank Accounts');
  const [v, setV] = useState({ date: today(), challanNo: '', bankAccountId: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/books/tds', { method: 'PATCH', body: { action: 'deposit', ids, ...v, bankAccountId: v.bankAccountId || banks[0]?.id } });
      onDone();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={`Challan payment · ${money(total)}`} onClose={onClose} footer={<Button busy={busy} disabled={!v.challanNo.trim() || !banks.length} onClick={save}>Save</Button>}>
      <Field label="Paid on"><input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className={inputClass} /></Field>
      <Field label="Challan no. / CIN" hint="BSR code + date + serial from the challan counterfoil"><input value={v.challanNo} onChange={(e) => setV({ ...v, challanNo: e.target.value })} className={inputClass} /></Field>
      <Field label="Paid from"><select value={v.bankAccountId || banks[0]?.id || ''} onChange={(e) => setV({ ...v, bankAccountId: e.target.value })} className={inputClass}>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
    </Modal>
  );
}

function CertForm({ e, onClose, onSubmit }: { e: Entry; onClose: () => void; onSubmit: (no: string, date: string) => void }) {
  const [no, setNo] = useState(e.certificateNo || '');
  const [date, setDate] = useState(today());
  return (
    <Modal open title={`Form 16A — ${e.partyName}`} onClose={onClose} footer={<Button onClick={() => onSubmit(no, date)}>Save</Button>}>
      <p className="text-xs text-slate-600">{e.entryNumber} · {e.section} · {money(e.amount)} · {e.quarter}</p>
      <Field label="Certificate no."><input value={no} onChange={(ev) => setNo(ev.target.value)} className={inputClass} /></Field>
      <Field label="Certificate date"><input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}

function CancelForm({ e, onClose, onSubmit }: { e: Entry; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open title={`Cancel ${e.entryNumber}`} onClose={onClose} footer={<Button tone="danger" disabled={!reason.trim()} onClick={() => onSubmit(reason)}>Cancel entry</Button>}>
      <p className="text-xs text-slate-600">{e.partyName} · {money(e.amount)} — the ledger entry is reversed.</p>
      <Field label="Reason"><input value={reason} onChange={(ev) => setReason(ev.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}
