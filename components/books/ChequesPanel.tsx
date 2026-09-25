'use client';

import React, { useState } from 'react';
import { Landmark, ScrollText } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Field, inputClass, Modal, today, useToast } from '../ui';
import { BooksHeader, Column, Kpi, money, PeriodBar, plain, ReportTable, sum, usePeriod } from './shared';

interface Cheque { id: string; paymentNumber: string; customerName: string; chequeNumber: string; bank: string; chequeDate: string; receivedOn: string; amount: number; status: string; depositedOn: string | null; clearedOn: string | null; bouncedOn: string | null; bounceReason: string | null; bounceCharges: number; verified: boolean }
const TONE: Record<string, 'amber' | 'blue' | 'green' | 'red' | 'slate'> = { PDC: 'amber', RECEIVED: 'blue', DEPOSITED: 'blue', CLEARED: 'green', BOUNCED: 'red', REJECTED: 'slate' };

export default function ChequesPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [period, setPeriod] = usePeriod('month');
  const q = useApiData<Cheque[]>(`/api/books/cheques?from=${period.from}&to=${period.to}`, onError);
  const rows = q.data ?? [];
  const [acting, setActing] = useState<{ c: Cheque; action: 'deposit' | 'clear' | 'bounce' } | null>(null);
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [charges, setCharges] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!acting) return;
    setBusy(true);
    try {
      await api('/api/books/cheques', { method: 'PATCH', body: { id: acting.c.id, action: acting.action, date, reason, charges: Number(charges) || 0 } });
      showToast(acting.action === 'bounce' ? 'Bounced — the amount is due from the customer again, and they were informed.' : acting.action === 'clear' ? 'Cleared.' : 'Deposited.');
      setActing(null);
      setReason('');
      setCharges('');
      q.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Cheque>[] = [
    { label: 'Cheque date', render: (c) => c.chequeDate || '—' },
    { label: 'Cheque', render: (c) => <div><div className="font-mono font-bold">{c.chequeNumber}</div><div className="text-[10px] text-slate-400">{c.bank}</div></div> },
    { label: 'Customer', render: (c) => <div><div className="font-bold">{c.customerName}</div><div className="text-[10px] text-slate-400">{c.paymentNumber} · received {c.receivedOn}</div></div> },
    { label: 'Amount', align: 'right', render: (c) => plain(c.amount), total: (r) => plain(sum(r, (x) => x.amount)) },
    { label: 'Status', render: (c) => <div><Badge tone={TONE[c.status] || 'slate'}>{c.status}</Badge>{c.bounceReason && <div className="text-[10px] text-rose-600">{c.bounceReason}{c.bounceCharges ? ` · charges ${plain(c.bounceCharges)}` : ''}</div>}{!c.verified && c.status !== 'REJECTED' && <div className="text-[10px] text-amber-600">not verified yet</div>}</div> },
    {
      label: '',
      render: (c) =>
        c.status === 'BOUNCED' || c.status === 'REJECTED' || c.status === 'CLEARED' ? null : (
          <div className="flex justify-end gap-1">
            {c.status !== 'DEPOSITED' && <Button size="sm" tone="secondary" onClick={() => setActing({ c, action: 'deposit' })}>Deposit</Button>}
            <Button size="sm" onClick={() => setActing({ c, action: 'clear' })} disabled={!c.verified}>Cleared</Button>
            <Button size="sm" tone="danger" onClick={() => setActing({ c, action: 'bounce' })}>Bounced</Button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={ScrollText} title="Cheque register" subtitle="Cheques from customers: post-dated (PDC), deposited, cleared or bounced. A bounce puts the amount back on the customer's account (with charges if any) and tells them on WhatsApp." />
      <PeriodBar value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Post-dated (PDC)" value={money(sum(rows.filter((r) => r.status === 'PDC'), (r) => r.amount))} tone="amber" />
        <Kpi label="To deposit / clear" value={money(sum(rows.filter((r) => r.status === 'RECEIVED' || r.status === 'DEPOSITED'), (r) => r.amount))} tone="blue" />
        <Kpi label="Cleared" value={money(sum(rows.filter((r) => r.status === 'CLEARED'), (r) => r.amount))} tone="green" />
        <Kpi label="Bounced" value={money(sum(rows.filter((r) => r.status === 'BOUNCED'), (r) => r.amount))} tone="red" />
      </div>
      <ReportTable rows={rows} columns={columns} rowKey={(c) => c.id} empty="No cheques in this period." />
      {acting && (
        <Modal open title={`${acting.action === 'bounce' ? 'Bounced' : acting.action === 'clear' ? 'Cleared' : 'Deposited'} — cheque ${acting.c.chequeNumber}`} onClose={() => setActing(null)} footer={<Button tone={acting.action === 'bounce' ? 'danger' : 'primary'} busy={busy} disabled={acting.action === 'bounce' && !reason.trim()} onClick={submit}>Confirm</Button>}>
          <p className="text-xs text-slate-600">{acting.c.customerName} · {money(acting.c.amount)} · {acting.c.bank}</p>
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
          {acting.action === 'bounce' && (
            <>
              <Field label="Reason (from the bank memo)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Funds insufficient" className={inputClass} /></Field>
              <Field label="Bounce charges to recover from the customer" hint="Optional — added to their account."><input type="number" min={0} value={charges} onChange={(e) => setCharges(e.target.value)} className={inputClass} /></Field>
              <p className="text-[11px] text-rose-700 font-semibold flex gap-1"><Landmark className="h-3.5 w-3.5 shrink-0" /> The receipt is reversed in the books and the customer’s dues go up by {money(acting.c.amount)}.</p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
