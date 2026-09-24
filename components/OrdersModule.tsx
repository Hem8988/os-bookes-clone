'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Trash2, Truck, History, AlertTriangle } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { Badge, Button, Card, Empty, Field, inputClass, Modal, StatusBadge, cx, dateTime, today, useToast } from './ui';

interface OrderItem { id: string; productId: string; productName: string; orderedQty: number; unitPrice: number; totalAmount: number }
interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  source: string;
  status: string;
  priority: string;
  requestedDeliveryDate: string;
  deliveryAddress: string | null;
  area: string | null;
  assignedDeliveryBoyId: string | null;
  assignedDeliveryBoyName: string | null;
  isCreditOverLimit: boolean;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}
interface Customer { id: string; customerCode: string; name: string; phone: string; status: string; defaultProductIds: string[]; deliveryAddresses: { id: string; label: string; address: string; isDefault: boolean }[]; balance: number; creditLimit: number }
interface Product { id: string; name: string; salePrice: number }
interface Boy { id: string; name: string; mobile: string | null }

const GROUPS: Record<string, string[] | null> = {
  'Needs approval': ['PENDING_APPROVAL', 'WHATSAPP_RECEIVED'],
  'To assign': ['APPROVED'],
  'With delivery boy': ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'],
  'In verification': ['DELIVERED', 'PENDING_VERIFICATION', 'SENT_BACK'],
  Completed: ['VERIFIED', 'INVOICED', 'LEDGER_POSTED', 'COMPLETED'],
  'Rejected / cancelled': ['REJECTED', 'CANCELLED'],
  All: null,
};

export default function OrdersModule({ onOpenCustomer }: { onOpenCustomer?: (customerId: string) => void }) {
  const [group, setGroup] = useState('To assign');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [boys, setBoys] = useState<Boy[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string[] | null>(null);
  const [cancelFor, setCancelFor] = useState<Order | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      const statuses = GROUPS[group];
      if (statuses) qs.set('status', statuses.join(','));
      if (date) qs.set('date', date);
      if (search.trim()) qs.set('search', search.trim());
      setOrders(await api<Order[]>(`/api/cylinder/orders?${qs}`));
      setSelected(new Set());
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, date, search]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api<Boy[]>('/api/users/roles?role=DELIVERY_BOY').then(setBoys).catch(() => {});
  }, []);

  const assignable = (o: Order) => ['APPROVED', 'ASSIGNED', 'ACCEPTED'].includes(o.status);
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Orders</h2>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button tone="secondary" onClick={() => setAssignFor([...selected])}>
              <Truck className="h-4 w-4" /> Assign {selected.size} selected
            </Button>
          )}
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New order
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.keys(GROUPS).map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={cx('px-3 py-1.5 rounded-full text-[11px] font-bold border', group === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>
            {g}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order no, customer, phone" className={cx(inputClass, 'pl-9 w-64')} />
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cx(inputClass, 'w-44')} />
        {date && <Button tone="ghost" size="sm" onClick={() => setDate('')}>Clear date</Button>}
        <Button tone="secondary" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Card>
        {loading ? (
          <Empty>Loading…</Empty>
        ) : orders.length === 0 ? (
          <Empty>No orders in this view.</Empty>
        ) : (
          <div className="overflow-x-auto -m-4">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="p-3 w-8" />
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Deliver on</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Delivery boy</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="p-3">{assignable(o) && <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />}</td>
                    <td className="p-3">
                      <div className="font-mono font-black">{o.orderNumber}</div>
                      <div className="text-[10px] text-slate-400">{o.source.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="p-3">
                      <button onClick={() => onOpenCustomer?.(o.customerId)} className="font-bold text-slate-900 hover:text-emerald-700 text-left">{o.customerName}</button>
                      <div className="text-[10px] text-slate-400">{o.area || o.customerPhone}</div>
                    </td>
                    <td className="p-3">{o.items.map((i) => <div key={i.id}>{i.productName} × <strong>{i.orderedQty}</strong></div>)}</td>
                    <td className="p-3">
                      {o.requestedDeliveryDate}
                      {o.priority === 'URGENT' && <div><Badge tone="red">Urgent</Badge></div>}
                    </td>
                    <td className="p-3 space-y-1">
                      <StatusBadge status={o.status} />
                      {o.isCreditOverLimit && <div><Badge tone="amber">Credit limit</Badge></div>}
                    </td>
                    <td className="p-3">{o.assignedDeliveryBoyName || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3 text-right font-mono font-bold">{inr(o.totalAmount)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {assignable(o) && (
                          <Button size="sm" tone="secondary" onClick={() => setAssignFor([o.id])} title="Assign / reassign">
                            <Truck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" tone="ghost" onClick={() => setHistoryFor(o.id)} title="Timeline">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        {['PENDING_APPROVAL', 'WHATSAPP_RECEIVED', 'APPROVED', 'ASSIGNED', 'ACCEPTED'].includes(o.status) && (
                          <Button size="sm" tone="ghost" onClick={() => setCancelFor(o)} title="Cancel">
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AssignModal
        orderIds={assignFor}
        boys={boys}
        onClose={() => setAssignFor(null)}
        onDone={(msg) => {
          showToast(msg);
          setAssignFor(null);
          void load();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />
      <CancelModal
        order={cancelFor}
        onClose={() => setCancelFor(null)}
        onDone={() => {
          showToast('Order cancelled.');
          setCancelFor(null);
          void load();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />
      <OrderHistory orderId={historyFor} onClose={() => setHistoryFor(null)} />
      <NewOrderModal
        open={creating}
        boys={boys}
        onClose={() => setCreating(false)}
        onCreated={(msg) => {
          showToast(msg);
          setCreating(false);
          void load();
        }}
      />
    </div>
  );
}

function AssignModal({ orderIds, boys, onClose, onDone, onError }: { orderIds: string[] | null; boys: Boy[]; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [boyId, setBoyId] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!orderIds || !boyId) return;
    setBusy(true);
    try {
      if (orderIds.length === 1) await api(`/api/cylinder/orders/${orderIds[0]}`, { body: { action: 'assign', deliveryBoyId: boyId } });
      else await api('/api/cylinder/orders/assign', { body: { orderIds, deliveryBoyId: boyId } });
      onDone(`${orderIds.length} order(s) assigned.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!orderIds} title={`Assign ${orderIds?.length || 0} order(s)`} onClose={onClose} footer={<><Button tone="secondary" onClick={onClose}>Cancel</Button><Button busy={busy} disabled={!boyId} onClick={submit}>Assign</Button></>}>
      <Field label="Delivery boy">
        <select value={boyId} onChange={(e) => setBoyId(e.target.value)} className={inputClass}>
          <option value="">Select…</option>
          {boys.map((b) => (
            <option key={b.id} value={b.id}>{b.name}{b.mobile ? ` (${b.mobile})` : ''}</option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}

function CancelModal({ order, onClose, onDone, onError }: { order: Order | null; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await api(`/api/cylinder/orders/${order.id}`, { body: { action: 'cancel', reason } });
      setReason('');
      onDone();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!order} title={`Cancel ${order?.orderNumber}`} onClose={onClose} footer={<><Button tone="secondary" onClick={onClose}>Back</Button><Button tone="danger" busy={busy} disabled={!reason.trim()} onClick={submit}>Cancel order</Button></>}>
      <Field label="Reason (required)">
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
      </Field>
    </Modal>
  );
}

function OrderHistory({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const [data, setData] = useState<(Order & { statusLogs: { id: string; fromStatus: string | null; toStatus: string; actorName: string; note: string | null; createdAt: string }[]; deliveries: { id: string; deliveryNumber: string; status: string; sentBackReason: string | null }[] }) | null>(null);
  useEffect(() => {
    setData(null);
    if (orderId) api<typeof data>(`/api/cylinder/orders/${orderId}`).then(setData).catch(() => {});
  }, [orderId]);
  return (
    <Modal open={!!orderId} title={data ? `${data.orderNumber} · ${data.customerName}` : 'Order'} onClose={onClose} wide>
      {!data ? (
        <Empty>Loading…</Empty>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status={data.status} />
            <span>Deliver on {data.requestedDeliveryDate}</span>
            <span className="text-slate-400">·</span>
            <span>{data.deliveryAddress}</span>
          </div>
          {data.deliveries.map((d) => (
            <div key={d.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              Delivery <strong>{d.deliveryNumber}</strong> — <StatusBadge status={d.status} />
              {d.sentBackReason && <span className="text-rose-700"> · {d.sentBackReason}</span>}
            </div>
          ))}
          <ol className="relative border-l-2 border-emerald-200 ml-2 space-y-3">
            {data.statusLogs.map((log) => (
              <li key={log.id} className="ml-4">
                <div className="absolute -left-[7px] h-3 w-3 rounded-full bg-emerald-500" />
                <div className="font-bold text-slate-900">{log.toStatus.replace(/_/g, ' ')}</div>
                <div className="text-slate-500">{log.actorName} · {dateTime(log.createdAt)}{log.note ? ` — ${log.note}` : ''}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
}

function NewOrderModal({ open, boys, onClose, onCreated }: { open: boolean; boys: Boy[]; onClose: () => void; onCreated: (m: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<{ productId: string; qty: string }[]>([{ productId: '', qty: '' }]);
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [addressId, setAddressId] = useState('');
  const [boyId, setBoyId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api<Customer[]>('/api/customers?status=ACTIVE').then(setCustomers).catch(() => {});
    api<Product[]>('/api/products').then(setProducts).catch(() => {});
  }, [open]);

  const customer = customers.find((c) => c.id === customerId);
  const matches = useMemo(() => {
    const q = query.toLowerCase();
    return q ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.customerCode.toLowerCase().includes(q)).slice(0, 8) : [];
  }, [customers, query]);

  const pickCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setQuery('');
    setAddressId(c.deliveryAddresses.find((a) => a.isDefault)?.id || '');
    const defaults = c.defaultProductIds.filter((id) => products.some((p) => p.id === id));
    setLines(defaults.length ? defaults.map((id) => ({ productId: id, qty: '' })) : [{ productId: '', qty: '' }]);
  };

  const estimate = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (products.find((p) => p.id === l.productId)?.salePrice || 0), 0);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/cylinder/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items: lines.filter((l) => l.productId && Number(l.qty) > 0).map((l) => ({ productId: l.productId, qty: Number(l.qty) })),
          requestedDeliveryDate: deliveryDate,
          priority,
          deliveryAddressId: addressId || null,
          assignedDeliveryBoyId: boyId || null,
          notes,
          source: 'ADMIN',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCustomerId('');
      setLines([{ productId: '', qty: '' }]);
      setNotes('');
      onCreated(json.message || 'Order created.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="New order" onClose={onClose} wide footer={<><Button tone="secondary" onClick={onClose}>Cancel</Button><Button busy={busy} disabled={!customerId} onClick={submit}>Create order</Button></>}>
      {!customer ? (
        <Field label="Customer">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, mobile or code" className={inputClass} />
          <div className="mt-1 space-y-1">
            {matches.map((c) => (
              <button key={c.id} onClick={() => pickCustomer(c)} className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-emerald-500 text-xs">
                <strong>{c.name}</strong> · {c.phone} <span className="text-slate-400">{c.customerCode}</span>
              </button>
            ))}
          </div>
        </Field>
      ) : (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
          <div>
            <div className="font-black">{customer.name}</div>
            <div className="text-slate-500">Outstanding {inr(customer.balance)}{customer.creditLimit ? ` / limit ${inr(customer.creditLimit)}` : ''}</div>
          </div>
          <Button tone="ghost" size="sm" onClick={() => setCustomerId('')}>Change</Button>
        </div>
      )}
      {customer && customer.creditLimit > 0 && customer.balance + estimate > customer.creditLimit && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold flex gap-2">
          <AlertTriangle className="h-4 w-4" /> This order will exceed the credit limit and needs a credit override approval.
        </div>
      )}
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2">
            <select value={line.productId} onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, productId: e.target.value } : l)))} className={cx(inputClass, 'col-span-8')}>
              <option value="">Product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input type="number" min={1} value={line.qty} onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l)))} placeholder="Qty" className={cx(inputClass, 'col-span-3')} />
            <button onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="col-span-1 text-rose-500" disabled={lines.length === 1}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button tone="ghost" size="sm" onClick={() => setLines([...lines, { productId: '', qty: '' }])}>
          <Plus className="h-3.5 w-3.5" /> Add product
        </Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Delivery date">
          <input type="date" min={today()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as 'NORMAL' | 'URGENT')} className={inputClass}>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
          </select>
        </Field>
        <Field label="Delivery boy" hint="Empty = customer's default">
          <select value={boyId} onChange={(e) => setBoyId(e.target.value)} className={inputClass}>
            <option value="">Default</option>
            {boys.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
      </div>
      {customer && customer.deliveryAddresses.length > 1 && (
        <Field label="Delivery address">
          <select value={addressId} onChange={(e) => setAddressId(e.target.value)} className={inputClass}>
            {customer.deliveryAddresses.map((a) => (
              <option key={a.id} value={a.id}>{a.label}: {a.address}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Notes">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>
      <div className="text-right text-xs text-slate-500">Estimate at standard rates: <strong className="text-slate-900">{inr(estimate)}</strong> (customer rates apply on save)</div>
      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{error}</div>}
    </Modal>
  );
}
