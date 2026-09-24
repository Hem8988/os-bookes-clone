'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Lock, RefreshCw, Unlock } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useSession } from '../lib/auth';
import { Badge, Button, Card, Field, inputClass, Modal, Stat, StatusBadge, cx, dateTime, today, useToast } from './ui';

// Accountant day closing (SRS §12.1): reconcile → lock. A locked day can be
// re-opened only by the Super Admin, with a reason, and it is audit-flagged.

interface Summary {
  date: string;
  status: string;
  closing: { lockedBy: string; lockedAt: string; reopenedBy: string | null; reopenReason: string | null } | null;
  deliveries: { total: number; verified: number; cylinders: number; empties: number; variances: number };
  collections: { cash: number; online: number; cheque: number; credit: number; latePayments: number };
  cash: { expectedFromDeliveries: number; submittedAndApproved: number; pendingSubmissions: number; stillWithDeliveryBoys: number; companyCash: number };
  invoices: { count: number; total: number };
  deliveryBoys: { name: string; status: string; openingCash: number; closingCash: number | null }[];
  pending: Record<string, number>;
  pendingApprovals: number;
}

export default function DayClosingModule() {
  const { can } = useSession();
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<{ id: string; date: string; status: string; lockedBy: string; lockedAt: string; reopenedBy: string | null; reopenReason: string | null }[]>([]);
  const [dialog, setDialog] = useState<'lock' | 'reopen' | 'request' | null>(null);
  const [reason, setReason] = useState('');
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([api<Summary>(`/api/financial/day-lock?date=${date}`), api<typeof history>('/api/financial/day-lock?history=1')]);
      setSummary(s);
      setHistory(h);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [date, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      const action = dialog === 'lock' ? 'LOCK_DAY' : dialog === 'reopen' ? 'REOPEN_DAY' : 'REQUEST_REOPEN';
      const res = await fetch('/api/financial/day-lock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, date, reason, notes: reason, force }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(json.message);
      setDialog(null);
      setReason('');
      setForce(false);
      await load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const blockers = summary ? Object.entries(summary.pending).filter(([, n]) => n > 0) : [];
  const cashGap = summary ? summary.cash.expectedFromDeliveries - summary.cash.submittedAndApproved : 0;

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Day Closing</h2>
        <div className="flex items-center gap-2">
          <input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} className={cx(inputClass, 'w-44')} />
          <Button tone="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {summary && (
        <>
          <Card
            title={
              <span className="flex items-center gap-2">
                {summary.date} <StatusBadge status={summary.status === 'OPEN' ? 'PENDING' : summary.status} />
              </span>
            }
            actions={
              summary.status === 'LOCKED' ? (
                can('dayclose.reopen') ? (
                  <Button tone="danger" size="sm" onClick={() => setDialog('reopen')}><Unlock className="h-3.5 w-3.5" /> Re-open day</Button>
                ) : (
                  <Button tone="secondary" size="sm" onClick={() => setDialog('request')}><Unlock className="h-3.5 w-3.5" /> Request re-open</Button>
                )
              ) : (
                <Button size="sm" onClick={() => setDialog('lock')}><Lock className="h-3.5 w-3.5" /> Close & lock day</Button>
              )
            }
          >
            {summary.closing && (
              <p className="text-xs text-slate-500 mb-3">
                Locked by {summary.closing.lockedBy} at {dateTime(summary.closing.lockedAt)}
                {summary.closing.reopenedBy && <> · re-opened by {summary.closing.reopenedBy}: “{summary.closing.reopenReason}”</>}
              </p>
            )}
            {blockers.length > 0 && summary.status !== 'LOCKED' && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Pending before lock: {blockers.map(([k, n]) => `${n} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join(', ')}</span>
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Deliveries" value={`${summary.deliveries.verified}/${summary.deliveries.total} verified`} sub={`${summary.deliveries.cylinders} full · ${summary.deliveries.empties} empty · ${summary.deliveries.variances} variances`} />
              <Stat label="Invoices" value={inr(summary.invoices.total)} sub={`${summary.invoices.count} invoices`} />
              <Stat label="Cash collected" value={inr(summary.collections.cash)} sub={`Online ${inr(summary.collections.online)} · Cheque ${inr(summary.collections.cheque)}`} />
              <Stat label="Credit given" value={inr(summary.collections.credit)} sub={`Late payments ${inr(summary.collections.latePayments)}`} />
            </div>
          </Card>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Cash reconciliation">
              <Row label="Cash collected on deliveries" value={inr(summary.cash.expectedFromDeliveries)} />
              <Row label="Cash submitted & approved today" value={inr(summary.cash.submittedAndApproved)} />
              <Row label="Submissions waiting approval" value={inr(summary.cash.pendingSubmissions)} />
              <Row label="Still with delivery boys (all days)" value={inr(summary.cash.stillWithDeliveryBoys)} />
              <Row label="Company cash balance" value={inr(summary.cash.companyCash)} />
              <div className={cx('mt-2 p-2 rounded-lg text-xs font-bold', Math.abs(cashGap) < 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
                {Math.abs(cashGap) < 1 ? 'Today’s cash is fully submitted.' : `${inr(cashGap)} of today’s cash is not yet submitted.`}
              </div>
            </Card>
            <Card title="Delivery boys">
              {summary.deliveryBoys.length === 0 && <p className="text-xs text-slate-400">Nobody started a day.</p>}
              {summary.deliveryBoys.map((b) => (
                <div key={b.name} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                  <span className="font-bold">{b.name}</span>
                  <span className="flex items-center gap-2">
                    {b.closingCash != null && <span>closing cash {inr(b.closingCash)}</span>}
                    <Badge tone={b.status === 'CLOSED' ? 'slate' : 'amber'}>{b.status === 'CLOSED' ? 'Closed' : 'Open'}</Badge>
                  </span>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      <Card title="Recent closings">
        {history.map((h) => (
          <div key={h.id} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
            <span className="font-mono font-bold">{h.date}</span>
            <span>
              <StatusBadge status={h.status} /> {h.lockedBy}
              {h.reopenedBy && <span className="text-rose-600"> · re-opened by {h.reopenedBy}</span>}
            </span>
          </div>
        ))}
      </Card>

      <Modal
        open={!!dialog}
        title={dialog === 'lock' ? `Lock ${date}` : dialog === 'reopen' ? `Re-open ${date}` : `Request re-open of ${date}`}
        onClose={() => setDialog(null)}
        footer={<Button tone={dialog === 'lock' ? 'primary' : 'danger'} busy={busy} disabled={dialog !== 'lock' && !reason.trim()} onClick={act}>Confirm</Button>}
      >
        {dialog === 'lock' ? (
          <>
            <p className="text-xs text-slate-600">After locking, no delivery, payment, cash or stock entry can change this date.</p>
            <Field label="Closing note (optional)"><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></Field>
            {blockers.length > 0 && can('dayclose.reopen') && (
              <label className="flex items-center gap-2 text-xs font-bold text-rose-700">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Lock anyway (admin override, audit-flagged)
              </label>
            )}
          </>
        ) : (
          <Field label="Reason (required)"><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></Field>
        )}
      </Modal>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-xs py-1.5 border-b border-slate-50">
    <span className="text-slate-600">{label}</span>
    <span className="font-mono font-bold">{value}</span>
  </div>
);
