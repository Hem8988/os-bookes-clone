'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, MapPin, RefreshCw, XCircle } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { APPROVAL_TYPES, ApprovalType } from '../lib/permissions';
import { Badge, Button, Card, Empty, Field, inputClass, Modal, StatusBadge, cx, dateTime, useToast } from './ui';

interface ApprovalItem {
  id: string;
  type: ApprovalType;
  title: string;
  summary: string | null;
  status: string;
  requestedByName: string;
  decidedByName: string | null;
  decisionNote: string | null;
  createdAt: string;
  dueAt: string | null;
  payload: Record<string, unknown> | null;
  // The referenced record differs per queue type (order, delivery, payment…).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reference: Record<string, any> | null;
  logs: { id: string; action: string; actorName: string; note: string | null; createdAt: string }[];
}

interface DeliveryLine { id: string; productId: string; productName: string; orderedQty: number; deliveredQty: number; emptyReceivedQty: number; totalAmount: number }
interface OrderLine { id: string; productName: string; orderedQty: number; totalAmount: number }
interface TransferLine { id: string; productName: string; fullQty: number; emptyQty: number }

interface Props {
  /** Restrict to these queue types (e.g. the accountant's verification tasks). */
  types?: ApprovalType[];
  title?: string;
}

/** Central approval queue (SRS §8): view → approve / reject with reason. */
export default function ApprovalQueueModule({ types, title = 'Approval Queue' }: Props) {
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<{ action: 'APPROVE' | 'REJECT'; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const typeKey = types?.join(',') || '';
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status });
      if (typeKey) qs.set('type', typeKey);
      const data = await api<ApprovalItem[]>(`/api/cylinder/approval-queue?${qs}`);
      setItems(data);
      setSelectedId((cur) => (cur && data.some((d) => d.id === cur) ? cur : data[0]?.id || null));
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [status, typeKey, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => (c[i.type] = (c[i.type] || 0) + 1));
    return c;
  }, [items]);
  const visible = typeFilter === 'ALL' ? items : items.filter((i) => i.type === typeFilter);
  const selected = visible.find((i) => i.id === selectedId) || visible[0] || null;

  const decide = async () => {
    if (!selected || !decision) return;
    if (decision.action === 'REJECT' && !decision.note.trim()) return showToast('Reason is mandatory for rejection.', 'error');
    setBusy(true);
    try {
      await api('/api/cylinder/approval-queue', { body: { itemId: selected.id, action: decision.action, note: decision.note.trim() || null } });
      showToast(decision.action === 'APPROVE' ? 'Approved.' : 'Rejected.');
      setDecision(null);
      await load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <div className="flex items-center gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', status === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <Button tone="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTypeFilter('ALL')} className={cx('px-3 py-1 rounded-full text-[11px] font-bold border', typeFilter === 'ALL' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200')}>
          All ({items.length})
        </button>
        {Object.entries(counts).map(([t, n]) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={cx('px-3 py-1 rounded-full text-[11px] font-bold border', typeFilter === t ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200')}>
            {APPROVAL_TYPES[t as ApprovalType]?.label || t} ({n})
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {loading && <Empty>Loading…</Empty>}
          {!loading && visible.length === 0 && <Empty>Nothing here. 🎉</Empty>}
          {visible.map((item) => {
            const overdue = item.status === 'PENDING' && item.dueAt && new Date(item.dueAt) < new Date();
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cx('w-full text-left p-3 rounded-xl border transition', selected?.id === item.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300')}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="blue">{APPROVAL_TYPES[item.type]?.label || item.type}</Badge>
                  {overdue ? <Badge tone="red">Overdue</Badge> : <span className="text-[10px] text-slate-400">{dateTime(item.createdAt)}</span>}
                </div>
                <div className="mt-1 text-xs font-black text-slate-900">{item.title}</div>
                {item.summary && <div className="text-[11px] text-slate-600 line-clamp-2">{item.summary}</div>}
                <div className="text-[10px] text-slate-400 mt-1">by {item.requestedByName}</div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <Card
              title={selected.title}
              actions={
                selected.status === 'PENDING' ? (
                  <>
                    <Button tone="danger" size="sm" onClick={() => setDecision({ action: 'REJECT', note: '' })}>
                      <XCircle className="h-3.5 w-3.5" /> {selected.type === 'DELIVERY_VERIFICATION' ? 'Send back' : 'Reject'}
                    </Button>
                    <Button size="sm" onClick={() => setDecision({ action: 'APPROVE', note: '' })}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {selected.type === 'CREDIT_APPROVAL' ? 'Approve with override' : 'Approve'}
                    </Button>
                  </>
                ) : (
                  <StatusBadge status={selected.status} />
                )
              }
            >
              <Detail item={selected} />
              <div className="mt-4 border-t border-slate-100 pt-3 space-y-1">
                <div className="text-[10px] font-black uppercase text-slate-400">History</div>
                {selected.logs.map((log) => (
                  <div key={log.id} className="text-[11px] text-slate-600 flex gap-2">
                    <Clock className="h-3 w-3 mt-0.5 text-slate-400" />
                    <span>
                      <strong>{log.action}</strong> by {log.actorName} · {dateTime(log.createdAt)}
                      {log.note && <> — {log.note}</>}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            !loading && <Card><Empty>Select an item to review.</Empty></Card>
          )}
        </div>
      </div>

      <Modal
        open={!!decision}
        title={decision?.action === 'APPROVE' ? 'Approve' : selected?.type === 'DELIVERY_VERIFICATION' ? 'Send back for correction' : 'Reject'}
        onClose={() => setDecision(null)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setDecision(null)}>Cancel</Button>
            <Button tone={decision?.action === 'APPROVE' ? 'primary' : 'danger'} busy={busy} onClick={decide}>
              Confirm
            </Button>
          </>
        }
      >
        {selected?.type === 'CREDIT_APPROVAL' && decision?.action === 'APPROVE' && (
          <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> This customer is over the credit limit. Approving records a credit override in your name.
          </div>
        )}
        <Field label={decision?.action === 'REJECT' ? 'Reason (required)' : 'Note (optional)'}>
          <textarea value={decision?.note || ''} onChange={(e) => decision && setDecision({ ...decision, note: e.target.value })} rows={3} className={inputClass} />
        </Field>
      </Modal>
    </div>
  );
}

const Photo = ({ url, label }: { url?: string | null; label: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="h-28 w-full object-cover rounded-lg border border-slate-200" />
      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
        {label} <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  ) : null;

const Line = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) => (
  <div className="flex justify-between gap-3 text-xs py-1 border-b border-slate-50">
    <span className="text-slate-500">{label}</span>
    <span className={cx('font-bold text-right', tone || 'text-slate-900')}>{value}</span>
  </div>
);

function Detail({ item }: { item: ApprovalItem }) {
  const ref = item.reference;
  if (item.type === 'DELIVERY_VERIFICATION' && ref) {
    const orderItems: { productId: string; orderedQty: number }[] = ref.order?.items || [];
    return (
      <div className="space-y-3">
        {ref.hasVariance && (
          <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {ref.varianceNotes}
          </div>
        )}
        <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-right">Ordered</th>
              <th className="p-2 text-right">Delivered</th>
              <th className="p-2 text-right">Empty recd.</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {((ref.items || []) as DeliveryLine[]).map((i) => {
              const ordered = orderItems.find((o) => o.productId === i.productId)?.orderedQty ?? i.orderedQty;
              return (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="p-2 font-bold">{i.productName}</td>
                  <td className="p-2 text-right">{ordered}</td>
                  <td className={cx('p-2 text-right font-bold', i.deliveredQty !== ordered && 'text-amber-700')}>{i.deliveredQty}</td>
                  <td className={cx('p-2 text-right', i.emptyReceivedQty !== i.deliveredQty && 'text-amber-700')}>{i.emptyReceivedQty}</td>
                  <td className="p-2 text-right font-mono">{inr(i.totalAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="grid sm:grid-cols-2 gap-x-6">
          <div>
            <Line label="Bill amount" value={inr(ref.invoiceAmount)} />
            <Line label="Payment mode" value={ref.paymentMode} />
            <Line label="Collected" value={inr(ref.paymentAmount)} tone={ref.paymentAmount < ref.invoiceAmount && ref.paymentMode !== 'CREDIT' ? 'text-amber-700' : undefined} />
            {ref.transactionId && <Line label="Transaction ID" value={ref.transactionId} />}
            {ref.chequeNumber && <Line label="Cheque" value={`${ref.chequeNumber} · ${ref.chequeBank} · ${ref.chequeDate}`} />}
          </div>
          <div>
            <Line label="Delivery boy" value={ref.deliveryBoyName} />
            <Line label="Delivery date" value={ref.deliveryDate} />
            <Line label="Revision" value={ref.revision} />
            {ref.latitude != null && (
              <Line
                label="Location"
                value={
                  <a className="text-sky-700 flex items-center gap-1" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${ref.latitude},${ref.longitude}`}>
                    <MapPin className="h-3 w-3" /> Map
                  </a>
                }
              />
            )}
            {ref.remarks && <Line label="Remarks" value={ref.remarks} />}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Photo url={ref.deliveryProofUrl} label="Delivery proof" />
          <Photo url={ref.paymentProofUrl} label="Payment screenshot" />
          <Photo url={ref.chequePhotoUrl} label="Cheque photo" />
        </div>
      </div>
    );
  }
  if ((item.type === 'ORDER_APPROVAL' || item.type === 'CREDIT_APPROVAL') && ref) {
    const outstanding = ref.customer?.balance ?? 0;
    const limit = ref.customer?.creditLimit ?? 0;
    return (
      <div className="space-y-2">
        {((ref.items || []) as OrderLine[]).map((i) => (
          <Line key={i.id} label={`${i.productName} × ${i.orderedQty}`} value={inr(i.totalAmount)} />
        ))}
        <Line label="Order total" value={inr(ref.totalAmount)} />
        <Line label="Customer outstanding" value={inr(outstanding)} tone={limit && outstanding + ref.totalAmount > limit ? 'text-rose-600' : undefined} />
        <Line label="Credit limit" value={limit ? inr(limit) : 'No limit'} />
        <Line label="Delivery date" value={`${ref.requestedDeliveryDate}${ref.priority === 'URGENT' ? ' · URGENT' : ''}`} />
        <Line label="Source" value={ref.source} />
        <Line label="Address" value={ref.deliveryAddress || '—'} />
      </div>
    );
  }
  if (item.type === 'PAYMENT_VERIFICATION' && ref) {
    return (
      <div className="space-y-2">
        <Line label="Customer" value={ref.customerName} />
        <Line label="Amount" value={inr(ref.amount)} />
        <Line label="Mode" value={ref.mode} />
        <Line label="Payment date" value={ref.paymentDate} />
        {ref.transactionId && <Line label="Transaction ID" value={ref.transactionId} />}
        {ref.chequeNumber && <Line label="Cheque" value={`${ref.chequeNumber} · ${ref.chequeBank} · ${ref.chequeDate}`} />}
        <Line label="Entered by" value={ref.enteredBy} />
        {ref.notes && <Line label="Notes" value={ref.notes} />}
        <div className="grid grid-cols-3"><Photo url={ref.proofUrl} label="Proof" /></div>
      </div>
    );
  }
  if (item.type === 'CASH_SUBMISSION' && ref) {
    return (
      <div className="space-y-2">
        <Line label="Delivery boy" value={ref.deliveryBoyName} />
        <Line label="Handed to" value={ref.receiverName} />
        <Line label="Amount" value={inr(ref.amount)} />
        <Line label="Date" value={ref.date} />
        <div className="grid grid-cols-3"><Photo url={ref.proofUrl} label="Proof" /></div>
      </div>
    );
  }
  if (item.type === 'STOCK_TRANSFER' && ref) {
    return (
      <div className="space-y-2">
        <Line label="From" value={ref.fromName} />
        <Line label="To" value={ref.toName} />
        {((ref.items || []) as TransferLine[]).map((i) => (
          <Line key={i.id} label={i.productName} value={`${i.fullQty} full / ${i.emptyQty} empty`} />
        ))}
        {ref.notes && <Line label="Notes" value={ref.notes} />}
      </div>
    );
  }
  if (item.type === 'DEVICE_APPROVAL' && ref) {
    return (
      <div className="space-y-2">
        <Line label="User" value={`${ref.user?.name} (${ref.user?.mobile || '—'})`} />
        <Line label="Device" value={ref.label} />
        <Line label="Device ID" value={<span className="font-mono text-[10px]">{ref.deviceId}</span>} />
        <p className="text-[11px] text-slate-500">Approve only if this is the delivery boy&apos;s own company phone.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {item.summary && <p className="text-xs text-slate-700">{item.summary}</p>}
      {item.payload && (
        <pre className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto">{JSON.stringify(item.payload, null, 2)}</pre>
      )}
    </div>
  );
}
