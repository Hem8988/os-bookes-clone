'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Home,
  IndianRupee,
  LogOut,
  MapPin,
  Package,
  Phone,
  PlayCircle,
  RefreshCw,
  Send,
  StopCircle,
  Truck,
  UploadCloud,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api, errorMessage, inr, uploadFile } from '../lib/api';
import { logout, useSession } from '../lib/auth';
import { getLocation } from '../lib/security';
import { QueuedEntry, queueAll, queuePut, syncQueue } from '../lib/offlineQueue';
import { NotificationBell } from './NotificationBell';
import { Badge, Button, Empty, Field, inputClass, Modal, StatusBadge, cx, dateTime, useToast } from './ui';

// Delivery boy PWA (SRS §9, §14.2): Start Day → Stock → Today's Orders →
// Delivery Entry → Payment → Photo → Submit → Day Closing.

interface OrderItem { id: string; productId: string; productName: string; orderedQty: number; unitPrice: number; totalAmount: number }
interface DeliveryRow { id: string; deliveryNumber: string; status: string; sentBackReason: string | null; items: { productId: string; deliveredQty: number; emptyReceivedQty: number }[]; paymentMode: string; paymentAmount: number }
interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: string;
  priority: string;
  requestedDeliveryDate: string;
  deliveryAddress: string | null;
  area: string | null;
  totalAmount: number;
  items: OrderItem[];
  deliveries: DeliveryRow[];
  customer?: { contactPerson: string | null; phone: string; balance: number; area: string | null };
}
interface StockRow { productId: string; productName: string; fullQty: number; emptyQty: number }
interface DaySummary {
  status: 'NOT_STARTED' | 'STARTED' | 'CLOSED';
  deliveries: { count: number; cylindersDelivered: number; emptiesCollected: number; pendingVerification: number; sentBack: number };
  stock: { productId: string; productName: string; openingFull: number; received: number; delivered: number; returned: number; emptyCollected: number; closingFull: number; closingEmpty: number }[];
  cash: { opening: number; collected: number; submitted: number; pendingSubmission: number; closing: number; online: number; cheque: number; credit: number };
}
interface WalletInfo {
  wallet: { balance: number };
  pending: number;
  available: number;
  transactions: { id: string; type: string; amount: number; balanceAfter: number; notes: string | null; createdAt: string }[];
  receivers: { id: string; name: string; role: string }[];
}

type Tab = 'home' | 'orders' | 'wallet' | 'stock';
const ORDERS_CACHE = 'deskshark.delivery.orders';

/** Resize camera photos before upload (saves mobile data). */
async function compressImage(file: File, maxSide = 1280): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.72));
  } catch {
    return file;
  }
}

export default function DeliveryBoyModule() {
  const { session } = useSession();
  const [tab, setTab] = useState<Tab>('home');
  const [online, setOnline] = useState(true);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [queue, setQueue] = useState<QueuedEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [toast, showToast] = useToast();

  const refresh = useCallback(async () => {
    try {
      const [day, list, inv] = await Promise.all([
        api<DaySummary>('/api/delivery/day-log'),
        api<Order[]>('/api/cylinder/orders'),
        api<{ stock: StockRow[] }>('/api/cylinder/inventory'),
      ]);
      setSummary(day);
      setOrders(list);
      setStock(inv.stock);
      try {
        window.localStorage.setItem(ORDERS_CACHE, JSON.stringify(list));
      } catch {
        /* storage full */
      }
    } catch (e) {
      const cached = window.localStorage.getItem(ORDERS_CACHE);
      if (cached) setOrders(JSON.parse(cached));
      if (navigator.onLine) showToast(errorMessage(e), 'error');
    }
    setQueue(await queueAll().catch(() => []));
  }, [showToast]);

  const runSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    const result = await syncQueue(setQueue);
    setSyncing(false);
    if (result.synced) showToast(`${result.synced} delivery(s) synced.`);
    if (result.failed) showToast(`${result.failed} entry(s) could not sync — see Pending Sync.`, 'error');
    if (result.synced) void refresh();
  }, [syncing, refresh, showToast]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      void runSync();
    };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    void refresh().then(() => runSync());
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Location ping while the day is running (manager's live view).
  useEffect(() => {
    if (summary?.status !== 'STARTED') return;
    const ping = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      const pos = await getLocation(10_000);
      if (pos) await api('/api/delivery/gps', { body: { latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy } }).catch(() => {});
    };
    void ping();
    const timer = window.setInterval(ping, 3 * 60_000);
    return () => window.clearInterval(timer);
  }, [summary?.status]);

  const pendingIds = useMemo(() => new Set(queue.map((q) => String(q.payload.orderId))), [queue]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-lg mx-auto">
      {toast}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-black">{session?.user.name || 'Delivery'}</div>
          <div className="text-[10px] text-emerald-300 font-semibold">{session?.company.name}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cx('flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black', online ? 'bg-emerald-600' : 'bg-rose-600')}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} {online ? 'Online' : 'Offline'}
          </span>
          <NotificationBell tone="dark" />
          <button onClick={() => void logout()} className="p-2 rounded-full hover:bg-slate-800" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 pb-24 space-y-3">
        {tab === 'home' && <HomeTab summary={summary} queue={queue} syncing={syncing} onSync={runSync} onChanged={refresh} toast={showToast} />}
        {tab === 'orders' && (
          <OrdersTab orders={orders} pendingIds={pendingIds} dayStarted={summary?.status === 'STARTED'} onOpen={setOpenOrder} onRefresh={refresh} />
        )}
        {tab === 'wallet' && <WalletTab toast={showToast} />}
        {tab === 'stock' && <StockTab userId={session?.user.id || ''} stock={stock} onChanged={refresh} toast={showToast} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white border-t border-slate-200 grid grid-cols-4 z-30">
        {([
          ['home', Home, 'Today'],
          ['orders', Truck, 'Orders'],
          ['wallet', Wallet, 'Cash'],
          ['stock', Package, 'Stock'],
        ] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cx('relative py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-black', tab === key ? 'text-emerald-700' : 'text-slate-400')}>
            <Icon className="h-5 w-5" />
            {label}
            {key === 'home' && queue.length > 0 && <span className="absolute top-2 right-1/3 h-2 w-2 rounded-full bg-amber-500" />}
          </button>
        ))}
      </nav>

      {openOrder && (
        <OrderSheet
          order={openOrder}
          queued={pendingIds.has(openOrder.id)}
          dayStarted={summary?.status === 'STARTED'}
          onClose={() => setOpenOrder(null)}
          onChanged={async (msg) => {
            if (msg) showToast(msg);
            setOpenOrder(null);
            await refresh();
            void runSync();
          }}
          toast={showToast}
        />
      )}
    </div>
  );
}

// ───────────────────────── Home ─────────────────────────

function HomeTab({ summary, queue, syncing, onSync, onChanged, toast }: { summary: DaySummary | null; queue: QueuedEntry[]; syncing: boolean; onSync: () => void; onChanged: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const startDay = async () => {
    setBusy(true);
    try {
      const pos = await getLocation();
      await api('/api/delivery/day-log', { body: { action: 'START_DAY', latitude: pos?.latitude ?? null, longitude: pos?.longitude ?? null } });
      toast('Day started. Drive safe!');
      await onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const closeDay = async () => {
    if (queue.length) return toast('Sync pending deliveries before closing the day.', 'error');
    setBusy(true);
    try {
      await api('/api/delivery/day-log', { body: { action: 'CLOSE_DAY' } });
      setConfirmClose(false);
      toast('Day closed. Entries are locked.');
      await onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!summary) return <Empty>Loading…</Empty>;
  const s = summary;
  return (
    <>
      <div className={cx('rounded-2xl p-4 text-white', s.status === 'STARTED' ? 'bg-emerald-600' : s.status === 'CLOSED' ? 'bg-slate-700' : 'bg-sky-700')}>
        <div className="text-[11px] font-bold uppercase opacity-80">Day status</div>
        <div className="text-xl font-black">{s.status === 'STARTED' ? 'On duty' : s.status === 'CLOSED' ? 'Day closed' : 'Not started'}</div>
        {s.status === 'NOT_STARTED' && (
          <Button className="mt-3 w-full bg-white text-sky-800 hover:bg-sky-50" busy={busy} onClick={startDay}>
            <PlayCircle className="h-4 w-4" /> Start day (location check)
          </Button>
        )}
        {s.status === 'STARTED' && (
          <Button className="mt-3 w-full bg-white/15 hover:bg-white/25 text-white" onClick={() => setConfirmClose(true)}>
            <StopCircle className="h-4 w-4" /> Close day
          </Button>
        )}
      </div>

      {queue.length > 0 && (
        <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-amber-900 flex items-center gap-2">
              <CloudOff className="h-4 w-4" /> Pending sync ({queue.length})
            </div>
            <Button size="sm" busy={syncing} onClick={onSync}>
              <UploadCloud className="h-3.5 w-3.5" /> Sync now
            </Button>
          </div>
          {queue.map((q) => (
            <div key={q.id} className="text-[11px] text-amber-900">
              <strong>{q.label}</strong> · {dateTime(q.createdAt)}
              {q.lastError && <div className="text-rose-700 font-semibold">⚠ {q.lastError}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Deliveries" value={s.deliveries.count} sub={`${s.deliveries.pendingVerification} awaiting accounts`} />
        <Tile label="Cylinders delivered" value={s.deliveries.cylindersDelivered} sub={`${s.deliveries.emptiesCollected} empties collected`} />
        <Tile label="Cash in hand" value={inr(s.cash.closing)} sub={`${inr(s.cash.pendingSubmission)} pending submission`} />
        <Tile label="Online / cheque" value={inr(s.cash.online + s.cash.cheque)} sub={`Credit given ${inr(s.cash.credit)}`} />
      </div>
      {s.deliveries.sentBack > 0 && (
        <div className="rounded-xl p-3 bg-rose-50 text-rose-800 text-xs font-bold flex gap-2">
          <AlertTriangle className="h-4 w-4" /> {s.deliveries.sentBack} delivery(s) sent back by accounts — open Orders to correct.
        </div>
      )}
      <div className="rounded-2xl bg-white border border-slate-200 p-3">
        <div className="text-xs font-black text-slate-900 mb-2">Stock with me</div>
        {s.stock.length === 0 ? (
          <div className="text-[11px] text-slate-400">No stock issued yet.</div>
        ) : (
          s.stock.map((p) => (
            <div key={p.productId} className="flex justify-between text-xs py-1 border-b border-slate-50">
              <span className="font-semibold">{p.productName}</span>
              <span>
                <strong>{p.closingFull}</strong> full · {p.closingEmpty} empty
              </span>
            </div>
          ))
        )}
      </div>

      <Modal
        open={confirmClose}
        title="Close today"
        onClose={() => setConfirmClose(false)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setConfirmClose(false)}>Back</Button>
            <Button tone="danger" busy={busy} onClick={closeDay}>Close & lock day</Button>
          </>
        }
      >
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left">Product</th>
              <th className="text-right">Opening</th>
              <th className="text-right">+Recd</th>
              <th className="text-right">−Deliv</th>
              <th className="text-right">−Ret</th>
              <th className="text-right">Closing</th>
            </tr>
          </thead>
          <tbody>
            {s.stock.map((p) => (
              <tr key={p.productId} className="border-t border-slate-100">
                <td className="py-1 font-semibold">{p.productName}</td>
                <td className="text-right">{p.openingFull}</td>
                <td className="text-right">{p.received}</td>
                <td className="text-right">{p.delivered}</td>
                <td className="text-right">{p.returned}</td>
                <td className="text-right font-black">{p.closingFull}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs space-y-1">
          <div className="flex justify-between"><span>Opening cash</span><strong>{inr(s.cash.opening)}</strong></div>
          <div className="flex justify-between"><span>+ Cash collected</span><strong>{inr(s.cash.collected)}</strong></div>
          <div className="flex justify-between"><span>− Submitted</span><strong>{inr(s.cash.submitted)}</strong></div>
          <div className="flex justify-between border-t pt-1"><span>Closing cash (in hand)</span><strong>{inr(s.cash.closing)}</strong></div>
        </div>
        <p className="text-[11px] text-slate-500">After closing, changes need admin approval.</p>
      </Modal>
    </>
  );
}

const Tile = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-3">
    <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
    <div className="text-lg font-black text-slate-900">{value}</div>
    {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
  </div>
);

// ───────────────────────── Orders ─────────────────────────

function OrdersTab({ orders, pendingIds, dayStarted, onOpen, onRefresh }: { orders: Order[]; pendingIds: Set<string>; dayStarted: boolean; onOpen: (o: Order) => void; onRefresh: () => Promise<void> }) {
  const groups = [
    { title: 'Sent back for correction', statuses: ['SENT_BACK'] },
    { title: 'To deliver', statuses: ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'] },
    { title: 'Waiting for accounts', statuses: ['DELIVERED', 'PENDING_VERIFICATION'] },
  ];
  return (
    <>
      {!dayStarted && <div className="rounded-xl p-3 bg-sky-50 text-sky-800 text-xs font-bold">Start your day to deliver orders.</div>}
      <div className="flex justify-end">
        <Button tone="secondary" size="sm" onClick={() => void onRefresh()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      {groups.map((g) => {
        const list = orders.filter((o) => g.statuses.includes(o.status));
        if (!list.length) return null;
        return (
          <div key={g.title} className="space-y-2">
            <div className="text-[11px] font-black uppercase text-slate-500">{g.title} ({list.length})</div>
            {list.map((o) => (
              <button key={o.id} onClick={() => onOpen(o)} className="w-full text-left rounded-2xl bg-white border border-slate-200 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 truncate">{o.customerName}</span>
                    {o.priority === 'URGENT' && <Badge tone="red">Urgent</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{o.deliveryAddress || o.area}</div>
                  <div className="text-[11px] text-slate-700 font-semibold">{o.items.map((i) => `${i.productName} × ${i.orderedQty}`).join(', ')}</div>
                  <div className="mt-1 flex gap-1">
                    <StatusBadge status={o.status} />
                    {pendingIds.has(o.id) && <Badge tone="amber">Pending sync</Badge>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            ))}
          </div>
        );
      })}
      {orders.length === 0 && <Empty>No orders assigned right now.</Empty>}
    </>
  );
}

interface CustomerSnapshot {
  customer: { name: string; contactPerson: string | null; phone: string; address: string; balance: number; cylinderBalances: { productName: string; currentBalance: number }[] };
  deliveries: { id: string; deliveryNumber: string; deliveryDate: string; deliveredQtyTotal: number; emptyReceivedTotal: number; remarks: string | null; deliveryBoyName: string }[];
}

function OrderSheet({ order, queued, dayStarted, onClose, onChanged, toast }: { order: Order; queued: boolean; dayStarted: boolean; onClose: () => void; onChanged: (msg?: string) => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const [snapshot, setSnapshot] = useState<CustomerSnapshot | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [busy, setBusy] = useState(false);
  const sentBack = order.deliveries.find((d) => d.status === 'SENT_BACK');

  useEffect(() => {
    api<CustomerSnapshot>(`/api/customers/${order.customerId}/360`).then(setSnapshot).catch(() => {});
  }, [order.customerId]);

  const act = async (action: 'accept' | 'dispatch') => {
    setBusy(true);
    try {
      await api(`/api/cylinder/orders/${order.id}`, { body: { action } });
      await onChanged(action === 'accept' ? 'Order accepted.' : 'Customer notified: out for delivery.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const canDeliver = dayStarted && !queued && (['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(order.status) || !!sentBack);

  return (
    <Modal open title={`${order.orderNumber} · ${order.customerName}`} onClose={onClose} wide>
      {delivering ? (
        <DeliveryForm order={order} previous={sentBack} onCancel={() => setDelivering(false)} onQueued={onChanged} toast={toast} />
      ) : (
        <div className="space-y-3 text-xs">
          {sentBack && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 font-bold">
              Sent back by accounts: {sentBack.sentBackReason}
            </div>
          )}
          <div className="flex gap-2">
            <a href={`tel:${order.customerPhone}`} className="flex-1 py-2 rounded-xl bg-slate-100 font-bold flex items-center justify-center gap-1">
              <Phone className="h-4 w-4" /> Call
            </a>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress || '')}`} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-xl bg-slate-100 font-bold flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" /> Map
            </a>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 space-y-1">
            <div className="font-black">Order</div>
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>{i.productName} × {i.orderedQty}</span>
                <span className="font-mono">{inr(i.totalAmount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1 font-black">
              <span>Bill</span>
              <span>{inr(order.totalAmount)}</span>
            </div>
          </div>
          {snapshot && (
            <div className="rounded-xl border border-slate-200 p-3 space-y-1">
              <div className="font-black">Customer history</div>
              <div>Contact: {snapshot.customer.contactPerson || '—'} · {snapshot.customer.phone}</div>
              <div>Previous dues: <strong>{inr(snapshot.customer.balance)}</strong></div>
              <div>Cylinders with customer: {snapshot.customer.cylinderBalances.map((c) => `${c.productName}: ${c.currentBalance}`).join(', ') || '—'}</div>
              {snapshot.deliveries.slice(0, 3).map((d) => (
                <div key={d.id} className="text-slate-500">
                  {d.deliveryDate}: {d.deliveredQtyTotal} full / {d.emptyReceivedTotal} empty by {d.deliveryBoyName}
                  {d.remarks ? ` — “${d.remarks}”` : ''}
                </div>
              ))}
            </div>
          )}
          {queued && <div className="p-3 rounded-xl bg-amber-50 text-amber-800 font-bold">This delivery is saved on the phone and will sync automatically.</div>}
          <div className="grid gap-2">
            {order.status === 'ASSIGNED' && (
              <Button tone="secondary" busy={busy} onClick={() => act('accept')}>
                <CheckCircle2 className="h-4 w-4" /> Accept order
              </Button>
            )}
            {['ASSIGNED', 'ACCEPTED'].includes(order.status) && (
              <Button tone="secondary" busy={busy} disabled={!dayStarted} onClick={() => act('dispatch')}>
                <Truck className="h-4 w-4" /> Out for delivery
              </Button>
            )}
            {canDeliver && (
              <Button onClick={() => setDelivering(true)}>
                <Package className="h-4 w-4" /> {sentBack ? 'Correct & resubmit' : 'Enter delivery'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PhotoInput({ label, file, onFile, required }: { label: string; file: Blob | null; onFile: (b: Blob | null) => void; required?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  return (
    <div>
      <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">{label}{required && ' *'}</div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        onFile(f ? await compressImage(f) : null);
      }} />
      <button type="button" onClick={() => ref.current?.click()} className={cx('w-full h-28 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden', file ? 'border-emerald-400' : 'border-slate-300')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? <img src={preview} alt={label} className="h-full w-full object-cover" /> : <span className="flex items-center gap-1 text-xs font-bold text-slate-500"><Camera className="h-4 w-4" /> Take photo</span>}
      </button>
    </div>
  );
}

function DeliveryForm({ order, previous, onCancel, onQueued, toast }: { order: Order; previous?: DeliveryRow; onCancel: () => void; onQueued: (msg?: string) => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const [lines, setLines] = useState(() =>
    order.items.map((i) => {
      const old = previous?.items.find((p) => p.productId === i.productId);
      return { productId: i.productId, productName: i.productName, orderedQty: i.orderedQty, unitPrice: i.unitPrice, delivered: String(old?.deliveredQty ?? i.orderedQty), empty: String(old?.emptyReceivedQty ?? i.orderedQty) };
    })
  );
  const bill = lines.reduce((s, l) => s + (Number(l.delivered) || 0) * l.unitPrice, 0);
  const [mode, setMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE' | 'CREDIT'>((previous?.paymentMode as 'CASH') || 'CASH');
  const [amount, setAmount] = useState(String(previous?.paymentAmount ?? bill));
  const [txn, setTxn] = useState('');
  const [cheque, setCheque] = useState({ number: '', bank: '', date: '' });
  const [proof, setProof] = useState<Blob | null>(null);
  const [payProof, setPayProof] = useState<Blob | null>(null);
  const [chequePhoto, setChequePhoto] = useState<Blob | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!proof) return toast('Delivery proof photo is mandatory.', 'error');
    if (mode !== 'CREDIT' && !(Number(amount) > 0)) return toast('Enter the amount collected.', 'error');
    if (mode === 'ONLINE' && (!txn.trim() || !payProof)) return toast('Transaction ID and payment screenshot are required.', 'error');
    if (mode === 'CHEQUE' && (!cheque.number || !cheque.bank || !cheque.date || !chequePhoto)) return toast('Cheque number, bank, date and photo are required.', 'error');
    setBusy(true);
    const pos = await getLocation(8000);
    const id = crypto.randomUUID();
    const files: Record<string, Blob> = { deliveryProofUrl: proof };
    if (mode === 'ONLINE' && payProof) files.paymentProofUrl = payProof;
    if (mode === 'CHEQUE' && chequePhoto) files.chequePhotoUrl = chequePhoto;
    const entry: QueuedEntry = {
      id,
      kind: 'DELIVERY',
      createdAt: new Date().toISOString(),
      label: `${order.orderNumber} · ${order.customerName}`,
      attempts: 0,
      files,
      payload: {
        orderId: order.id,
        deliveredAt: new Date().toISOString(),
        items: lines.map((l) => ({ productId: l.productId, deliveredQty: Number(l.delivered) || 0, emptyReceivedQty: Number(l.empty) || 0 })),
        paymentMode: mode,
        paymentAmount: mode === 'CREDIT' ? 0 : Number(amount),
        transactionId: mode === 'ONLINE' ? txn.trim() : null,
        chequeNumber: mode === 'CHEQUE' ? cheque.number : null,
        chequeBank: mode === 'CHEQUE' ? cheque.bank : null,
        chequeDate: mode === 'CHEQUE' ? cheque.date : null,
        latitude: pos?.latitude ?? null,
        longitude: pos?.longitude ?? null,
        remarks: remarks.trim() || null,
      },
    };
    try {
      // Always save on the phone first; sync removes it once the server confirms.
      await queuePut(entry);
      await onQueued(navigator.onLine ? 'Delivery saved — syncing…' : 'Offline: delivery saved on phone (Pending Sync).');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {lines.map((l, idx) => (
        <div key={l.productId} className="rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-black">{l.productName} <span className="text-slate-400 font-semibold">(ordered {l.orderedQty})</span></div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Delivered (full)">
              <input type="number" inputMode="numeric" min={0} value={l.delivered} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, delivered: e.target.value } : x)))} className={inputClass} />
            </Field>
            <Field label="Empty received">
              <input type="number" inputMode="numeric" min={0} value={l.empty} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, empty: e.target.value } : x)))} className={inputClass} />
            </Field>
          </div>
          {(Number(l.delivered) !== l.orderedQty || Number(l.empty) !== Number(l.delivered)) && (
            <div className="text-[10px] font-bold text-amber-700 mt-1">Difference will be flagged for accounts.</div>
          )}
        </div>
      ))}
      <div className="text-right text-sm font-black">Bill: {inr(bill)}</div>
      <div className="grid grid-cols-4 gap-1">
        {(['CASH', 'ONLINE', 'CHEQUE', 'CREDIT'] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); if (m === 'CREDIT') setAmount('0'); else if (Number(amount) === 0) setAmount(String(bill)); }} className={cx('py-2 rounded-xl text-[11px] font-black', mode === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600')}>
            {m}
          </button>
        ))}
      </div>
      {mode !== 'CREDIT' && (
        <Field label="Amount collected (₹)">
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
      )}
      {mode === 'ONLINE' && (
        <>
          <Field label="Transaction ID / UTR">
            <input value={txn} onChange={(e) => setTxn(e.target.value)} className={inputClass} />
          </Field>
          <PhotoInput label="Payment screenshot" file={payProof} onFile={setPayProof} required />
        </>
      )}
      {mode === 'CHEQUE' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cheque no."><input value={cheque.number} onChange={(e) => setCheque({ ...cheque, number: e.target.value })} className={inputClass} /></Field>
            <Field label="Cheque date"><input type="date" value={cheque.date} onChange={(e) => setCheque({ ...cheque, date: e.target.value })} className={inputClass} /></Field>
          </div>
          <Field label="Bank"><input value={cheque.bank} onChange={(e) => setCheque({ ...cheque, bank: e.target.value })} className={inputClass} /></Field>
          <PhotoInput label="Cheque photo" file={chequePhoto} onFile={setChequePhoto} required />
        </>
      )}
      <PhotoInput label="Delivery proof" file={proof} onFile={setProof} required />
      <Field label="Remarks">
        <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} placeholder="e.g. gate 2, call before delivery" />
      </Field>
      <div className="flex gap-2">
        <Button tone="secondary" className="flex-1" onClick={onCancel}>Back</Button>
        <Button className="flex-1" busy={busy} onClick={submit}>
          <Send className="h-4 w-4" /> Submit delivery
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── Wallet ─────────────────────────

function WalletTab({ toast }: { toast: (m: string, t?: 'ok' | 'error') => void }) {
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [submissions, setSubmissions] = useState<{ id: string; submissionNumber: string; amount: number; receiverName: string; status: string; rejectionReason: string | null; createdAt: string }[]>([]);
  const [amount, setAmount] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([api<WalletInfo>('/api/financial/wallets'), api<typeof submissions>('/api/financial/cash-submission')]);
      setInfo(w);
      setSubmissions(s);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    try {
      const proofUrl = photo ? await uploadFile(photo) : null;
      await api('/api/financial/cash-submission', { body: { amount: Number(amount), receiverId, proofUrl } });
      toast('Cash submission sent for confirmation.');
      setAmount('');
      setPhoto(null);
      await load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <Empty>Loading…</Empty>;
  return (
    <>
      <div className="rounded-2xl p-4 bg-slate-900 text-white">
        <div className="text-[11px] font-bold uppercase opacity-70">Cash in hand</div>
        <div className="text-2xl font-black flex items-center gap-1"><IndianRupee className="h-5 w-5" />{info.wallet.balance.toLocaleString('en-IN')}</div>
        <div className="text-[11px] opacity-70">Pending submission {inr(info.pending)} · can submit {inr(info.available)}</div>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-3">
        <div className="text-xs font-black">Submit cash</div>
        <Field label="Handing over to">
          <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {info.receivers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount (₹)">
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <PhotoInput label="Proof photo (optional)" file={photo} onFile={setPhoto} />
        <Button className="w-full" busy={busy} disabled={!receiverId || !(Number(amount) > 0)} onClick={submit}>
          <Send className="h-4 w-4" /> Submit
        </Button>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
        <div className="text-xs font-black mb-1">My submissions</div>
        {submissions.length === 0 && <div className="text-[11px] text-slate-400">None yet.</div>}
        {submissions.map((s) => (
          <div key={s.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
            <span>{s.submissionNumber} → {s.receiverName}<div className="text-[10px] text-slate-400">{dateTime(s.createdAt)}{s.rejectionReason ? ` · ${s.rejectionReason}` : ''}</div></span>
            <span className="text-right"><strong>{inr(s.amount)}</strong><div><StatusBadge status={s.status} /></div></span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
        <div className="text-xs font-black mb-1">Wallet history</div>
        {info.transactions.map((t) => (
          <div key={t.id} className="flex justify-between text-xs py-1 border-b border-slate-50">
            <span>{t.notes || t.type}<div className="text-[10px] text-slate-400">{dateTime(t.createdAt)}</div></span>
            <span className={cx('font-mono font-bold', t.amount < 0 ? 'text-rose-600' : 'text-emerald-700')}>{t.amount > 0 ? '+' : ''}{inr(t.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ───────────────────────── Stock & requests ─────────────────────────

function StockTab({ userId, stock, onChanged, toast }: { userId: string; stock: StockRow[]; onChanged: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [transfers, setTransfers] = useState<{ id: string; transferNumber: string; fromName: string; toName: string; status: string; items: { productName: string; fullQty: number; emptyQty: number }[] }[]>([]);
  const [requests, setRequests] = useState<{ id: string; title: string; status: string; decisionNote: string | null; createdAt: string }[]>([]);
  const [form, setForm] = useState<{ kind: 'ISSUE' | 'RETURN'; warehouseId: string; productId: string; full: string; empty: string } | null>(null);
  const [fieldRequest, setFieldRequest] = useState<{ kind: string; note: string; qty: string; amount: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, w, t, r] = await Promise.all([
        api<{ id: string; name: string }[]>('/api/products'),
        api<{ id: string; name: string }[]>('/api/cylinder/warehouses'),
        api<typeof transfers>('/api/cylinder/transfers'),
        api<typeof requests>('/api/requests'),
      ]);
      setProducts(p);
      setWarehouses(w);
      setTransfers(t);
      setRequests(r);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitTransfer = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const me = userId;
      await api('/api/cylinder/transfers', {
        body: {
          transferType: form.kind === 'ISSUE' ? 'WAREHOUSE_TO_DRIVER' : 'DRIVER_TO_WAREHOUSE',
          fromId: form.kind === 'ISSUE' ? form.warehouseId : me,
          toId: form.kind === 'ISSUE' ? me : form.warehouseId,
          items: [{ productId: form.productId, fullQty: Number(form.full) || 0, emptyQty: Number(form.empty) || 0 }],
        },
      });
      toast('Request sent for manager approval.');
      setForm(null);
      await Promise.all([load(), onChanged()]);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitFieldRequest = async () => {
    if (!fieldRequest) return;
    setBusy(true);
    try {
      await api('/api/requests', { body: { kind: fieldRequest.kind, note: fieldRequest.note, qty: Number(fieldRequest.qty) || 0, amount: Number(fieldRequest.amount) || 0 } });
      toast('Request sent.');
      setFieldRequest(null);
      await load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-white border border-slate-200 p-3">
        <div className="text-xs font-black mb-2">Stock with me</div>
        {stock.length === 0 && <div className="text-[11px] text-slate-400">No stock.</div>}
        {stock.map((s) => (
          <div key={s.productId} className="flex justify-between text-xs py-1 border-b border-slate-50">
            <span className="font-semibold">{s.productName}</span>
            <span><strong>{s.fullQty}</strong> full · {s.emptyQty} empty</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setForm({ kind: 'ISSUE', warehouseId: warehouses[0]?.id || '', productId: products[0]?.id || '', full: '', empty: '' })}>Request stock</Button>
        <Button tone="secondary" onClick={() => setForm({ kind: 'RETURN', warehouseId: warehouses[0]?.id || '', productId: products[0]?.id || '', full: '', empty: '' })}>Return to godown</Button>
        <Button tone="secondary" className="col-span-2" onClick={() => setFieldRequest({ kind: 'EXTRA_CYLINDERS', note: '', qty: '', amount: '' })}>Other request (advance, vehicle…)</Button>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
        <div className="text-xs font-black mb-1">My stock requests</div>
        {transfers.length === 0 && <div className="text-[11px] text-slate-400">None.</div>}
        {transfers.map((t) => (
          <div key={t.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
            <span>{t.transferNumber}: {t.fromName} → {t.toName}<div className="text-[10px] text-slate-500">{t.items.map((i) => `${i.productName} ${i.fullQty}F/${i.emptyQty}E`).join(', ')}</div></span>
            <StatusBadge status={t.status === 'PENDING_APPROVAL' ? 'PENDING' : t.status} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
        <div className="text-xs font-black mb-1">My requests</div>
        {requests.length === 0 && <div className="text-[11px] text-slate-400">None.</div>}
        {requests.map((r) => (
          <div key={r.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
            <span>{r.title}<div className="text-[10px] text-slate-400">{dateTime(r.createdAt)}{r.decisionNote ? ` · ${r.decisionNote}` : ''}</div></span>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>

      <Modal open={!!form} title={form?.kind === 'ISSUE' ? 'Request stock from godown' : 'Return stock to godown'} onClose={() => setForm(null)} footer={<Button busy={busy} onClick={submitTransfer}>Send for approval</Button>}>
        {form && (
          <>
            <Field label="Godown">
              <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} className={inputClass}>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Field label="Product">
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={inputClass}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Full"><input type="number" min={0} value={form.full} onChange={(e) => setForm({ ...form, full: e.target.value })} className={inputClass} /></Field>
              <Field label="Empty"><input type="number" min={0} value={form.empty} onChange={(e) => setForm({ ...form, empty: e.target.value })} className={inputClass} /></Field>
            </div>
          </>
        )}
      </Modal>

      <Modal open={!!fieldRequest} title="Request to manager" onClose={() => setFieldRequest(null)} footer={<Button busy={busy} disabled={!fieldRequest?.note.trim()} onClick={submitFieldRequest}>Send</Button>}>
        {fieldRequest && (
          <>
            <Field label="Type">
              <select value={fieldRequest.kind} onChange={(e) => setFieldRequest({ ...fieldRequest, kind: e.target.value })} className={inputClass}>
                <option value="EXTRA_CYLINDERS">Extra cylinders</option>
                <option value="CASH_ADVANCE">Cash advance</option>
                <option value="VEHICLE_ISSUE">Vehicle issue</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Details"><textarea rows={3} value={fieldRequest.note} onChange={(e) => setFieldRequest({ ...fieldRequest, note: e.target.value })} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Qty"><input type="number" value={fieldRequest.qty} onChange={(e) => setFieldRequest({ ...fieldRequest, qty: e.target.value })} className={inputClass} /></Field>
              <Field label="Amount ₹"><input type="number" value={fieldRequest.amount} onChange={(e) => setFieldRequest({ ...fieldRequest, amount: e.target.value })} className={inputClass} /></Field>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
