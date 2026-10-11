'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Pencil, Plus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useSession } from '../lib/auth';
import { useApiData } from '../lib/useApiData';
import { CustomerPo, CustomerPoForm, PO_STATUS_LABEL } from './CustomerPoForm';
import { Badge, Button, Card, Empty, Paged, PartyName, cx, inputClass, Modal, StatusBadge, useToast } from './ui';

// Customers → Customer POs: purchase orders received from customers (office
// entry or uploaded from the customer portal), with what is still to supply.

const FILTERS: { key: string; label: string; status: string | null }[] = [
  { key: 'all', label: 'All', status: null },
  { key: 'received', label: 'To check', status: 'RECEIVED' },
  { key: 'open', label: 'Open', status: 'OPEN' },
  { key: 'fulfilled', label: 'Fulfilled', status: 'FULFILLED' },
  { key: 'cancelled', label: 'Cancelled', status: 'CANCELLED' },
];

const TONE: Record<string, 'amber' | 'blue' | 'violet' | 'green' | 'red' | 'slate'> = { RECEIVED: 'amber', OPEN: 'blue', PARTIAL: 'violet', FULFILLED: 'green', EXPIRED: 'red', CANCELLED: 'slate' };
export const PoStatusBadge = ({ status }: { status: string }) => <Badge tone={TONE[status] || 'slate'}>{PO_STATUS_LABEL[status] || status}</Badge>;

const progress = (po: CustomerPo) => {
  const qty = po.items.reduce((s, i) => s + i.qty, 0);
  const done = po.items.reduce((s, i) => s + Math.min(i.deliveredQty, i.qty), 0);
  return { qty, done, pct: qty ? Math.round((done / qty) * 100) : 0 };
};

export default function CustomerPoModule() {
  const { can } = useSession();
  const canManage = can('orders.create');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CustomerPo | 'new' | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const status = FILTERS.find((f) => f.key === filter)?.status;
  const params = new URLSearchParams({ ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
  const list = useApiData<CustomerPo[]>(`/api/customer-pos?${params}`, (m) => showToast(m, 'error'));
  const rows = list.data ?? [];
  const toCheck = rows.filter((r) => r.status === 'RECEIVED').length;

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Customer POs</h2>
          <p className="text-xs text-slate-500">Purchase orders from customers. Orders placed against a PO count it down on delivery.</p>
        </div>
        <div className="flex gap-2">
          <Button tone="ghost" onClick={() => void list.reload()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New PO</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', filter === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {f.label}
            {f.key === 'received' && filter === 'all' && toCheck > 0 && <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[10px] text-slate-900">{toCheck}</span>}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PO number or customer" className={cx(inputClass, 'pl-9')} />
        </div>
      </div>

      <Card>
        {list.data === undefined ? (
          <Empty>Loading…</Empty>
        ) : rows.length === 0 ? (
          <Empty>No customer POs{status ? ' in this list' : ' yet'}.</Empty>
        ) : (
          <Paged rows={rows}>{(pageRows) => (
          <div className="divide-y divide-slate-100 -my-2">
            {pageRows.map((po) => {
              const p = progress(po);
              return (
                <button key={po.id} onClick={() => setViewId(po.id)} className="w-full text-left py-3 flex flex-wrap sm:flex-nowrap items-center gap-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-mono text-sm">{po.poNumber}</strong>
                      <PoStatusBadge status={po.status} />
                      {po.source === 'CUSTOMER_PORTAL' && <Badge tone="slate">From portal</Badge>}
                      {po.fileUrl && <FileText className="h-3.5 w-3.5 text-slate-400" aria-label="PO copy attached" />}
                      {!!po.warnings?.length && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label={po.warnings.join(' ')} />}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {po.customer && <PartyName short={po.customer.shortName} legal={po.customer.name} />} · {po.poDate}
                      {po.validTill && <span className="text-slate-400"> · valid till {po.validTill}</span>}
                    </div>
                  </div>
                  {po.items.length > 0 && (
                    <div className="w-32 shrink-0">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>{p.done} / {p.qty}</span><span>{p.pct}%</span></div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${p.pct}%` }} /></div>
                    </div>
                  )}
                  <div className="w-24 shrink-0 text-right text-xs font-mono font-bold">{po.totalAmount ? inr(po.totalAmount) : '—'}</div>
                </button>
              );
            })}
          </div>
          )}</Paged>
        )}
      </Card>

      {editing && (
        <CustomerPoForm
          po={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            showToast(m);
            setEditing(null);
            void list.reload();
          }}
        />
      )}
      {viewId && (
        <PoView
          id={viewId}
          canManage={canManage}
          onClose={() => setViewId(null)}
          onEdit={(po) => {
            setViewId(null);
            setEditing(po);
          }}
          onChanged={(m, close) => {
            showToast(m);
            if (close) setViewId(null);
            void list.reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}
    </div>
  );
}

function PoView({ id, canManage, onClose, onEdit, onChanged, onError }: { id: string; canManage: boolean; onClose: () => void; onEdit: (po: CustomerPo) => void; onChanged: (message: string, close?: boolean) => void; onError: (m: string) => void }) {
  const q = useApiData<CustomerPo>(`/api/customer-pos/${id}`, onError);
  const po = q.data;
  const [busy, setBusy] = useState('');

  const act = async (action: 'accept' | 'cancel' | 'reopen' | 'delete') => {
    let reason: string | null = null;
    if (action === 'cancel') {
      reason = window.prompt('Reason for cancelling this PO?');
      if (reason === null) return;
    }
    if (action === 'delete' && !window.confirm(`Delete PO ${po?.poNumber}? This cannot be undone.`)) return;
    setBusy(action);
    try {
      if (action === 'delete') {
        await api(`/api/customer-pos/${id}`, { method: 'DELETE' });
        onChanged(`PO ${po?.poNumber} deleted.`, true);
      } else {
        await api(`/api/customer-pos/${id}`, { method: 'PATCH', body: { action, reason } });
        onChanged(`PO ${po?.poNumber} ${action === 'accept' ? 'accepted' : action === 'cancel' ? 'cancelled' : 'reopened'}.`);
        await q.reload();
      }
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <Modal
      open
      wide
      title={po ? `PO ${po.poNumber}` : 'PO'}
      onClose={onClose}
      footer={
        po && canManage ? (
          <div className="flex flex-wrap justify-end gap-2 w-full">
            {!po.orders?.length && <Button tone="ghost" busy={busy === 'delete'} onClick={() => act('delete')} className="mr-auto text-rose-600"><Trash2 className="h-4 w-4" /> Delete</Button>}
            {po.status !== 'CANCELLED' && po.status !== 'FULFILLED' && <Button tone="secondary" busy={busy === 'cancel'} onClick={() => act('cancel')}><XCircle className="h-4 w-4" /> Cancel PO</Button>}
            {(po.status === 'CANCELLED' || po.status === 'FULFILLED') && <Button tone="secondary" busy={busy === 'reopen'} onClick={() => act('reopen')}>Reopen</Button>}
            {po.status !== 'CANCELLED' && <Button tone="secondary" onClick={() => onEdit(po)}><Pencil className="h-4 w-4" /> Edit</Button>}
            {po.status === 'RECEIVED' && <Button busy={busy === 'accept'} onClick={() => act('accept')}><CheckCircle2 className="h-4 w-4" /> Accept PO</Button>}
          </div>
        ) : undefined
      }
    >
      {!po ? (
        <Empty>Loading…</Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-xs space-y-0.5">
              {po.customer && <div className="text-sm font-black text-slate-900"><PartyName short={po.customer.shortName} legal={po.customer.name} /></div>}
              <div className="text-slate-500">PO date {po.poDate}{po.validTill ? ` · valid till ${po.validTill}` : ''}{po.deliveryDate ? ` · deliver on ${po.deliveryDate}` : ''}</div>
              <div className="text-slate-500">{po.source === 'CUSTOMER_PORTAL' ? 'Uploaded by the customer' : `Entered by ${po.createdBy}`}</div>
            </div>
            <PoStatusBadge status={po.status} />
          </div>
          {!!po.warnings?.length && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800 space-y-0.5">
              {po.warnings.map((w) => (
                <div key={w} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />{w}</div>
              ))}
            </div>
          )}
          {(po.vendorCode || po.refNumber || po.paymentTerms || po.poTotal) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {po.vendorCode && <div><span className="text-slate-500">Our vendor code:</span> <strong>{po.vendorCode}</strong></div>}
              {po.refNumber && <div><span className="text-slate-500">Quotation / indent:</span> <strong>{po.refNumber}</strong></div>}
              {po.paymentTerms && <div><span className="text-slate-500">Payment terms:</span> <strong>{po.paymentTerms}</strong></div>}
              {!!po.poTotal && <div><span className="text-slate-500">PO total:</span> <strong className="font-mono">{inr(po.poTotal)}</strong> <span className="text-slate-400">(items {inr(po.totalAmount)})</span></div>}
            </div>
          )}
          {po.status === 'RECEIVED' && <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800">The customer uploaded this PO. Check the copy and items, then accept it so orders can be placed against it.</p>}
          {po.fileUrl && (
            <a href={po.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
              <FileText className="h-4 w-4" /> Open PO copy
            </a>
          )}
          {po.items.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr><th className="py-1.5">Product</th><th className="py-1.5 text-right">PO qty</th><th className="py-1.5 text-right">Delivered</th><th className="py-1.5 text-right">Pending</th><th className="py-1.5 text-right">Basic rate</th></tr>
              </thead>
              <tbody>
                {po.items.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="py-1.5 font-semibold">
                      {i.productName}
                      {i.itemCode && <div className="font-normal text-slate-500">Code {i.itemCode}</div>}
                    </td>
                    <td className="py-1.5 text-right">{i.qty}</td>
                    <td className="py-1.5 text-right">{i.deliveredQty}</td>
                    <td className={cx('py-1.5 text-right font-bold', (i.pendingQty ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700')}>{i.pendingQty}</td>
                    <td className="py-1.5 text-right font-mono">{i.rate ? inr(i.rate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-500">No items listed — this PO only carries its number and copy.</p>
          )}
          {po.notes && <p className="text-xs text-slate-600"><strong>Notes:</strong> {po.notes}</p>}
          <div>
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Orders against this PO</div>
            {po.orders?.length ? (
              po.orders.map((o) => (
                <div key={o.id} className="flex justify-between items-center text-xs py-1.5 border-t border-slate-100">
                  <span><strong className="font-mono">{o.orderNumber}</strong> · {o.requestedDeliveryDate}</span>
                  <span className="flex items-center gap-2"><span className="font-mono">{inr(o.totalAmount)}</span><StatusBadge status={o.status} /></span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">None yet. Pick this PO under “More options” when creating an order.</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
