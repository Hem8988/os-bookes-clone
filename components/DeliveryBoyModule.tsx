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
  Plus,
  RefreshCw,
  Send,
  StopCircle,
  Trash2,
  Truck,
  UploadCloud,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api, errorMessage, inr, uploadFile } from '../lib/api';
import { useT } from '../lib/i18n';
import { ROLE_LABELS, type Role } from '../lib/permissions';
import { useApiData } from '../lib/useApiData';
import { logout, useSession } from '../lib/auth';
import { getLocation } from '../lib/security';
import { QueuedEntry, queueAll, queuePut, syncQueue } from '../lib/offlineQueue';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBell } from './NotificationBell';
import { Badge, Button, Empty, Field, inputClass, Modal, StatusBadge, cx, dateTime, partyLabel, today, useToast } from './ui';
import { DateInput } from './DateInput';

// Delivery boy PWA (SRS §9, §14.2): Start Day → Stock → Today's Orders →
// Delivery Entry → Payment → Photo → Submit → Day Closing.

interface OrderItem { id: string; productId: string; productName: string; orderedQty: number; unitPrice: number; totalAmount: number }
interface DeliveryRow { id: string; deliveryNumber: string; status: string; sentBackReason: string | null; items: { productId: string; deliveredQty: number; emptyReceivedQty: number }[]; paymentMode: string; paymentAmount: number }
interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerShortName: string | null;
  customerPhone: string;
  status: string;
  source: string;
  rejectionReason: string | null;
  priority: string;
  requestedDeliveryDate: string;
  deliveryAddress: string | null;
  area: string | null;
  totalAmount: number;
  items: OrderItem[];
  deliveries: DeliveryRow[];
  customer?: { contactPerson: string | null; phone: string; balance: number; area: string | null };
}
interface TransferRow {
  id: string;
  transferNumber: string;
  fromName: string;
  toName: string;
  status: string;
  notes: string | null;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  edits: { actorName: string; note: string | null; createdAt: string }[];
  items: { productName: string; fullQty: number; emptyQty: number }[];
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
  const { t } = useT();
  const { session } = useSession();
  const [tab, setTab] = useState<Tab>('home');
  const [online, setOnline] = useState(true);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [queue, setQueue] = useState<QueuedEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, rawToast] = useToast();
  // Every toast (ours and server messages) goes out in the chosen language.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  const showToast = useCallback((message: string, tone?: 'ok' | 'error') => rawToast(tRef.current(message), tone), [rawToast]);

  // refresh() bumps a counter; the effect below does the actual loading.
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = useCallback(async () => setRefreshTick((n) => n + 1), []);

  // Today's day summary, orders and stock; offline → last cached order list.
  useEffect(() => {
    let alive = true;
    Promise.all([api<DaySummary>('/api/delivery/day-log'), api<Order[]>('/api/cylinder/orders'), api<{ stock: StockRow[] }>('/api/cylinder/inventory')])
      .then(
        ([day, list, inv]) => {
          if (!alive) return;
          setSummary(day);
          setOrders(list);
          setStock(inv.stock);
          try {
            window.localStorage.setItem(ORDERS_CACHE, JSON.stringify(list));
          } catch {
            /* storage full */
          }
        },
        (e) => {
          if (!alive) return;
          const cached = window.localStorage.getItem(ORDERS_CACHE);
          if (cached) setOrders(JSON.parse(cached));
          if (navigator.onLine) showToast(errorMessage(e), 'error');
        }
      )
      .then(() => queueAll().catch(() => [] as QueuedEntry[]))
      .then((q) => {
        if (alive) setQueue(q);
      });
    return () => {
      alive = false;
    };
  }, [refreshTick, showToast]);

  const syncingRef = useRef(false);
  const runSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    const result = await syncQueue(setQueue);
    syncingRef.current = false;
    setSyncing(false);
    if (result.synced) showToast(`${result.synced} delivery(s) synced.`);
    if (result.failed) showToast(`${result.failed} entry(s) could not sync — see Pending Sync.`, 'error');
    if (result.synced) void refresh();
  }, [refresh, showToast]);

  // Connectivity, service worker and the first sync of anything saved offline.
  useEffect(() => {
    const up = () => {
      setOnline(true);
      void runSync();
    };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const first = window.setTimeout(() => {
      setOnline(navigator.onLine);
      void runSync();
    }, 0);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, [runSync]);

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
          <div className="text-sm font-black">{session?.user.name || t('Delivery')}</div>
          <div className="text-[10px] text-emerald-300 font-semibold">{session?.company.name}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cx('flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black', online ? 'bg-emerald-600' : 'bg-rose-600')}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} {online ? t('Online') : t('Offline')}
          </span>
          <LanguageToggle />
          <NotificationBell tone="dark" />
          <button onClick={() => void logout()} className="p-2 rounded-full hover:bg-slate-800" title={t('Logout')}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 pb-24 space-y-3">
        {tab === 'home' && (
          <HomeTab
            summary={summary}
            toDeliver={orders.filter((o) => ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'SENT_BACK'].includes(o.status)).length}
            onOpenOrders={() => setTab('orders')}
            onOpenCash={() => setTab('wallet')}
            queue={queue}
            syncing={syncing}
            onSync={runSync}
            onChanged={refresh}
            toast={showToast}
          />
        )}
        {tab === 'orders' && (
          <OrdersTab orders={orders} pendingIds={pendingIds} dayStarted={summary?.status === 'STARTED'} onOpen={setOpenOrder} onRefresh={refresh} onNew={() => setCreating(true)} />
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
            {t(label)}
            {key === 'home' && queue.length > 0 && <span className="absolute top-2 right-1/3 h-2 w-2 rounded-full bg-amber-500" />}
          </button>
        ))}
      </nav>

      {openOrder && (
        <OrderSheet
          order={openOrder}
          stock={stock}
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
      {creating && (
        <NewOrderSheet
          onClose={() => setCreating(false)}
          onCreated={async () => {
            showToast('Order sent to the office for approval.');
            setCreating(false);
            await refresh();
          }}
          toast={showToast}
        />
      )}
    </div>
  );
}

// ───────────────────────── Home ─────────────────────────

function HomeTab({ summary, toDeliver, onOpenOrders, onOpenCash, queue, syncing, onSync, onChanged, toast }: { summary: DaySummary | null; toDeliver: number; onOpenOrders: () => void; onOpenCash: () => void; queue: QueuedEntry[]; syncing: boolean; onSync: () => void; onChanged: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
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

  if (!summary) return <Empty>{t('Loading…')}</Empty>;
  const s = summary;
  // Cash still to hand over; the day cannot be closed until it is submitted.
  const cashToSubmit = Math.max(0, Math.round((s.cash.closing - s.cash.pendingSubmission) * 100) / 100);
  return (
    <>
      <div className={cx('rounded-2xl p-4 text-white', s.status === 'STARTED' ? 'bg-emerald-600' : s.status === 'CLOSED' ? 'bg-slate-700' : 'bg-sky-700')}>
        <div className="text-[11px] font-bold uppercase opacity-80">{t('Day status')}</div>
        <div className="text-xl font-black">{t(s.status === 'STARTED' ? 'On duty' : s.status === 'CLOSED' ? 'Day closed' : 'Not started')}</div>
        {s.status === 'NOT_STARTED' && (
          <Button tone="plain" className="mt-3 w-full py-3 text-sm bg-white text-sky-800 hover:bg-sky-50 shadow" busy={busy} onClick={startDay}>
            <PlayCircle className="h-4 w-4" />{t('Start day (location check)')}</Button>
        )}
        {s.status === 'STARTED' && (
          <Button tone="plain" className="mt-3 w-full bg-white/15 hover:bg-white/25 text-white" onClick={() => setConfirmClose(true)}>
            <StopCircle className="h-4 w-4" />{t('Close day')}</Button>
        )}
      </div>

      <button onClick={onOpenOrders} className="w-full rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between text-left">
        <span className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-emerald-600" />
          <span>
            <span className="block text-[10px] font-bold uppercase text-slate-500">{t('To deliver')}</span>
            <span className="block text-2xl font-black text-slate-900">{toDeliver}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-black text-emerald-700">
          {t('Open orders')} <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      {queue.length > 0 && (
        <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-amber-900 flex items-center gap-2">
              <CloudOff className="h-4 w-4" /> {t('Pending sync')} ({queue.length})
            </div>
            <Button size="sm" busy={syncing} onClick={onSync}>
              <UploadCloud className="h-3.5 w-3.5" />{t('Sync now')}</Button>
          </div>
          {queue.map((q) => (
            <div key={q.id} className="text-[11px] text-amber-900">
              <strong>{q.label}</strong> · {dateTime(q.createdAt)}
              {q.lastError && <div className="text-rose-700 font-semibold">⚠ {t(q.lastError)}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Tile label={t('Deliveries')} value={s.deliveries.count} sub={t('{n} awaiting accounts', { n: s.deliveries.pendingVerification })} />
        <Tile label={t('Cylinders delivered')} value={s.deliveries.cylindersDelivered} sub={t('{n} empties collected', { n: s.deliveries.emptiesCollected })} />
        <Tile label={t('Cash in hand')} value={inr(s.cash.closing)} sub={t('{amount} pending submission', { amount: inr(s.cash.pendingSubmission) })} />
        <Tile label={t('Online / cheque')} value={inr(s.cash.online + s.cash.cheque)} sub={t('Credit given {amount}', { amount: inr(s.cash.credit) })} />
      </div>
      {s.deliveries.sentBack > 0 && (
        <div className="rounded-xl p-3 bg-rose-50 text-rose-800 text-xs font-bold flex gap-2">
          <AlertTriangle className="h-4 w-4" /> {t('{n} delivery(s) sent back by accounts — open Orders to correct.', { n: s.deliveries.sentBack })}
        </div>
      )}
      <div className="rounded-2xl bg-white border border-slate-200 p-3">
        <div className="text-xs font-black text-slate-900 mb-2">{t('Stock with me')}</div>
        {s.stock.length === 0 ? (
          <div className="text-[11px] text-slate-400">{t('No stock issued yet.')}</div>
        ) : (
          s.stock.map((p) => (
            <div key={p.productId} className="flex justify-between text-xs py-1 border-b border-slate-50">
              <span className="font-semibold">{p.productName}</span>
              <span>
                <strong>{p.closingFull}</strong> {t('full')} · {p.closingEmpty} {t('empty')}
              </span>
            </div>
          ))
        )}
      </div>

      <Modal
        open={confirmClose}
        title={t('Close today')}
        onClose={() => setConfirmClose(false)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setConfirmClose(false)}>{t('Back')}</Button>
            <Button tone="danger" busy={busy} disabled={cashToSubmit > 0} onClick={closeDay}>{t('Close & lock day')}</Button>
          </>
        }
      >
        {cashToSubmit > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold space-y-2">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('Submit your cash in hand ({amount}) before closing the day.', { amount: inr(cashToSubmit) })}
            </div>
            <Button size="sm" className="w-full" onClick={() => { setConfirmClose(false); onOpenCash(); }}>
              <Wallet className="h-3.5 w-3.5" />{t('Go to Cash — submit now')}</Button>
          </div>
        )}
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left">{t('Product')}</th>
              <th className="text-right">{t('Opening')}</th>
              <th className="text-right">{t('+Recd')}</th>
              <th className="text-right">{t('−Deliv')}</th>
              <th className="text-right">{t('−Ret')}</th>
              <th className="text-right">{t('Closing')}</th>
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
          <div className="flex justify-between"><span>{t('Opening cash')}</span><strong>{inr(s.cash.opening)}</strong></div>
          <div className="flex justify-between"><span>{t('+ Cash collected')}</span><strong>{inr(s.cash.collected)}</strong></div>
          <div className="flex justify-between"><span>{t('− Submitted')}</span><strong>{inr(s.cash.submitted)}</strong></div>
          <div className="flex justify-between border-t pt-1"><span>{t('Closing cash (in hand)')}</span><strong>{inr(s.cash.closing)}</strong></div>
        </div>
        <p className="text-[11px] text-slate-500">{t('After closing, changes need admin approval.')}</p>
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

function OrdersTab({ orders, pendingIds, dayStarted, onOpen, onRefresh, onNew }: { orders: Order[]; pendingIds: Set<string>; dayStarted: boolean; onOpen: (o: Order) => void; onRefresh: () => Promise<void>; onNew: () => void }) {
  const { t, status } = useT();
  const groups = [
    { title: 'Sent back for correction', statuses: ['SENT_BACK'] },
    { title: 'To deliver', statuses: ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'] },
    { title: 'My orders waiting for approval', statuses: ['PENDING_APPROVAL', 'APPROVED'] },
    { title: 'Waiting for accounts', statuses: ['DELIVERED', 'PENDING_VERIFICATION'] },
    { title: 'Rejected by office', statuses: ['REJECTED'] },
  ];
  return (
    <>
      {!dayStarted && <div className="rounded-xl p-3 bg-sky-50 text-sky-800 text-xs font-bold">{t('Start your day to deliver orders.')}</div>}
      <div className="flex justify-between gap-2">
        <Button size="sm" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />{t('New order')}</Button>
        <Button tone="secondary" size="sm" onClick={() => void onRefresh()}>
          <RefreshCw className="h-3.5 w-3.5" />{t('Refresh')}</Button>
      </div>
      {groups.map((g) => {
        const list = orders.filter((o) => g.statuses.includes(o.status));
        if (!list.length) return null;
        return (
          <div key={g.title} className="space-y-2">
            <div className="text-[11px] font-black uppercase text-slate-500">{t(g.title)} ({list.length})</div>
            {list.map((o) => (
              <button key={o.id} onClick={() => onOpen(o)} className="w-full text-left rounded-2xl bg-white border border-slate-200 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 truncate">{partyLabel(o.customerShortName, o.customerName)}</span>
                    {o.priority === 'URGENT' && <Badge tone="red">{t('Urgent')}</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{o.deliveryAddress || o.area}</div>
                  <div className="text-[11px] text-slate-700 font-semibold">{o.items.map((i) => `${i.productName} × ${i.orderedQty}`).join(', ')}</div>
                  {o.status === 'REJECTED' && o.rejectionReason && <div className="text-[11px] text-rose-700 font-semibold">{t('Reason: {reason}', { reason: o.rejectionReason })}</div>}
                  <div className="mt-1 flex gap-1">
                    <StatusBadge status={o.status} label={status(o.status)} />
                    {pendingIds.has(o.id) && <Badge tone="amber">{t('Pending sync')}</Badge>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            ))}
          </div>
        );
      })}
      {orders.length === 0 && <Empty>{t('No orders assigned right now.')}</Empty>}
    </>
  );
}

interface PickCustomer { id: string; customerCode: string; name: string; shortName: string | null; phone: string; area: string | null; defaultProductIds: string[]; deliveryAddresses: { id: string; address: string; isDefault: boolean }[] }

/** Field order taken by the delivery boy; the office approves it, then it comes back to him. */
function NewOrderSheet({ onClose, onCreated, toast }: { onClose: () => void; onCreated: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
  const onError = (m: string) => toast(m, 'error');
  const products = useApiData<{ id: string; name: string }[]>('/api/products', onError).data ?? [];
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<PickCustomer[] | null>(null);
  const [customer, setCustomer] = useState<PickCustomer | null>(null);
  const [lines, setLines] = useState<{ productId: string; qty: string }[]>([{ productId: '', qty: '' }]);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Server-side customer search (debounced).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      api<PickCustomer[]>(`/api/customers?search=${encodeURIComponent(q)}`)
        .then((rows) => alive && setMatches(rows.slice(0, 10)))
        .catch(() => alive && setMatches([]));
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const pick = (c: PickCustomer) => {
    setCustomer(c);
    setQuery('');
    setMatches(null);
    const defaults = c.defaultProductIds.filter((id) => products.some((p) => p.id === id));
    setLines(defaults.length ? defaults.map((id) => ({ productId: id, qty: '' })) : [{ productId: '', qty: '' }]);
  };

  const items = lines.filter((l) => l.productId && Number(l.qty) > 0).map((l) => ({ productId: l.productId, qty: Number(l.qty) }));

  const submit = async () => {
    if (!customer || !items.length) return;
    setBusy(true);
    try {
      await api('/api/cylinder/orders', {
        body: {
          customerId: customer.id,
          items,
          requestedDeliveryDate: deliveryDate,
          priority,
          deliveryAddressId: customer.deliveryAddresses.find((a) => a.isDefault)?.id || null,
          notes: notes.trim() || null,
        },
      });
      await onCreated();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={t('New order')}
      onClose={onClose}
      footer={
        <Button className="w-full" busy={busy} disabled={!customer || !items.length} onClick={submit}>
          <Send className="h-4 w-4" />{t('Send for approval')}</Button>
      }
    >
      {!customer ? (
        <Field label={t('Customer')}>
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search name, mobile or code')} className={inputClass} />
          <div className="mt-1 space-y-1">
            {query.trim().length >= 2 && matches?.length === 0 && <div className="text-[11px] text-slate-400">{t('No customer found.')}</div>}
            {query.trim().length >= 2 &&
              matches?.map((c) => (
                <button key={c.id} onClick={() => pick(c)} className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-emerald-500 text-xs">
                  <strong>{partyLabel(c.shortName, c.name)}</strong> · {c.phone}
                  <div className="text-[10px] text-slate-400">{[c.customerCode, c.area].filter(Boolean).join(' · ')}</div>
                </button>
              ))}
          </div>
        </Field>
      ) : (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
          <div className="min-w-0">
            <div className="font-black truncate">{partyLabel(customer.shortName, customer.name)}</div>
            <div className="text-slate-500">{customer.phone}</div>
          </div>
          <Button tone="ghost" size="sm" onClick={() => setCustomer(null)}>{t('Change')}</Button>
        </div>
      )}
      {customer && (
        <>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <select value={line.productId} onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, productId: e.target.value } : l)))} className={cx(inputClass, 'col-span-7')}>
                  <option value="">{t('Product…')}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input type="number" inputMode="numeric" min={1} value={line.qty} onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l)))} placeholder={t('Qty')} className={cx(inputClass, 'col-span-4')} />
                <button onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="col-span-1 text-rose-500 disabled:opacity-30" disabled={lines.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button tone="ghost" size="sm" onClick={() => setLines([...lines, { productId: '', qty: '' }])}>
              <Plus className="h-3.5 w-3.5" />{t('Add product')}</Button>
          </div>
          <Field label={t('Delivery date')}>
            <DateInput min={today()} value={deliveryDate} onChange={setDeliveryDate} />
          </Field>
          <Field label={t('Priority')}>
            <div className="grid grid-cols-2 gap-2">
              {(['NORMAL', 'URGENT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cx('py-2 rounded-xl text-xs font-black border', priority === p ? (p === 'URGENT' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-emerald-600 border-emerald-600 text-white') : 'bg-white border-slate-300 text-slate-600')}
                >
                  {t(p === 'URGENT' ? 'Urgent' : 'Normal')}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('Note (optional)')}>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </Field>
          <p className="text-[11px] text-slate-500">{t('The office approves it, then it comes to your list to deliver.')}</p>
        </>
      )}
    </Modal>
  );
}

interface CustomerSnapshot {
  customer: { name: string; contactPerson: string | null; phone: string; address: string; balance: number; cylinderBalances: { productName: string; currentBalance: number }[] };
  deliveries: { id: string; deliveryNumber: string; deliveryDate: string; deliveredQtyTotal: number; emptyReceivedTotal: number; remarks: string | null; deliveryBoyName: string }[];
}

function OrderSheet({ order, stock, queued, dayStarted, onClose, onChanged, toast }: { order: Order; stock: StockRow[]; queued: boolean; dayStarted: boolean; onClose: () => void; onChanged: (msg?: string) => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
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
  const open = !queued && (['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(order.status) || !!sentBack);
  // Full cylinders the boy is short of for this order (delivery would be refused).
  const shortages = open
    ? order.items
        .map((i) => ({ name: i.productName, need: i.orderedQty, have: stock.find((x) => x.productId === i.productId)?.fullQty ?? 0 }))
        .filter((x) => x.have < x.need)
    : [];

  return (
    <Modal open title={`${order.orderNumber} · ${partyLabel(order.customerShortName, order.customerName)}`} onClose={onClose} wide>
      {delivering ? (
        <DeliveryForm order={order} previous={sentBack} onCancel={() => setDelivering(false)} onQueued={onChanged} toast={toast} />
      ) : (
        <div className="space-y-3 text-xs">
          {sentBack && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 font-bold">
              {t('Sent back by accounts: {reason}', { reason: sentBack.sentBackReason || '' })}
            </div>
          )}
          <div className="flex gap-2">
            <a href={`tel:${order.customerPhone}`} className="flex-1 py-2 rounded-xl bg-slate-100 font-bold flex items-center justify-center gap-1">
              <Phone className="h-4 w-4" />{t('Call')}</a>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress || '')}`} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-xl bg-slate-100 font-bold flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" />{t('Map')}</a>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 space-y-1">
            <div className="font-black">{t('Order')}</div>
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>{i.productName} × {i.orderedQty}</span>
                <span className="font-mono">{inr(i.totalAmount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1 font-black">
              <span>{t('Bill')}</span>
              <span>{inr(order.totalAmount)}</span>
            </div>
          </div>
          {snapshot && (
            <div className="rounded-xl border border-slate-200 p-3 space-y-1">
              <div className="font-black">{t('Customer history')}</div>
              <div>{t('Contact: {name} · {phone}', { name: snapshot.customer.contactPerson || '—', phone: snapshot.customer.phone })}</div>
              <div>{t('Previous dues')}: <strong>{inr(snapshot.customer.balance)}</strong></div>
              <div>{t('Cylinders with customer')}: {snapshot.customer.cylinderBalances.map((c) => `${c.productName}: ${c.currentBalance}`).join(', ') || '—'}</div>
              {snapshot.deliveries.slice(0, 3).map((d) => (
                <div key={d.id} className="text-slate-500">
                  {t('{date}: {full} full / {empty} empty by {name}', { date: d.deliveryDate, full: d.deliveredQtyTotal, empty: d.emptyReceivedTotal, name: d.deliveryBoyName })}
                  {d.remarks ? ` — “${d.remarks}”` : ''}
                </div>
              ))}
            </div>
          )}
          {open && !dayStarted && (
            <div className="p-3 rounded-xl bg-sky-50 text-sky-800 font-bold">{t('Start your day from the Today tab first — then the Enter delivery button appears here.')}</div>
          )}
          {shortages.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 font-bold space-y-1">
              <div>{t('Not enough full cylinders with you for this order:')}</div>
              {shortages.map((x) => (
                <div key={x.name} className="font-semibold">• {t('{name}: need {need}, you have {have}', { name: x.name, need: x.need, have: x.have })}</div>
              ))}
              <div className="font-semibold">{t('Take stock from the godown (Stock tab → Request stock) before entering the delivery.')}</div>
            </div>
          )}
          {queued && <div className="p-3 rounded-xl bg-amber-50 text-amber-800 font-bold">{t('This delivery is saved on the phone and will sync automatically.')}</div>}
          <div className="grid gap-2">
            {order.status === 'ASSIGNED' && (
              <Button tone="secondary" busy={busy} onClick={() => act('accept')}>
                <CheckCircle2 className="h-4 w-4" />{t('Accept order')}</Button>
            )}
            {['ASSIGNED', 'ACCEPTED'].includes(order.status) && (
              <Button tone="secondary" busy={busy} disabled={!dayStarted} onClick={() => act('dispatch')}>
                <Truck className="h-4 w-4" />{t('Out for delivery')}</Button>
            )}
            {canDeliver && (
              <Button onClick={() => setDelivering(true)}>
                <Package className="h-4 w-4" /> {t(sentBack ? 'Correct & resubmit' : 'Enter delivery')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PhotoInput({ label, file, onFile, required }: { label: string; file: Blob | null; onFile: (b: Blob | null) => void; required?: boolean }) {
  const { t } = useT();
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
        {preview ? <img src={preview} alt={label} className="h-full w-full object-cover" /> : <span className="flex items-center gap-1 text-xs font-bold text-slate-500"><Camera className="h-4 w-4" />{t('Take photo')}</span>}
      </button>
    </div>
  );
}

function DeliveryForm({ order, previous, onCancel, onQueued, toast }: { order: Order; previous?: DeliveryRow; onCancel: () => void; onQueued: (msg?: string) => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
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
      label: `${order.orderNumber} · ${partyLabel(order.customerShortName, order.customerName)}`,
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
          <div className="text-xs font-black">{l.productName} <span className="text-slate-400 font-semibold">{t('(ordered {n})', { n: l.orderedQty })}</span></div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label={t('Delivered (full)')}>
              <input type="number" inputMode="numeric" min={0} value={l.delivered} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, delivered: e.target.value } : x)))} className={inputClass} />
            </Field>
            <Field label={t('Empty received')}>
              <input type="number" inputMode="numeric" min={0} value={l.empty} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, empty: e.target.value } : x)))} className={inputClass} />
            </Field>
          </div>
          {(Number(l.delivered) !== l.orderedQty || Number(l.empty) !== Number(l.delivered)) && (
            <div className="text-[10px] font-bold text-amber-700 mt-1">{t('Difference will be flagged for accounts.')}</div>
          )}
        </div>
      ))}
      <div className="text-right text-sm font-black">{t('Bill')}: {inr(bill)}</div>
      <div className="grid grid-cols-4 gap-1">
        {(['CASH', 'ONLINE', 'CHEQUE', 'CREDIT'] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); if (m === 'CREDIT') setAmount('0'); else if (Number(amount) === 0) setAmount(String(bill)); }} className={cx('py-2 rounded-xl text-[11px] font-black', mode === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600')}>
            {t(m)}
          </button>
        ))}
      </div>
      {mode !== 'CREDIT' && (
        <Field label={t('Amount collected (₹)')}>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
      )}
      {mode === 'ONLINE' && (
        <>
          <Field label={t('Transaction ID / UTR')}>
            <input value={txn} onChange={(e) => setTxn(e.target.value)} className={inputClass} />
          </Field>
          <PhotoInput label={t('Payment screenshot')} file={payProof} onFile={setPayProof} required />
        </>
      )}
      {mode === 'CHEQUE' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('Cheque no.')}><input value={cheque.number} onChange={(e) => setCheque({ ...cheque, number: e.target.value })} className={inputClass} /></Field>
          </div>
          <Field label={t('Cheque date')}><DateInput value={cheque.date} onChange={(date) => setCheque({ ...cheque, date })} /></Field>
          <Field label={t('Bank')}><input value={cheque.bank} onChange={(e) => setCheque({ ...cheque, bank: e.target.value })} className={inputClass} /></Field>
          <PhotoInput label={t('Cheque photo')} file={chequePhoto} onFile={setChequePhoto} required />
        </>
      )}
      <PhotoInput label={t('Delivery proof')} file={proof} onFile={setProof} required />
      <Field label={t('Remarks')}>
        <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} placeholder={t('e.g. gate 2, call before delivery')} />
      </Field>
      <div className="flex gap-2">
        <Button tone="secondary" className="flex-1" onClick={onCancel}>{t('Back')}</Button>
        <Button className="flex-1" busy={busy} onClick={submit}>
          <Send className="h-4 w-4" />{t('Submit delivery')}</Button>
      </div>
    </div>
  );
}

// ───────────────────────── Wallet ─────────────────────────

function WalletTab({ toast }: { toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t, status } = useT();
  const [amount, setAmount] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const onError = (m: string) => toast(m, 'error');
  const walletQ = useApiData<WalletInfo>('/api/financial/wallets', onError);
  const submissionsQ = useApiData<{ id: string; submissionNumber: string; amount: number; receiverName: string; status: string; rejectionReason: string | null; createdAt: string }[]>('/api/financial/cash-submission', onError);
  const info = walletQ.data ?? null;
  const submissions = submissionsQ.data ?? [];
  const load = async () => {
    walletQ.reload();
    submissionsQ.reload();
  };

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

  if (!info) return <Empty>{t('Loading…')}</Empty>;
  return (
    <>
      <div className="rounded-2xl p-4 bg-slate-900 text-white">
        <div className="text-[11px] font-bold uppercase opacity-70">{t('Cash in hand')}</div>
        <div className="text-2xl font-black flex items-center gap-1"><IndianRupee className="h-5 w-5" />{info.wallet.balance.toLocaleString('en-IN')}</div>
        <div className="text-[11px] opacity-70">{t('Pending submission {pending} · can submit {available}', { pending: inr(info.pending), available: inr(info.available) })}</div>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-3">
        <div className="text-xs font-black">{t('Submit cash')}</div>
        <Field label={t('Handing over to')}>
          <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className={inputClass}>
            <option value="">{t('Select…')}</option>
            {info.receivers.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({t(ROLE_LABELS[r.role as Role] || r.role)})</option>
            ))}
          </select>
        </Field>
        <Field label={t('Amount (₹)')}>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <PhotoInput label={t('Proof photo (optional)')} file={photo} onFile={setPhoto} />
        <Button className="w-full" busy={busy} disabled={!receiverId || !(Number(amount) > 0)} onClick={submit}>
          <Send className="h-4 w-4" />{t('Submit')}</Button>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
        <div className="text-xs font-black mb-1">{t('My submissions')}</div>
        {submissions.length === 0 && <div className="text-[11px] text-slate-400">{t('None yet.')}</div>}
        {submissions.map((s) => (
          <div key={s.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
            <span>{s.submissionNumber} → {s.receiverName}<div className="text-[10px] text-slate-400">{dateTime(s.createdAt)}{s.rejectionReason ? ` · ${s.rejectionReason}` : ''}</div></span>
            <span className="text-right"><strong>{inr(s.amount)}</strong><div><StatusBadge status={s.status} label={status(s.status)} /></div></span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
        <div className="text-xs font-black mb-1">{t('Wallet history')}</div>
        {info.transactions.map((tx) => (
          <div key={tx.id} className="flex justify-between text-xs py-1 border-b border-slate-50">
            <span>{t(tx.notes || tx.type)}<div className="text-[10px] text-slate-400">{dateTime(tx.createdAt)}</div></span>
            <span className={cx('font-mono font-bold', tx.amount < 0 ? 'text-rose-600' : 'text-emerald-700')}>{tx.amount > 0 ? '+' : ''}{inr(tx.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ───────────────────────── Stock & requests ─────────────────────────

function StockTab({ userId, stock, onChanged, toast }: { userId: string; stock: StockRow[]; onChanged: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t, status } = useT();
  const [form, setForm] = useState<{ kind: 'ISSUE' | 'RETURN'; warehouseId: string; productId: string; full: string; empty: string } | null>(null);
  const [fieldRequest, setFieldRequest] = useState<{ kind: string; note: string; qty: string; amount: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const onError = (m: string) => toast(m, 'error');
  const products = useApiData<{ id: string; name: string }[]>('/api/products', onError).data ?? [];
  const warehouses = useApiData<{ id: string; name: string }[]>('/api/cylinder/warehouses', onError).data ?? [];
  const transfersQ = useApiData<TransferRow[]>('/api/cylinder/transfers', onError);
  const requestsQ = useApiData<{ id: string; title: string; status: string; decisionNote: string | null; createdAt: string }[]>('/api/requests', onError);
  const transfers = transfersQ.data ?? [];
  const requests = requestsQ.data ?? [];
  const load = async () => {
    transfersQ.reload();
    requestsQ.reload();
  };

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
        <div className="text-xs font-black mb-2">{t('Stock with me')}</div>
        {stock.length === 0 && <div className="text-[11px] text-slate-400">{t('No stock.')}</div>}
        {stock.map((s) => (
          <div key={s.productId} className="flex justify-between text-xs py-1 border-b border-slate-50">
            <span className="font-semibold">{s.productName}</span>
            <span><strong>{s.fullQty}</strong> {t('full')} · {s.emptyQty} {t('empty')}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setForm({ kind: 'ISSUE', warehouseId: warehouses[0]?.id || '', productId: products[0]?.id || '', full: '', empty: '' })}>{t('Request stock')}</Button>
        <Button tone="secondary" onClick={() => setForm({ kind: 'RETURN', warehouseId: warehouses[0]?.id || '', productId: products[0]?.id || '', full: '', empty: '' })}>{t('Return to godown')}</Button>
        <Button tone="secondary" className="col-span-2" onClick={() => setFieldRequest({ kind: 'EXTRA_CYLINDERS', note: '', qty: '', amount: '' })}>{t('Other request (advance, vehicle…)')}</Button>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3">
        <div className="text-xs font-black mb-2">{t('My stock requests')}</div>
        {transfers.length === 0 ? (
          <div className="text-[11px] text-slate-400">{t('None.')}</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-200">
                <th className="text-left font-bold py-1">{t('Cylinder')}</th>
                <th className="text-right font-bold py-1 w-12">{t('Full')}</th>
                <th className="text-right font-bold py-1 w-12">{t('Empty')}</th>
              </tr>
            </thead>
            {transfers.map((tr) => {
              const note = tr.decisionNote || tr.notes;
              return (
                <tbody key={tr.id} className="border-b-4 border-slate-100 last:border-b-0">
                  <tr>
                    <td colSpan={3} className="pt-2 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-black text-slate-900">{tr.transferNumber} <span className="font-semibold text-slate-400">· {dateTime(tr.createdAt)}</span></div>
                          <div className="text-slate-600 truncate">{tr.fromName} → {tr.toName}</div>
                        </div>
                        <StatusBadge status={tr.status === 'PENDING_APPROVAL' ? 'PENDING' : tr.status} label={status(tr.status)} />
                      </div>
                    </td>
                  </tr>
                  {tr.items.map((i) => (
                    <tr key={i.productName} className="border-t border-slate-50">
                      <td className="py-1 text-slate-700">{i.productName}</td>
                      <td className="py-1 text-right font-black">{i.fullQty}</td>
                      <td className="py-1 text-right font-black">{i.emptyQty}</td>
                    </tr>
                  ))}
                  {(note || tr.decidedBy || tr.edits.length > 0) && (
                    <tr>
                      <td colSpan={3} className="pb-2">
                        <div className={cx('mt-1 rounded-lg px-2 py-1.5 space-y-0.5', tr.status === 'REJECTED' ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-700')}>
                          {tr.notes && <div><strong>{t('My note')}:</strong> {tr.notes}</div>}
                          {tr.edits.map((e, idx) => (
                            <div key={idx}><strong>{t('Changed by {name}', { name: e.actorName })}:</strong> {e.note}</div>
                          ))}
                          {tr.decidedBy && tr.status !== 'PENDING_APPROVAL' && (
                            <div>
                              <strong>{t(tr.status === 'REJECTED' ? 'Rejected by {name}' : 'Approved by {name}', { name: tr.decidedBy })}</strong>
                              {tr.decidedAt && <span className="text-[10px] opacity-70"> · {dateTime(tr.decidedAt)}</span>}
                              {tr.decisionNote && <div>{t('Note')}: {tr.decisionNote}</div>}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        )}
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3">
        <div className="text-xs font-black mb-2">{t('My requests')}</div>
        {requests.length === 0 ? (
          <div className="text-[11px] text-slate-400">{t('None.')}</div>
        ) : (
          <table className="w-full text-[11px]">
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 first:border-t-0 align-top">
                  <td className="py-1.5">
                    <div className="font-bold text-slate-900">{r.title}</div>
                    <div className="text-[10px] text-slate-400">{dateTime(r.createdAt)}</div>
                    {r.decisionNote && <div className={cx('mt-1 rounded-lg px-2 py-1', r.status === 'REJECTED' ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-700')}><strong>{t('Note')}:</strong> {r.decisionNote}</div>}
                  </td>
                  <td className="py-1.5 text-right w-24">
                    <StatusBadge status={r.status} label={status(r.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!form} title={t(form?.kind === 'ISSUE' ? 'Request stock from godown' : 'Return stock to godown')} onClose={() => setForm(null)} footer={<Button busy={busy} onClick={submitTransfer}>{t('Send for approval')}</Button>}>
        {form && (
          <>
            <Field label={t('Godown')}>
              <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} className={inputClass}>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Field label={t('Product')}>
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={inputClass}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('Full')}><input type="number" min={0} value={form.full} onChange={(e) => setForm({ ...form, full: e.target.value })} className={inputClass} /></Field>
              <Field label={t('Empty')}><input type="number" min={0} value={form.empty} onChange={(e) => setForm({ ...form, empty: e.target.value })} className={inputClass} /></Field>
            </div>
          </>
        )}
      </Modal>

      <Modal open={!!fieldRequest} title={t('Request to manager')} onClose={() => setFieldRequest(null)} footer={<Button busy={busy} disabled={!fieldRequest?.note.trim()} onClick={submitFieldRequest}>{t('Send')}</Button>}>
        {fieldRequest && (
          <>
            <Field label={t('Type')}>
              <select value={fieldRequest.kind} onChange={(e) => setFieldRequest({ ...fieldRequest, kind: e.target.value })} className={inputClass}>
                <option value="EXTRA_CYLINDERS">{t('Extra cylinders')}</option>
                <option value="CASH_ADVANCE">{t('Cash advance')}</option>
                <option value="VEHICLE_ISSUE">{t('Vehicle issue')}</option>
                <option value="OTHER">{t('Other')}</option>
              </select>
            </Field>
            <Field label={t('Details')}><textarea rows={3} value={fieldRequest.note} onChange={(e) => setFieldRequest({ ...fieldRequest, note: e.target.value })} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('Qty')}><input type="number" value={fieldRequest.qty} onChange={(e) => setFieldRequest({ ...fieldRequest, qty: e.target.value })} className={inputClass} /></Field>
              <Field label={t('Amount ₹')}><input type="number" value={fieldRequest.amount} onChange={(e) => setFieldRequest({ ...fieldRequest, amount: e.target.value })} className={inputClass} /></Field>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
