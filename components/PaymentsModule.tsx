'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Scale } from 'lucide-react';
import { api, errorMessage, inr, uploadFile } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { useSession } from '../lib/auth';
import { Button, Card, Empty, Field, inputClass, Modal, PartyName, StatusBadge, cx, today, useToast } from './ui';

// Late payment entry (SRS §11.5): accountant enters → verification queue →
// ledger + WhatsApp confirmation. Also manual balance adjustments.

interface Payment { id: string; paymentNumber: string; customerName: string; customerShortName: string | null; source: string; mode: string; amount: number; paymentDate: string; transactionId: string | null; chequeNumber: string | null; status: string; enteredBy: string; verifiedBy: string | null; rejectionReason: string | null }
interface CustomerOption { id: string; name: string; phone: string; balance: number; customerCode: string }

export default function PaymentsModule() {
  const { can } = useSession();
  const [status, setStatus] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [toast, showToast] = useToast();
  const paymentsQ = useApiData<Payment[]>(`/api/financial/payments${status ? `?status=${status}` : ''}`, (m) => showToast(m, 'error'));
  const payments = paymentsQ.data ?? [];
  const load = paymentsQ.reload;

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Payments</h2>
        <div className="flex gap-2">
          {(can('ledger.adjust') || can('ledger.adjust.request')) && (
            <Button tone="secondary" onClick={() => setAdjustOpen(true)}>
              <Scale className="h-4 w-4" /> Balance adjustment
            </Button>
          )}
          {can('payments.enter') && (
            <Button onClick={() => setEntryOpen(true)}>
              <Plus className="h-4 w-4" /> Record payment
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {[['', 'All'], ['PENDING_VERIFICATION', 'Waiting verification'], ['VERIFIED', 'Verified'], ['REJECTED', 'Rejected']].map(([value, label]) => (
          <button key={value} onClick={() => setStatus(value)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', status === value ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        {payments.length === 0 ? (
          <Empty>No payments.</Empty>
        ) : (
          <div className="overflow-x-auto -m-4">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="p-3">Receipt</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono font-bold">{p.paymentNumber}<div className="text-[10px] text-slate-400">{p.paymentDate}</div></td>
                    <td className="p-3"><PartyName short={p.customerShortName} legal={p.customerName} /></td>
                    <td className="p-3">{p.mode}{p.transactionId && <div className="text-[10px] text-slate-400">{p.transactionId}</div>}{p.chequeNumber && <div className="text-[10px] text-slate-400">Chq {p.chequeNumber}</div>}</td>
                    <td className="p-3 text-right font-mono font-bold">{inr(p.amount)}</td>
                    <td className="p-3">{p.source.replace(/_/g, ' ')}<div className="text-[10px] text-slate-400">by {p.enteredBy}</div></td>
                    <td className="p-3"><StatusBadge status={p.status} />{p.rejectionReason && <div className="text-[10px] text-rose-600">{p.rejectionReason}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {entryOpen && <PaymentEntryModal onClose={() => setEntryOpen(false)} onDone={(m) => { showToast(m); setEntryOpen(false); void load(); }} onError={(m) => showToast(m, 'error')} />}
      {adjustOpen && <AdjustmentModal direct={can('ledger.adjust')} onClose={() => setAdjustOpen(false)} onDone={(m) => { showToast(m); setAdjustOpen(false); }} onError={(m) => showToast(m, 'error')} />}
    </div>
  );
}

function useCustomerSearch() {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [selected, setSelected] = useState<CustomerOption | null>(null);
  useEffect(() => {
    if (selected || query.length < 2) return;
    const t = window.setTimeout(() => api<CustomerOption[]>(`/api/customers?search=${encodeURIComponent(query)}`).then(setOptions).catch(() => {}), 250);
    return () => window.clearTimeout(t);
  }, [query, selected]);
  const picker = (
    <Field label="Customer">
      {selected ? (
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span><strong>{selected.name}</strong> · outstanding {inr(selected.balance)}</span>
          <button className="font-bold text-slate-500" onClick={() => { setSelected(null); setQuery(''); }}>Change</button>
        </div>
      ) : (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name / mobile / code" className={inputClass} />
          {options.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="block w-full text-left text-xs p-1.5 hover:bg-slate-50">
              {c.name} · {c.phone} <span className="text-slate-400">{c.customerCode}</span>
            </button>
          ))}
        </>
      )}
    </Field>
  );
  return { selected, picker };
}

function PaymentEntryModal({ onClose, onDone, onError }: { onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const { selected, picker } = useCustomerSearch();
  const [form, setForm] = useState({ amount: '', mode: 'ONLINE', paymentDate: today(), transactionId: '', chequeNumber: '', chequeBank: '', chequeDate: '', notes: '' });
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const proofUrl = proof ? await uploadFile(proof) : null;
      const res = await fetch('/api/financial/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount), customerId: selected.id, proofUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onDone(json.message);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="Record customer payment" onClose={onClose} footer={<Button busy={busy} disabled={!selected || !(Number(form.amount) > 0)} onClick={submit}>Save for verification</Button>}>
      {picker}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Amount ₹"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} /></Field>
        <Field label="Mode">
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className={inputClass}>
            <option value="ONLINE">Online / UPI / NEFT</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
          </select>
        </Field>
        <Field label="Date"><input type="date" max={today()} value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className={inputClass} /></Field>
      </div>
      {form.mode === 'ONLINE' && <Field label="Transaction ID / UTR"><input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} className={inputClass} /></Field>}
      {form.mode === 'CHEQUE' && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Cheque no."><input value={form.chequeNumber} onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })} className={inputClass} /></Field>
          <Field label="Bank"><input value={form.chequeBank} onChange={(e) => setForm({ ...form, chequeBank: e.target.value })} className={inputClass} /></Field>
          <Field label="Cheque date"><input type="date" value={form.chequeDate} onChange={(e) => setForm({ ...form, chequeDate: e.target.value })} className={inputClass} /></Field>
        </div>
      )}
      <Field label="Proof (screenshot / cheque photo)"><input type="file" accept="image/*,application/pdf" onChange={(e) => setProof(e.target.files?.[0] || null)} className="text-xs" /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} /></Field>
      <p className="text-[11px] text-slate-500">The payment reaches the ledger after verification by another accountant or the admin. The customer then gets a WhatsApp confirmation with the updated balance.</p>
    </Modal>
  );
}

function AdjustmentModal({ direct, onClose, onDone, onError }: { direct: boolean; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const { selected, picker } = useCustomerSearch();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch('/api/financial/ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: selected.id, amount: Number(amount), reason }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onDone(json.message);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={direct ? 'Adjust customer balance' : 'Request balance adjustment'} onClose={onClose} footer={<Button busy={busy} disabled={!selected || !Number(amount) || !reason.trim()} onClick={submit}>{direct ? 'Post adjustment' : 'Send to admin'}</Button>}>
      {picker}
      <Field label="Amount ₹" hint="Positive increases the outstanding, negative reduces it.">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Reason (required)"><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}
