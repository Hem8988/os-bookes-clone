'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Trash2, Truck, History, AlertTriangle, ChevronRight, Eye, Pencil, Phone } from 'lucide-react';
import { cue } from '../lib/feedback';
import { ChoiceTiles, PosButton, PosTotal, RecentChips, useRecent } from './pos';
import { OrderTiles, useOrderCart } from './OrderCart';
import { api, errorMessage, inr } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Badge, Button, Card, Empty, Field, inputClass, Modal, PartyName, StatusBadge, cx, dateTime, partyLabel, today, useToast } from './ui';

interface OrderItem { id: string; productId: string; productName: string; orderedQty: number; unitPrice: number; totalAmount: number }
interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerShortName: string | null;
  customerPhone: string;
  source: string;
  status: string;
  priority: string;
  requestedDeliveryDate: string;
  deliveryAddress: string | null;
  area: string | null;
  assignedDeliveryBoyId: string | null;
  assignedDeliveryBoyName: string | null;
  deliveryBoyMobile?: string | null;
  vehicleNumber?: string | null;
  deliveryAddressId?: string | null;
  notes?: string | null;
  createdBy?: string;
  isCreditOverLimit: boolean;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}
interface Customer { id: string; customerCode: string; name: string; shortName?: string | null; phone: string; status: string; defaultProductIds: string[]; defaultDeliveryBoyId?: string | null; deliveryAddresses: { id: string; label: string; address: string; isDefault: boolean; contactPerson?: string | null }[]; balance: number; creditLimit: number }
interface Product { id: string; name: string; salePrice: number }
interface Boy { id: string; name: string; mobile: string | null }
interface Vehicle { id: string; number: string; type: string; driverUserId: string | null; driverName: string | null }

// 'All' first and selected when the screen opens.
const GROUPS: Record<string, string[] | null> = {
  All: null,
  'Needs approval': ['PENDING_APPROVAL', 'WHATSAPP_RECEIVED'],
  'To assign': ['APPROVED'],
  'With delivery boy': ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'],
  'In verification': ['DELIVERED', 'PENDING_VERIFICATION', 'SENT_BACK'],
  Completed: ['VERIFIED', 'INVOICED', 'LEDGER_POSTED', 'COMPLETED'],
  'Rejected / cancelled': ['REJECTED', 'CANCELLED'],
};

export default function OrdersModule({ onOpenCustomer }: { onOpenCustomer?: (customerId: string) => void }) {
  const [group, setGroup] = useState('All');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [boys, setBoys] = useState<Boy[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string[] | null>(null);
  const [cancelFor, setCancelFor] = useState<Order | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
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
    api<Vehicle[]>('/api/cylinder/orders/vehicles').then(setVehicles).catch(() => {});
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
          <Button className="hidden md:inline-flex" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New order
          </Button>
        </div>
      </div>

      {/* Status chips: one swipeable row on phones. */}
      <div className="flex gap-2 overflow-x-auto -mx-3 px-3 pb-1 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
        {Object.keys(GROUPS).map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={cx('shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border', group === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>
            {g}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[180px] md:flex-none">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order no, customer, phone" className={cx(inputClass, 'pl-9 md:w-64')} />
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cx(inputClass, 'w-40 md:w-44')} />
        {date && <Button tone="ghost" size="sm" onClick={() => setDate('')}>Clear date</Button>}
        <Button tone="secondary" size="sm" className="py-2.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Phones: one card per order. */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : orders.length === 0 ? (
          <Empty>No orders in this view.</Empty>
        ) : (
          orders.map((o) => (
            <div key={o.id} className={cx('rounded-2xl bg-white border p-3 space-y-2', selected.has(o.id) ? 'border-emerald-500' : 'border-slate-200')}>
              <div className="flex items-start gap-2">
                {assignable(o) && <input type="checkbox" className="mt-1 h-4 w-4" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />}
                <button onClick={() => onOpenCustomer?.(o.customerId)} className="flex-1 min-w-0 text-left">
                  <PartyName short={o.customerShortName} legal={o.customerName} className="text-sm" />
                  <div className="text-[11px] text-slate-500">{o.area || o.customerPhone}</div>
                </button>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black font-mono">{inr(o.totalAmount)}</div>
                  <div className="text-[10px] font-mono text-slate-400">{o.orderNumber}</div>
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-700">{o.items.map((i) => `${i.productName} × ${i.orderedQty}`).join(' · ')}</div>
              <div className="flex flex-wrap items-center gap-1">
                <StatusBadge status={o.status} />
                {o.priority === 'URGENT' && <Badge tone="red">Urgent</Badge>}
                {o.isCreditOverLimit && <Badge tone="amber">Credit limit</Badge>}
                <span className="text-[11px] text-slate-500">· {o.requestedDeliveryDate} · {o.assignedDeliveryBoyName || 'No boy'}</span>
              </div>
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                {assignable(o) && (
                  <button onClick={() => setAssignFor([o.id])} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-100 text-xs font-black text-slate-700">
                    <Truck className="h-3.5 w-3.5" /> Assign
                  </button>
                )}
                <button onClick={() => setHistoryFor(o.id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-100 text-xs font-black text-slate-700">
                  <History className="h-3.5 w-3.5" /> Timeline
                </button>
                {['PENDING_APPROVAL', 'WHATSAPP_RECEIVED', 'APPROVED', 'ASSIGNED', 'ACCEPTED'].includes(o.status) && (
                  <button onClick={() => setCancelFor(o)} className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-xs font-black text-rose-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Phones: floating New order button above the tab bar. */}
      <button onClick={() => setCreating(true)} className="md:hidden fixed right-4 bottom-20 z-30 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-300 flex items-center justify-center active:scale-95" aria-label="New order">
        <Plus className="h-7 w-7" />
      </button>

      <Card className="hidden md:block">
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
                      <button onClick={() => onOpenCustomer?.(o.customerId)} className="text-slate-900 hover:text-emerald-700 text-left"><PartyName short={o.customerShortName} legal={o.customerName} /></button>
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
                    <td className="p-3">
                      {o.assignedDeliveryBoyName ? (
                        <div>
                          <div className="font-bold text-slate-800">{o.assignedDeliveryBoyName}</div>
                          {o.deliveryBoyMobile && <a href={`tel:${o.deliveryBoyMobile}`} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-700"><Phone className="h-3 w-3" />{o.deliveryBoyMobile}</a>}
                          {o.vehicleNumber && <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold font-mono text-sky-800"><Truck className="h-3 w-3" />{o.vehicleNumber}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">{inr(o.totalAmount)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {assignable(o) && (
                          <Button size="sm" tone="secondary" onClick={() => setAssignFor([o.id])} title="Assign / reassign">
                            <Truck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" tone="ghost" onClick={() => setViewing(o)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {EDITABLE.includes(o.status) && (
                          <Button size="sm" tone="ghost" onClick={() => setEditing(o)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
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
        vehicles={vehicles}
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
      {viewing && <OrderView order={viewing} onClose={() => setViewing(null)} onEdit={EDITABLE.includes(viewing.status) ? () => { setEditing(viewing); setViewing(null); } : undefined} onTimeline={() => { setHistoryFor(viewing.id); setViewing(null); }} />}
      {editing && (
        <EditOrderModal
          order={editing}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            showToast(msg);
            setEditing(null);
            void load();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
      <NewOrderModal
        open={creating}
        boys={boys}
        vehicles={vehicles}
        onClose={() => setCreating(false)}
        onCreated={(msg, keepOpen) => {
          showToast(msg);
          if (!keepOpen) setCreating(false);
          void load();
        }}
      />
    </div>
  );
}

/** The vehicle given to this delivery boy in Masters → Vehicles / trucks. */
const boyVehicle = (vehicles: Vehicle[], boy?: Boy) =>
  boy ? vehicles.find((v) => v.driverUserId === boy.id)?.number || vehicles.find((v) => v.driverName && v.driverName.trim().toLowerCase() === boy.name.trim().toLowerCase())?.number || '' : '';

/** Vehicle for the trip: pick one of ours or type a hired one. Printed on the invoice. */
function VehicleField({ value, onChange, vehicles, boys }: { value: string; onChange: (v: string) => void; vehicles: Vehicle[]; boys: Boy[] }) {
  return (
    <Field label="Vehicle no." hint="Auto-filled with the delivery boy's vehicle — change if he goes in another one">
      <input list="order-vehicles" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder="e.g. DL01AB1234" className={cx(inputClass, 'font-mono')} />
      <datalist id="order-vehicles">
        {vehicles.map((v) => (
          <option key={v.id} value={v.number}>{[v.type, boys.find((b) => b.id === v.driverUserId)?.name || v.driverName].filter(Boolean).join(' · ')}</option>
        ))}
      </datalist>
    </Field>
  );
}

function AssignModal({ orderIds, boys, vehicles, onClose, onDone, onError }: { orderIds: string[] | null; boys: Boy[]; vehicles: Vehicle[]; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [boyId, setBoyId] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [busy, setBusy] = useState(false);
  const pickBoy = (id: string) => {
    setBoyId(id);
    setVehicle(boyVehicle(vehicles, boys.find((b) => b.id === id)));
  };
  const submit = async () => {
    if (!orderIds || !boyId) return;
    setBusy(true);
    try {
      const vehicleNumber = vehicle.trim() || null;
      if (orderIds.length === 1) await api(`/api/cylinder/orders/${orderIds[0]}`, { body: { action: 'assign', deliveryBoyId: boyId, vehicleNumber } });
      else await api('/api/cylinder/orders/assign', { body: { orderIds, deliveryBoyId: boyId, vehicleNumber } });
      onDone(`${orderIds.length} order(s) assigned.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!orderIds} title={`Assign ${orderIds?.length || 0} order(s)`} onClose={onClose} footer={<><Button tone="secondary" onClick={onClose}>Cancel</Button><Button busy={busy} disabled={!boyId} onClick={submit}>Assign</Button></>}>
      <div className="space-y-3">
        <Field label="Delivery boy">
          <select value={boyId} onChange={(e) => pickBoy(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {boys.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.mobile ? ` (${b.mobile})` : ''}</option>
            ))}
          </select>
        </Field>
        <VehicleField value={vehicle} onChange={setVehicle} vehicles={vehicles} boys={boys} />
      </div>
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
  type Detail = (Order & { statusLogs: { id: string; fromStatus: string | null; toStatus: string; actorName: string; note: string | null; createdAt: string }[]; deliveries: { id: string; deliveryNumber: string; status: string; sentBackReason: string | null }[] });
  const data = useApiData<Detail>(orderId ? `/api/cylinder/orders/${orderId}` : null).data ?? null;
  return (
    <Modal open={!!orderId} title={data ? `${data.orderNumber} · ${partyLabel(data.customerShortName, data.customerName)}` : 'Order'} onClose={onClose} wide>
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

function NewOrderModal({ open, boys, vehicles, onClose, onCreated }: { open: boolean; boys: Boy[]; vehicles: Vehicle[]; onClose: () => void; onCreated: (m: string, keepOpen: boolean) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [query, setQuery] = useState('');
  const [recent, pushRecent] = useRecent('admin-order-customers');
  const [more, setMore] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [addressId, setAddressId] = useState('');
  const [boyId, setBoyIdRaw] = useState('');
  const [vehicle, setVehicle] = useState('');
  // Picking a delivery boy fills in his vehicle.
  const setBoyId = (id: string) => {
    setBoyIdRaw(id);
    setVehicle(boyVehicle(vehicles, boys.find((b) => b.id === id)));
  };
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api<Customer[]>('/api/customers?status=ACTIVE').then(setCustomers).catch(() => {});
    api<Product[]>('/api/products').then(setProducts).catch(() => {});
  }, [open]);

  const customer = customers.find((c) => c.id === customerId);
  const cart = useOrderCart(products, customer?.id ?? null, customer?.defaultProductIds ?? []);
  const matches = useMemo(() => {
    const q = query.toLowerCase();
    return q ? customers.filter((c) => c.name.toLowerCase().includes(q) || (c.shortName || '').toLowerCase().includes(q) || c.phone.includes(q) || c.customerCode.toLowerCase().includes(q)).slice(0, 8) : [];
  }, [customers, query]);

  const pickCustomer = (c: Customer) => {
    cue('tap');
    setCustomerId(c.id);
    setQuery('');
    setError('');
    const address = c.deliveryAddresses.find((a) => a.isDefault) || c.deliveryAddresses[0];
    setAddressId(address?.id || '');
    // The customer's delivery boy: the one set on the customer, else the delivery contact person if he is one of the boys.
    const contact = (address?.contactPerson || '').trim().toLowerCase();
    setBoyId((c.defaultDeliveryBoyId && boys.some((b) => b.id === c.defaultDeliveryBoyId) ? c.defaultDeliveryBoyId : boys.find((b) => contact && b.name.trim().toLowerCase() === contact)?.id) || '');
    pushRecent({ id: c.id, label: partyLabel(c.shortName, c.name), sub: c.phone });
  };

  const submit = async (keepOpen: boolean) => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/cylinder/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items: cart.items,
          requestedDeliveryDate: deliveryDate,
          priority,
          deliveryAddressId: addressId || null,
          assignedDeliveryBoyId: boyId || null,
          vehicleNumber: vehicle.trim() || null,
          notes,
          source: 'ADMIN',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      cue('success');
      setCustomerId('');
      setNotes('');
      setPriority('NORMAL');
      setBoyId('');
      setMore(false);
      onCreated(json.message || 'Order created.', keepOpen);
    } catch (e) {
      cue('error');
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const overLimit = !!customer && customer.creditLimit > 0 && customer.balance + cart.estimate > customer.creditLimit;
  return (
    <Modal
      open={open}
      title="New order"
      onClose={onClose}
      wide
      footer={
        customer ? (
          <PosTotal
            lines={
              <>
                <div className="text-base font-bold text-slate-900">{cart.count} cylinder{cart.count === 1 ? '' : 's'} · {inr(cart.estimate)}</div>
                <button type="button" disabled={busy || !cart.items.length} onClick={() => submit(true)} className="text-[11px] font-black text-emerald-700 disabled:opacity-40">
                  Create &amp; next order
                </button>
              </>
            }
            action={
              <PosButton busy={busy} disabled={!cart.items.length} onClick={() => submit(false)}>
                Create order
              </PosButton>
            }
          />
        ) : (
          <Button tone="secondary" onClick={onClose}>Cancel</Button>
        )
      }
    >
      {!customer ? (
        <div className="space-y-3">
          <RecentChips
            title="Recent customers"
            items={recent.filter((r) => customers.some((c) => c.id === r.id))}
            onPick={(r) => {
              const c = customers.find((x) => x.id === r.id);
              if (c) pickCustomer(c);
            }}
          />
          <Field label="Customer">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, mobile or code" className={cx(inputClass, 'py-3 text-base')} />
            <div className="mt-1 grid sm:grid-cols-2 gap-1.5">
              {matches.map((c) => (
                <button key={c.id} onClick={() => pickCustomer(c)} className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs">
                  <strong className="text-sm">{partyLabel(c.shortName, c.name)}</strong>
                  {c.shortName && <span className="text-slate-400"> ({c.name})</span>}
                  <div className="text-slate-500">{c.phone} · {c.customerCode}</div>
                </button>
              ))}
            </div>
          </Field>
        </div>
      ) : (
        <>
          <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center text-xs">
            <div className="min-w-0">
              <div className="text-sm font-black truncate">{partyLabel(customer.shortName, customer.name)}</div>
              <div className="opacity-70">{customer.phone} · Outstanding {inr(customer.balance)}{customer.creditLimit ? ` / limit ${inr(customer.creditLimit)}` : ''}</div>
            </div>
            <button type="button" onClick={() => setCustomerId('')} className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 font-black">Change</button>
          </div>
          {overLimit && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold flex gap-2">
              <AlertTriangle className="h-4 w-4" /> This order will exceed the credit limit and needs a credit override approval.
            </div>
          )}
          {cart.assignedOff && <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800">The cylinder assigned to this customer is inactive. Switch it on in Masters → Products, or tick an active cylinder in the customer’s “Authorized / Assigned Products”.</p>}
          <OrderTiles cart={cart} cols={3} />
          <button type="button" onClick={() => setMore(!more)} className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
            <span>
              More options{' '}
              <span className="font-semibold text-slate-500">
                · {deliveryDate === today() ? 'Today' : deliveryDate} · {priority === 'URGENT' ? 'Urgent' : 'Normal'} · {boys.find((b) => b.id === boyId)?.name || "Customer's delivery boy"}{vehicle ? ` · ${vehicle}` : ''}
              </span>
            </span>
            <ChevronRight className={cx('h-4 w-4 transition', more && 'rotate-90')} />
          </button>
          {more && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Delivery date">
                  <input type="date" min={today()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Priority">
                  <ChoiceTiles value={priority} onChange={setPriority} options={[{ value: 'NORMAL', label: 'Normal' }, { value: 'URGENT', label: 'Urgent', tone: 'rose' }]} />
                </Field>
                <Field label="Delivery boy" hint={boyId ? "Customer's delivery boy — change if needed" : 'Default = route / area delivery boy'}>
                  <select value={boyId} onChange={(e) => setBoyId(e.target.value)} className={inputClass}>
                    <option value="">Default</option>
                    {boys.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <VehicleField value={vehicle} onChange={setVehicle} vehicles={vehicles} boys={boys} />
              {customer.deliveryAddresses.length > 1 && (
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
            </div>
          )}
          <div className="text-right text-[11px] text-slate-500">Estimate at standard rates — customer rates apply on save.</div>
        </>
      )}
      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{error}</div>}
    </Modal>
  );
}

/** Orders that can still be changed (nothing has gone out for delivery yet). */
const EDITABLE = ['WHATSAPP_RECEIVED', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'ACCEPTED'];

function OrderView({ order: o, onClose, onEdit, onTimeline }: { order: Order; onClose: () => void; onEdit?: () => void; onTimeline: () => void }) {
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
  return (
    <Modal open title={`Order ${o.orderNumber}`} onClose={onClose} footer={<><Button tone="secondary" onClick={onTimeline}><History className="h-4 w-4" /> Timeline</Button>{onEdit && <Button onClick={onEdit}><Pencil className="h-4 w-4" /> Edit</Button>}</>}>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={o.status} />
        {o.priority === 'URGENT' && <Badge tone="red">Urgent</Badge>}
      </div>
      <div>
        {row('Customer', <PartyName short={o.customerShortName} legal={o.customerName} />)}
        {row('Phone', o.customerPhone)}
        {row('Deliver to', o.deliveryAddress || '—')}
        {o.area && row('Area', o.area)}
        {row('Deliver on', o.requestedDeliveryDate)}
        {row('Delivery boy', o.assignedDeliveryBoyName ? `${o.assignedDeliveryBoyName}${o.deliveryBoyMobile ? ` · ${o.deliveryBoyMobile}` : ''}` : 'Not assigned')}
        {row('Vehicle', o.vehicleNumber || '—')}
        {row('Source', `${o.source.replace(/_/g, ' ').toLowerCase()}${o.createdBy ? ` · by ${o.createdBy}` : ''}`)}
        {row('Created', dateTime(o.createdAt))}
        {o.notes && row('Notes', o.notes)}
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2 text-left">Cylinder</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th></tr></thead>
          <tbody>
            {o.items.map((i) => <tr key={i.id} className="border-t border-slate-100"><td className="p-2">{i.productName}</td><td className="p-2 text-right font-bold">{i.orderedQty}</td><td className="p-2 text-right font-mono">{inr(i.unitPrice)}</td><td className="p-2 text-right font-mono">{inr(i.totalAmount)}</td></tr>)}
            <tr className="border-t-2 border-slate-200 font-black"><td className="p-2" colSpan={3}>Total</td><td className="p-2 text-right font-mono">{inr(o.totalAmount)}</td></tr>
          </tbody>
        </table>
      </div>
      {o.isCreditOverLimit && <p className="text-xs font-semibold text-amber-700">Credit limit exceeded for this customer.</p>}
    </Modal>
  );
}

function EditOrderModal({ order, onClose, onDone, onError }: { order: Order; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const products = useApiData<Product[]>('/api/products', onError).data ?? [];
  const customers = useApiData<Customer[]>(`/api/customers?search=${encodeURIComponent(order.customerPhone)}`, onError).data ?? [];
  const customer = customers.find((c) => c.id === order.customerId);
  const [lines, setLines] = useState(order.items.map((i) => ({ productId: i.productId, qty: String(i.orderedQty) })));
  const [date, setDate] = useState(order.requestedDeliveryDate);
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>(order.priority === 'URGENT' ? 'URGENT' : 'NORMAL');
  const [addressId, setAddressId] = useState(order.deliveryAddressId || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [busy, setBusy] = useState(false);
  // Same rule as a new order: the customer's assigned cylinders (plus whatever is already on the order).
  const assigned = customer?.defaultProductIds ?? [];
  const choices = assigned.length ? products.filter((p) => assigned.includes(p.id) || lines.some((l) => l.productId === p.id)) : products;
  const items = lines.filter((l) => l.productId && Number(l.qty) > 0).map((l) => ({ productId: l.productId, qty: Number(l.qty) }));
  const estimate = items.reduce((sum, l) => sum + l.qty * (products.find((p) => p.id === l.productId)?.salePrice || 0), 0);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/cylinder/orders/${order.id}`, { body: { action: 'edit', items, requestedDeliveryDate: date, priority, deliveryAddressId: addressId || null, notes } });
      onDone(`Order ${order.orderNumber} updated.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open wide title={`Edit ${order.orderNumber} · ${partyLabel(order.customerShortName, order.customerName)}`} onClose={onClose} footer={<><Button tone="secondary" onClick={onClose}>Cancel</Button><Button busy={busy} disabled={!items.length} onClick={save}>Save changes</Button></>}>
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2">
            <select value={line.productId} onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, productId: e.target.value } : l)))} className={cx(inputClass, 'col-span-8')}>
              <option value="">Cylinder…</option>
              {choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" min={1} value={line.qty} onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l)))} placeholder="Qty" className={cx(inputClass, 'col-span-3')} />
            <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== idx))} disabled={lines.length === 1} title="Remove" className="col-span-1 flex items-center justify-center text-rose-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setLines([...lines, { productId: '', qty: '' }])} className="text-xs font-bold text-emerald-700">+ Add cylinder</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Deliver on"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Priority"><ChoiceTiles value={priority} onChange={setPriority} options={[{ value: 'NORMAL', label: 'Normal' }, { value: 'URGENT', label: 'Urgent', tone: 'rose' }]} /></Field>
      </div>
      {customer && customer.deliveryAddresses.length > 0 && (
        <Field label="Delivery address">
          <select value={addressId} onChange={(e) => setAddressId(e.target.value)} className={inputClass}>
            <option value="">Billing address</option>
            {customer.deliveryAddresses.map((a) => <option key={a.id} value={a.id}>{a.label}: {a.address}</option>)}
          </select>
        </Field>
      )}
      <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} /></Field>
      <p className="text-[11px] text-slate-500">About {inr(estimate)} at standard rates — the customer’s own rates are applied on save.{order.assignedDeliveryBoyName ? ` ${order.assignedDeliveryBoyName} is told about the change.` : ''}</p>
    </Modal>
  );
}
