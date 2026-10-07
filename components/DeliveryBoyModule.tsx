'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Camera,
  Clock,
  FileText,
  HandCoins,
  Smartphone,
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
  Truck,
  UploadCloud,
  Wallet,
  Warehouse,
  Wifi,
  WifiOff,
  XCircle,
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
import { cue } from '../lib/feedback';
import { AmountPad, ChoiceTiles, PickerField, PosButton, PosTotal, RecentChips, SearchPick, SoundToggle, Stepper, StockTile, useRecent } from './pos';
import { CartProduct, OrderTiles, useOrderCart } from './OrderCart';

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
  // Old dues collected on payment-only visits (already inside the cash figures).
  collections?: { count: number; amount: number };
  // Day-end: stock still to send to the godown, and returns waiting for the admin.
  stockReturn?: {
    toReturn: { productId: string; productName: string; fullQty: number; emptyQty: number }[];
    pending: { transferNumber: string; toName: string; items: { productName: string; fullQty: number; emptyQty: number }[] }[];
  };
}
interface WalletInfo {
  wallet: { balance: number };
  pending: number;
  available: number;
  transactions: { id: string; type: string; amount: number; balanceAfter: number; notes: string | null; createdAt: string }[];
  receivers: { id: string; name: string; role: string }[];
}

type Tab = 'home' | 'orders' | 'collect' | 'wallet' | 'stock';
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
  const [summaryError, setSummaryError] = useState<string | null>(null);
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
    // Each part loads on its own, so one failing call doesn't blank the whole app.
    Promise.allSettled([api<DaySummary>('/api/delivery/day-log'), api<Order[]>('/api/cylinder/orders'), api<{ stock: StockRow[] }>('/api/cylinder/inventory')])
      .then(([day, list, inv]) => {
        if (!alive) return;
        if (day.status === 'fulfilled') {
          setSummary(day.value);
          setSummaryError(null);
        } else setSummaryError(errorMessage(day.reason));
        if (list.status === 'fulfilled') {
          setOrders(list.value);
          try {
            window.localStorage.setItem(ORDERS_CACHE, JSON.stringify(list.value));
          } catch {
            /* storage full */
          }
        } else {
          try {
            const cached = window.localStorage.getItem(ORDERS_CACHE);
            if (cached) setOrders(JSON.parse(cached));
          } catch {
            /* storage blocked */
          }
        }
        if (inv.status === 'fulfilled') setStock(inv.value.stock);
        const failed = [day, list, inv].find((r) => r.status === 'rejected');
        if (failed && navigator.onLine) showToast(errorMessage(failed.reason), 'error');
      })
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
    <div className="min-h-dvh w-full bg-slate-100 flex flex-col max-w-lg mx-auto overflow-x-hidden">
      {toast}
      <header className="sticky top-0 z-30 bg-slate-900 text-white pl-3 pr-1.5 pb-2.5 pt-[max(env(safe-area-inset-top),10px)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black truncate">{session?.user.name || t('Delivery')}</div>
          <div className="text-[10px] text-emerald-300 font-semibold truncate">{session?.company.name}</div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Narrow phones: just the coloured wifi dot; the word shows from 420px up. */}
          <span title={online ? t('Online') : t('Offline')} className={cx('flex items-center gap-1 p-1.5 min-[420px]:px-2 min-[420px]:py-1 rounded-full text-[10px] font-black', online ? 'bg-emerald-600' : 'bg-rose-600')}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="hidden min-[420px]:inline">{online ? t('Online') : t('Offline')}</span>
          </span>
          <LanguageToggle />
          <SoundToggle className="hover:bg-slate-800" />
          <NotificationBell tone="dark" />
          <button onClick={() => void logout()} className="p-2 rounded-full hover:bg-slate-800" title={t('Logout')} aria-label={t('Logout')}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] space-y-3">
        {tab === 'home' && (
          <HomeTab
            summary={summary}
            error={summaryError}
            orders={orders}
            pendingIds={pendingIds}
            onOpen={setOpenOrder}
            onNew={() => setCreating(true)}
            onGo={setTab}
            queue={queue}
            syncing={syncing}
            onSync={runSync}
            onChanged={refresh}
            toast={showToast}
          />
        )}
        {tab === 'orders' && (
          <OrdersTab orders={orders} pendingIds={pendingIds} dayStarted={summary?.status === 'STARTED'} onOpen={setOpenOrder} onRefresh={refresh} onNew={() => setCreating(true)} toast={showToast} />
        )}
        {tab === 'collect' && <CollectTab dayStarted={summary?.status === 'STARTED'} onChanged={refresh} toast={showToast} />}
        {tab === 'wallet' && <WalletTab toast={showToast} />}
        {tab === 'stock' && <StockTab userId={session?.user.id || ''} stock={stock} onChanged={refresh} toast={showToast} />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-slate-200 grid grid-cols-5 z-30 pb-[env(safe-area-inset-bottom)]">
        {([
          ['home', Home, 'Today'],
          ['orders', Truck, 'Orders'],
          ['collect', HandCoins, 'Collect'],
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
          stock={stock}
          onClose={() => setCreating(false)}
          onCreated={async (keepOpen) => {
            showToast('Order sent to the office for approval.');
            if (!keepOpen) setCreating(false);
            await refresh();
          }}
          toast={showToast}
        />
      )}
    </div>
  );
}

// ───────────────────────── Home ─────────────────────────

function HomeTab({ summary, error, orders, pendingIds, onOpen, onNew, onGo, queue, syncing, onSync, onChanged, toast }: { summary: DaySummary | null; error: string | null; orders: Order[]; pendingIds: Set<string>; onOpen: (o: Order) => void; onNew: () => void; onGo: (tab: Tab) => void; queue: QueuedEntry[]; syncing: boolean; onSync: () => void; onChanged: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
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

  const returnStock = async () => {
    setBusy(true);
    try {
      await api('/api/delivery/day-log', { body: { action: 'RETURN_STOCK' } });
      toast('Stock return sent — the admin accepts it into the godown.');
      await onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!summary && error) {
    return (
      <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold space-y-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t('Could not load today’s summary.')} {t(error)}</span>
        </div>
        <Button size="sm" className="w-full" onClick={() => void onChanged()}>
          <RefreshCw className="h-3.5 w-3.5" />{t('Try again')}</Button>
      </div>
    );
  }
  if (!summary) return <Empty>{t('Loading…')}</Empty>;
  const s = summary;
  // Cash still to hand over; the day cannot be closed until it is submitted.
  const cashToSubmit = Math.max(0, Math.round((s.cash.closing - s.cash.pendingSubmission) * 100) / 100);
  // Stock likewise goes back to the godown; it stays with him until the admin accepts the return.
  const toReturn = s.stockReturn?.toReturn ?? [];
  const pendingReturns = s.stockReturn?.pending ?? [];
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

      {/* Quick actions: everything the day needs, one tap from Today. */}
      <div className="grid grid-cols-4 gap-2">
        {([
          [Plus, 'New order', onNew, 'bg-emerald-600 text-white'],
          [HandCoins, 'Collect', () => onGo('collect'), 'bg-white text-emerald-700'],
          [Wallet, 'Submit cash', () => onGo('wallet'), 'bg-white text-sky-700'],
          [Package, 'Stock', () => onGo('stock'), 'bg-white text-violet-700'],
        ] as const).map(([Icon, label, onClick, tone]) => (
          <button key={label} type="button" onClick={onClick} className={cx('rounded-2xl border border-slate-200 py-3 px-1 flex flex-col items-center gap-1 text-[11px] font-black leading-tight text-center active:scale-95 transition', tone)}>
            <Icon className="h-5 w-5" />
            {t(label)}
          </button>
        ))}
      </div>

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

      {s.status !== 'CLOSED' && <TodayOrders orders={orders} pendingIds={pendingIds} onOpen={onOpen} onSeeAll={() => onGo('orders')} onRefresh={onChanged} toast={toast} />}

      <div className="grid grid-cols-2 gap-2">
        <Tile label={t('Deliveries')} value={s.deliveries.count} sub={t('{n} awaiting accounts', { n: s.deliveries.pendingVerification })} />
        <Tile label={t('Cylinders delivered')} value={s.deliveries.cylindersDelivered} sub={t('{n} empties collected', { n: s.deliveries.emptiesCollected })} />
        <Tile label={t('Cash in hand')} value={inr(s.cash.closing)} sub={t('{amount} pending submission', { amount: inr(s.cash.pendingSubmission) })} />
        <Tile label={t('Online / cheque')} value={inr(s.cash.online + s.cash.cheque)} sub={t('Credit given {amount}', { amount: inr(s.cash.credit) })} />
      </div>
      {s.collections && s.collections.count > 0 && (
        <div className="rounded-xl p-3 bg-white border border-slate-200 text-xs flex justify-between">
          <span className="font-bold text-slate-600 flex items-center gap-2"><HandCoins className="h-4 w-4 text-emerald-600" />{t('Dues collected today ({n})', { n: s.collections.count })}</span>
          <strong>{inr(s.collections.amount)}</strong>
        </div>
      )}
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
            <Button tone="danger" busy={busy} disabled={cashToSubmit > 0 || toReturn.length > 0} onClick={closeDay}>{t('Close & lock day')}</Button>
          </>
        }
      >
        {cashToSubmit > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold space-y-2">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('Submit your cash in hand ({amount}) before closing the day.', { amount: inr(cashToSubmit) })}
            </div>
            <Button size="sm" className="w-full" onClick={() => { setConfirmClose(false); onGo('wallet'); }}>
              <Wallet className="h-3.5 w-3.5" />{t('Go to Cash — submit now')}</Button>
          </div>
        )}
        {toReturn.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold space-y-2">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('Send your stock back to the godown before closing the day.')}
            </div>
            {toReturn.map((r) => (
              <div key={r.productId} className="flex justify-between font-semibold">
                <span>{r.productName}</span>
                <span>{r.fullQty} {t('full')} · {r.emptyQty} {t('empty')}</span>
              </div>
            ))}
            <Button size="sm" className="w-full" busy={busy} onClick={returnStock}>
              <Truck className="h-3.5 w-3.5" />{t('Send all to godown')}</Button>
          </div>
        )}
        {pendingReturns.length > 0 && (
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs space-y-1">
            <div className="font-bold">{t('Waiting for the admin to accept')}</div>
            {pendingReturns.map((p) => (
              <div key={p.transferNumber}>
                <strong>{p.transferNumber}</strong> → {p.toName}: {p.items.map((i) => `${i.productName} ${i.fullQty}/${i.emptyQty}`).join(', ')}
              </div>
            ))}
            <div className="text-[10px] text-sky-700">{t('Stock stays in your name until accepted (full/empty).')}</div>
          </div>
        )}
        <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[300px] text-xs tabular-nums">
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
        </div>
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
    <div className="text-base font-bold text-slate-900">{value}</div>
    {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
  </div>
);

// ───────────────────────── Orders ─────────────────────────

const DECLINE_REASONS = ['No stock with me', 'Too far / not on my route', 'Vehicle problem', 'Shop closed / customer not available'];

/** Accept / decline straight from a list (Orders and Today), with the decline-reason popup. */
function useOrderActions(onRefresh: () => Promise<void>, toast: (m: string, t?: 'ok' | 'error') => void) {
  const { t } = useT();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declining, setDeclining] = useState<Order | null>(null);
  const [reason, setReason] = useState('');

  const act = async (o: Order, action: 'accept' | 'decline', why?: string) => {
    setBusyId(o.id);
    try {
      await api(`/api/cylinder/orders/${o.id}`, { body: { action, reason: why } });
      cue(action === 'decline' ? 'remove' : 'success');
      toast(action === 'accept' ? 'Order accepted.' : 'Order declined — sent back to the office.');
      await onRefresh();
      return true;
    } catch (e) {
      cue('error');
      toast(errorMessage(e), 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  };
  const decline = async () => {
    if (!declining || !reason.trim()) return;
    if (await act(declining, 'decline', reason.trim())) {
      setDeclining(null);
      setReason('');
    }
  };

  const declineModal = (
    <Modal
      open={!!declining}
      title={t('Decline order')}
      onClose={() => setDeclining(null)}
      footer={
        <>
          <Button tone="secondary" onClick={() => setDeclining(null)}>{t('Back')}</Button>
          <Button tone="danger" busy={!!declining && busyId === declining.id} disabled={!reason.trim()} onClick={() => void decline()}>{t('Decline & send back')}</Button>
        </>
      }
    >
      {declining && (
        <>
          <div className="text-sm font-black">{declining.orderNumber} · {partyLabel(declining.customerShortName, declining.customerName)}</div>
          <div className="grid gap-2">
            {DECLINE_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => { cue('tap'); setReason(t(r)); }} className={cx('text-left px-3 py-2.5 rounded-xl border-2 text-sm font-bold', reason === t(r) ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-700')}>
                {t(r)}
              </button>
            ))}
          </div>
          <Field label={t('Or write the reason')}>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
          </Field>
          <p className="text-[11px] text-slate-500">{t('The order goes back to the office to give to another delivery boy.')}</p>
        </>
      )}
    </Modal>
  );

  return {
    busyId,
    setBusyId,
    accept: (o: Order) => void act(o, 'accept'),
    startDecline: (o: Order) => {
      setReason('');
      setDeclining(o);
    },
    declineModal,
  };
}

function OrderCard({ order: o, queued, busy, onOpen, onAccept, onDecline }: { order: Order; queued: boolean; busy: boolean; onOpen: (o: Order) => void; onAccept: (o: Order) => void; onDecline: (o: Order) => void }) {
  const { t, status } = useT();
  return (
    <div className={cx('rounded-2xl bg-white border overflow-hidden', o.status === 'ASSIGNED' ? 'border-sky-300' : 'border-slate-200')}>
      <button onClick={() => onOpen(o)} className="w-full text-left p-3 flex items-center gap-3 active:bg-slate-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 truncate">{partyLabel(o.customerShortName, o.customerName)}</span>
            {o.priority === 'URGENT' && <Badge tone="red">{t('Urgent')}</Badge>}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{o.deliveryAddress || o.area}</div>
          <div className="text-[11px] text-slate-700 font-semibold">{o.items.map((i) => `${i.productName} × ${i.orderedQty}`).join(', ')}</div>
          {o.status === 'REJECTED' && o.rejectionReason && <div className="text-[11px] text-rose-700 font-semibold">{t('Reason: {reason}', { reason: o.rejectionReason })}</div>}
          <div className="mt-1 flex flex-wrap gap-1">
            <StatusBadge status={o.status} label={status(o.status)} />
            {queued && <Badge tone="amber">{t('Pending sync')}</Badge>}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </button>
      {!queued && o.status === 'ASSIGNED' && (
        <div className="flex justify-end gap-2 px-3 pb-2.5 -mt-1">
          <button disabled={busy} onClick={() => onDecline(o)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-black text-rose-700 active:scale-95 disabled:opacity-50">
            <XCircle className="h-3.5 w-3.5" />{t('Decline')}
          </button>
          <button disabled={busy} onClick={() => onAccept(o)} className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 text-xs font-black text-white active:scale-95 disabled:opacity-50">
            <CheckCircle2 className="h-3.5 w-3.5" />{t('Accept')}
          </button>
        </div>
      )}
    </div>
  );
}

const TO_DELIVER = ['SENT_BACK', 'ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'];

/** Today screen: the orders to deliver, with quick filters, so the day runs from one place. */
function TodayOrders({ orders, pendingIds, onOpen, onSeeAll, onRefresh, toast }: { orders: Order[]; pendingIds: Set<string>; onOpen: (o: Order) => void; onSeeAll: () => void; onRefresh: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
  const { busyId, accept, startDecline, declineModal } = useOrderActions(onRefresh, toast);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'today' | 'all' | 'new' | 'urgent'>('today');
  const day = today();
  const open = orders.filter((o) => TO_DELIVER.includes(o.status));
  // Due today or overdue; sent-back entries always need attention.
  const isToday = (o: Order) => o.status === 'SENT_BACK' || (o.requestedDeliveryDate || day) <= day;
  const views = [
    { key: 'today', label: 'Today', list: open.filter(isToday) },
    { key: 'new', label: 'New', list: open.filter((o) => o.status === 'ASSIGNED') },
    { key: 'urgent', label: 'Urgent', list: open.filter((o) => o.priority === 'URGENT') },
    { key: 'all', label: 'All to deliver', list: open },
  ] as const;
  const q = query.trim().toLowerCase();
  const list = (views.find((v) => v.key === view)?.list ?? open)
    .filter((o) => !q || [o.orderNumber, o.customerName, o.customerShortName, o.customerPhone, o.deliveryAddress, o.area].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
    // Sent back first, then urgent, then new.
    .sort((a, b) => Number(b.status === 'SENT_BACK') - Number(a.status === 'SENT_BACK') || Number(b.priority === 'URGENT') - Number(a.priority === 'URGENT') || Number(b.status === 'ASSIGNED') - Number(a.status === 'ASSIGNED'));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black text-slate-900 flex items-center gap-2">
          <Truck className="h-4 w-4 text-emerald-600" />{t('Orders to deliver ({n})', { n: open.length })}
        </div>
        <button type="button" onClick={onSeeAll} className="flex items-center gap-0.5 text-[11px] font-black text-emerald-700">
          {t('All orders')} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {open.length > 0 && (
        <>
          <div className="-mx-3 px-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            {views.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={cx(
                  'shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-black whitespace-nowrap active:scale-95',
                  view === v.key ? (v.key === 'urgent' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-emerald-600 border-emerald-600 text-white') : 'bg-white border-slate-200 text-slate-600'
                )}
              >
                {t(v.label)} ({v.list.length})
              </button>
            ))}
          </div>
          {open.length > 3 && <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search customer, area or order no.')} className={inputClass} />}
        </>
      )}
      {list.map((o) => (
        <OrderCard key={o.id} order={o} queued={pendingIds.has(o.id)} busy={busyId === o.id} onOpen={onOpen} onAccept={accept} onDecline={startDecline} />
      ))}
      {list.length === 0 && <div className="rounded-2xl bg-white border border-dashed border-slate-300 py-6 text-center text-[11px] font-semibold text-slate-400">{t(open.length ? 'No orders here.' : 'No orders to deliver right now.')}</div>}
      {declineModal}
    </div>
  );
}

function OrdersTab({ orders, pendingIds, dayStarted, onOpen, onRefresh, onNew, toast }: { orders: Order[]; pendingIds: Set<string>; dayStarted: boolean; onOpen: (o: Order) => void; onRefresh: () => Promise<void>; onNew: () => void; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
  const groups = [
    { title: 'Sent back for correction', statuses: ['SENT_BACK'] },
    { title: 'To deliver', statuses: ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'] },
    { title: 'My orders waiting for approval', statuses: ['PENDING_APPROVAL', 'APPROVED'] },
    { title: 'Waiting for accounts', statuses: ['DELIVERED', 'PENDING_VERIFICATION'] },
    { title: 'Rejected by office', statuses: ['REJECTED'] },
  ];
  const newlyAssigned = orders.filter((o) => o.status === 'ASSIGNED' && !pendingIds.has(o.id));

  // Filters: search text, one status group (or all), urgent only.
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const q = query.trim().toLowerCase();
  const filtered = orders.filter(
    (o) =>
      (!urgentOnly || o.priority === 'URGENT') &&
      (!q ||
        [o.orderNumber, o.customerName, o.customerShortName, o.customerPhone, o.deliveryAddress, o.area, ...o.items.map((i) => i.productName)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)))
  );
  const shownGroups = groups.filter((g) => group === 'all' || g.title === group);
  const filtering = !!q || urgentOnly || group !== 'all';
  const chip = (on: boolean) => cx('shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-black whitespace-nowrap active:scale-95', on ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600');

  const { busyId, setBusyId, accept, startDecline, declineModal } = useOrderActions(onRefresh, toast);
  const acceptAll = async () => {
    setBusyId('all');
    let done = 0;
    for (const o of newlyAssigned) {
      try {
        await api(`/api/cylinder/orders/${o.id}`, { body: { action: 'accept' } });
        done++;
      } catch {
        /* reported below */
      }
    }
    setBusyId(null);
    cue(done === newlyAssigned.length ? 'success' : 'error');
    toast(t('{n} order(s) accepted.', { n: done }), done === newlyAssigned.length ? 'ok' : 'error');
    await onRefresh();
  };
  return (
    <>
      {!dayStarted && <div className="rounded-xl p-3 bg-sky-50 text-sky-800 text-xs font-bold">{t('Start your day to deliver orders.')}</div>}
      <div className="flex justify-between gap-2">
        <Button size="sm" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />{t('New order')}</Button>
        <div className="flex gap-2">
          {newlyAssigned.length > 1 && (
            <Button size="sm" tone="secondary" busy={busyId === 'all'} onClick={() => void acceptAll()}>
              <CheckCircle2 className="h-3.5 w-3.5" />{t('Accept all ({n})', { n: newlyAssigned.length })}</Button>
          )}
          <Button tone="secondary" size="sm" onClick={() => void onRefresh()}>
            <RefreshCw className="h-3.5 w-3.5" />{t('Refresh')}</Button>
        </div>
      </div>
      {orders.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search customer, area, order no. or cylinder')} className={cx(inputClass, 'pr-9')} />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label={t('Clear')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="-mx-3 px-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            <button type="button" onClick={() => setGroup('all')} className={chip(group === 'all')}>
              {t('All')} ({filtered.length})
            </button>
            {groups.map((g) => {
              const n = filtered.filter((o) => g.statuses.includes(o.status)).length;
              if (!n && group !== g.title) return null;
              return (
                <button key={g.title} type="button" onClick={() => setGroup(group === g.title ? 'all' : g.title)} className={chip(group === g.title)}>
                  {t(g.title)} ({n})
                </button>
              );
            })}
            <button type="button" onClick={() => setUrgentOnly(!urgentOnly)} className={cx(chip(urgentOnly), urgentOnly && 'bg-rose-600 border-rose-600')}>
              {t('Urgent')}
            </button>
          </div>
        </div>
      )}
      {filtering && orders.length > 0 && shownGroups.every((g) => !filtered.some((o) => g.statuses.includes(o.status))) && (
        <Empty>
          {t('No orders match these filters.')}{' '}
          <button type="button" className="font-black text-emerald-700" onClick={() => { setQuery(''); setGroup('all'); setUrgentOnly(false); }}>{t('Clear filters')}</button>
        </Empty>
      )}
      {shownGroups.map((g) => {
        const list = filtered.filter((o) => g.statuses.includes(o.status));
        if (!list.length) return null;
        return (
          <div key={g.title} className="space-y-2">
            <div className="text-[11px] font-black uppercase text-slate-500">{t(g.title)} ({list.length})</div>
            {list.map((o) => (
              <OrderCard key={o.id} order={o} queued={pendingIds.has(o.id)} busy={busyId === o.id || busyId === 'all'} onOpen={onOpen} onAccept={accept} onDecline={startDecline} />
            ))}
          </div>
        );
      })}
      {orders.length === 0 && <Empty>{t('No orders assigned right now.')}</Empty>}

      {declineModal}
    </>
  );
}

interface PickCustomer { id: string; customerCode: string; name: string; shortName: string | null; phone: string; address?: string | null; area: string | null; defaultProductIds: string[]; deliveryAddresses: { id: string; address: string; isDefault: boolean }[] }

/** Field order taken by the delivery boy; the office approves it, then it comes back to him. */
function NewOrderSheet({ stock, onClose, onCreated, toast }: { stock: StockRow[]; onClose: () => void; onCreated: (keepOpen: boolean) => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
  const onError = (m: string) => toast(m, 'error');
  const products = useApiData<CartProduct[]>('/api/products', onError).data ?? [];
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<PickCustomer[] | null>(null);
  const [customer, setCustomer] = useState<PickCustomer | null>(null);
  const [recent, pushRecent] = useRecent('order-customers');
  const [more, setMore] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const cart = useOrderCart(products, customer?.id ?? null, customer?.defaultProductIds ?? []);

  // Customer list: everyone as soon as the sheet opens, then a server search as you type (debounced).
  useEffect(() => {
    if (customer) return;
    const q = query.trim();
    let alive = true;
    const timer = window.setTimeout(() => {
      api<PickCustomer[]>(`/api/customers${q ? `?search=${encodeURIComponent(q)}` : ''}`)
        .then((rows) => alive && setMatches(rows))
        .catch(() => alive && setMatches([]));
    }, q ? 250 : 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, customer]);

  const pick = (c: PickCustomer) => {
    cue('tap');
    setCustomer(c);
    setQuery('');
    pushRecent({ id: c.id, label: partyLabel(c.shortName, c.name), sub: c.phone });
  };
  /** Recent chip → the full customer record (from the list on screen, else a search by mobile). */
  const pickRecent = async (id: string) => {
    const known = matches?.find((c) => c.id === id);
    if (known) return pick(known);
    try {
      const rows = await api<PickCustomer[]>(`/api/customers?search=${encodeURIComponent(recent.find((r) => r.id === id)?.sub || '')}`);
      const hit = rows.find((c) => c.id === id);
      if (hit) pick(hit);
      else toast('No customer found.', 'error');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const submit = async (keepOpen: boolean) => {
    if (!customer || !cart.items.length) return;
    setBusy(true);
    try {
      await api('/api/cylinder/orders', {
        body: {
          customerId: customer.id,
          items: cart.items,
          requestedDeliveryDate: deliveryDate,
          priority,
          deliveryAddressId: customer.deliveryAddresses.find((a) => a.isDefault)?.id || null,
          notes: notes.trim() || null,
        },
      });
      cue('success');
      if (keepOpen) {
        setCustomer(null);
        setNotes('');
        setPriority('NORMAL');
        setMore(false);
      }
      await onCreated(keepOpen);
    } catch (e) {
      cue('error');
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
        customer ? (
          <PosTotal
            lines={
              <>
                <div className="text-base font-bold text-slate-900">{t('{n} cylinders', { n: cart.count })}</div>
                <button type="button" disabled={busy || !cart.items.length} onClick={() => submit(true)} className="text-[11px] font-black text-emerald-700 disabled:opacity-40">
                  {t('Send & next order')}
                </button>
              </>
            }
            action={
              <PosButton busy={busy} disabled={!cart.items.length} onClick={() => submit(false)}>
                <Send className="h-4 w-4" />{t('Send')}
              </PosButton>
            }
          />
        ) : undefined
      }
    >
      {!customer ? (
        <div className="space-y-3">
          <RecentChips title={t('Recent')} items={recent} onPick={(r) => void pickRecent(r.id)} />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search name, mobile or code')} className={cx(inputClass, 'py-3 text-base')} />
          <div className="max-h-[55vh] overflow-y-auto space-y-1.5 pr-1">
            {matches === null && <div className="py-4 text-center text-[11px] text-slate-400">{t('Loading…')}</div>}
            {matches?.length === 0 && <div className="py-4 text-center text-[11px] text-slate-400">{t(query.trim() ? 'No customer found.' : 'No customers are assigned to you yet. Ask the office to set you as their delivery boy.')}</div>}
            {matches?.map((c) => (
              <button key={c.id} onClick={() => pick(c)} className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 active:bg-emerald-100">
                <span className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-base font-black">{(partyLabel(c.shortName, c.name) || '?').trim().charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900 truncate">{partyLabel(c.shortName, c.name)}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{[c.area, c.deliveryAddresses.find((a) => a.isDefault)?.address || c.address].filter(Boolean).join(' · ') || c.customerCode}</span>
                </span>
                <span className="shrink-0 text-[11px] font-mono text-slate-600">{c.phone}</span>
              </button>
            ))}
            {(matches?.length ?? 0) >= 100 && <div className="py-1 text-center text-[10px] text-slate-400">{t('Type to search more customers')}</div>}
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center">
            <div className="min-w-0">
              <div className="font-black truncate">{partyLabel(customer.shortName, customer.name)}</div>
              <div className="text-[11px] opacity-70">{customer.phone}{customer.area ? ` · ${customer.area}` : ''}</div>
            </div>
            <button type="button" onClick={() => setCustomer(null)} className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 text-xs font-black">{t('Change')}</button>
          </div>
          {cart.assignedOff && <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] font-semibold text-amber-800">{t('The cylinder assigned to this customer is switched off. Ask the office to fix it in the customer or product master.')}</p>}
          <OrderTiles
            cart={cart}
            note={(productId, qty) => {
              // His own stock, so he knows whether he can deliver it himself or must request more.
              const mine = stock.find((s) => s.productId === productId);
              const full = mine?.fullQty ?? 0;
              return (
                <span className={cx('flex items-center gap-1', qty > full ? 'text-rose-600' : full > 0 ? 'text-emerald-700' : 'text-slate-400')}>
                  <Package className="h-3 w-3 shrink-0" />
                  {t('With me: {full} full · {empty} empty', { full, empty: mine?.emptyQty ?? 0 })}
                </span>
              );
            }}
          />
          <button type="button" onClick={() => setMore(!more)} className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
            <span>{t('More options')} <span className="font-semibold text-slate-500">· {deliveryDate === today() ? t('Today') : deliveryDate} · {t(priority === 'URGENT' ? 'Urgent' : 'Normal')}</span></span>
            <ChevronRight className={cx('h-4 w-4 transition', more && 'rotate-90')} />
          </button>
          {more && (
            <div className="space-y-3">
              <Field label={t('Delivery date')}>
                <DateInput min={today()} value={deliveryDate} onChange={setDeliveryDate} />
              </Field>
              <Field label={t('Priority')}>
                <ChoiceTiles value={priority} onChange={setPriority} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'URGENT', label: t('Urgent'), tone: 'rose' }]} />
              </Field>
              <Field label={t('Note (optional)')}>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}
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

  const act = async (action: 'accept') => {
    setBusy(true);
    try {
      await api(`/api/cylinder/orders/${order.id}`, { body: { action } });
      await onChanged('Order accepted.');
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
    <Modal open title={`${order.orderNumber} · ${partyLabel(order.customerShortName, order.customerName)}`} onClose={onClose}>
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
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        onFile(f ? await compressImage(f) : null);
      }} />
      {/* One slim row: thumbnail + label + action, so the form needs less scrolling. */}
      <button type="button" onClick={() => ref.current?.click()} className={cx('w-full h-12 rounded-xl border-2 border-dashed flex items-center gap-2.5 px-1.5 text-left', file ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300')}>
        <span className="h-9 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center text-slate-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt={label} className="h-full w-full object-cover" /> : <Camera className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase text-slate-600">{label}{required && ' *'}</span>
        <span className={cx('shrink-0 pr-1.5 text-xs font-bold', file ? 'text-emerald-700' : 'text-slate-500')}>{file ? t('Retake') : t('Take photo')}</span>
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
    const fail = (m: string) => {
      cue('error');
      toast(m, 'error');
    };
    if (!proof) return fail('Delivery proof photo is mandatory.');
    if (mode !== 'CREDIT' && !(Number(amount) > 0)) return fail('Enter the amount collected.');
    if (mode === 'ONLINE' && (!txn.trim() || !payProof)) return fail('Transaction ID and payment screenshot are required.');
    if (mode === 'CHEQUE' && (!cheque.number || !cheque.bank || !cheque.date || !chequePhoto)) return fail('Cheque number, bank, date and photo are required.');
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
      cue('success');
      await onQueued(navigator.onLine ? 'Delivery saved — syncing…' : 'Offline: delivery saved on phone (Pending Sync).');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {lines.map((l, idx) => (
        <div key={l.productId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="text-[13px] font-bold text-slate-900 leading-snug">{l.productName} <span className="text-slate-400 font-medium text-[11px]">{t('(ordered {n})', { n: l.orderedQty })}</span></div>
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            <Stepper size="sm" label={t('Delivered (full)')} value={Number(l.delivered) || 0} onChange={(n) => setLines(lines.map((x, i) => (i === idx ? { ...x, delivered: String(n) } : x)))} />
            <Stepper size="sm" label={t('Empty received')} value={Number(l.empty) || 0} onChange={(n) => setLines(lines.map((x, i) => (i === idx ? { ...x, empty: String(n) } : x)))} />
          </div>
          {(Number(l.delivered) !== l.orderedQty || Number(l.empty) !== Number(l.delivered)) && (
            <div className="text-[10px] font-bold text-amber-700 mt-1">{t('Difference will be flagged for accounts.')}</div>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5"><span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('Bill')}</span><span className="text-base font-bold tabular-nums text-slate-900">{inr(bill)}</span></div>
      <ChoiceTiles
        compact
        value={mode}
        onChange={(m) => { setMode(m); if (m === 'CREDIT') setAmount('0'); else if (Number(amount) === 0) setAmount(String(bill)); }}
        options={[
          { value: 'CASH', label: t('CASH'), icon: Banknote },
          { value: 'ONLINE', label: t('ONLINE'), icon: Smartphone, tone: 'sky' },
          { value: 'CHEQUE', label: t('CHEQUE'), icon: FileText, tone: 'slate' },
          { value: 'CREDIT', label: t('CREDIT'), icon: Clock, tone: 'amber' },
        ]}
      />
      {mode !== 'CREDIT' && (
        <AmountPad
          compact
          otherLabel={t('Other amount')}
          label={t('Amount collected (₹)')}
          value={amount}
          onChange={setAmount}
          quick={[{ label: t('Full bill {amount}', { amount: inr(bill) }), value: Math.round(bill * 100) / 100 }]}
        />
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
      <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-white border-t border-slate-100 flex gap-2">
        <Button tone="secondary" className="py-3" onClick={onCancel}>{t('Back')}</Button>
        <div className="flex-1 [&>button]:w-full">
          <PosButton busy={busy} onClick={submit}>
            <Send className="h-4 w-4" />{t('Submit delivery')}
          </PosButton>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Collect (payment-only visits) ─────────────────────────

interface DueCustomer { id: string; customerCode: string; name: string; shortName: string | null; phone: string; address: string | null; area: string | null; balance: number }
interface FieldCollection { id: string; paymentNumber: string; customerId: string; customerName: string; mode: string; amount: number; status: string; rejectionReason: string | null; createdAt: string }

/** Customer was served earlier; today the boy only goes to collect the old dues. */
function CollectTab({ dayStarted, onChanged, toast }: { dayStarted: boolean; onChanged: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t, status } = useT();
  const [query, setQuery] = useState('');
  const [data, setData] = useState<{ customers: DueCustomer[]; collections: FieldCollection[] } | null>(null);
  const [tick, setTick] = useState(0);
  const [collecting, setCollecting] = useState<DueCustomer | null>(null);

  // Customers with dues first; typing searches all his customers (debounced).
  useEffect(() => {
    const q = query.trim();
    let alive = true;
    const timer = window.setTimeout(() => {
      api<{ customers: DueCustomer[]; collections: FieldCollection[] }>(`/api/delivery/collections${q ? `?search=${encodeURIComponent(q)}` : ''}`)
        .then((d) => alive && setData(d))
        .catch((e) => alive && toast(errorMessage(e), 'error'));
    }, q ? 250 : 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, tick, toast]);

  const searching = !!query.trim();
  const collections = data?.collections ?? [];
  const total = collections.filter((c) => c.status !== 'REJECTED').reduce((s, c) => s + c.amount, 0);
  const totalDue = (data?.customers ?? []).reduce((s, c) => s + Math.max(c.balance, 0), 0);

  return (
    <>
      <div className="rounded-2xl p-4 bg-emerald-700 text-white">
        <div className="text-[11px] font-bold uppercase opacity-80">{t('Collected today')}</div>
        <div className="text-2xl font-black">{inr(total)}</div>
        <div className="text-[11px] opacity-80">{t('{n} payment(s) · submit the cash from the Cash tab', { n: collections.length })}</div>
      </div>
      {!dayStarted && <div className="rounded-xl p-3 bg-sky-50 text-sky-800 text-xs font-bold">{t('Start your day to collect payments.')}</div>}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search name, mobile or code')} className={cx(inputClass, 'py-3 text-base')} />
      <div className="flex justify-between items-center">
        <div className="text-[11px] font-black uppercase text-slate-500">{searching ? t('Customers') : t('Customers with dues ({n})', { n: data?.customers.length ?? 0 })}</div>
        {!searching && totalDue > 0 && <div className="text-[11px] font-black text-rose-700">{inr(totalDue)}</div>}
      </div>
      {!data && <Empty>{t('Loading…')}</Empty>}
      {data?.customers.length === 0 && <Empty>{t(searching ? 'No customer found.' : 'No dues pending with your customers.')}</Empty>}
      <div className="space-y-1.5">
        {data?.customers.map((c) => {
          const done = collections.filter((x) => x.customerId === c.id && x.status !== 'REJECTED').reduce((s, x) => s + x.amount, 0);
          return (
            <button key={c.id} disabled={!dayStarted} onClick={() => setCollecting(c)} className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-2xl border border-slate-200 bg-white active:bg-emerald-50 disabled:opacity-60">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-900 truncate">{partyLabel(c.shortName, c.name)}</span>
                <span className="block text-[11px] text-slate-500 truncate">{[c.area, c.phone].filter(Boolean).join(' · ')}</span>
                {done > 0 && <span className="block text-[11px] font-bold text-emerald-700">{t('Collected today {amount}', { amount: inr(done) })}</span>}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[10px] font-bold uppercase text-slate-400">{t('Due')}</span>
                <span className={cx('block text-sm font-black', c.balance > 0 ? 'text-rose-700' : 'text-slate-500')}>{inr(c.balance)}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
        <div className="text-xs font-black mb-1">{t('Today’s collections')}</div>
        {collections.length === 0 && <div className="text-[11px] text-slate-400">{t('None yet.')}</div>}
        {collections.map((c) => (
          <div key={c.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
            <span className="min-w-0">
              <span className="block font-semibold truncate">{c.customerName}</span>
              <span className="block text-[10px] text-slate-400">{c.paymentNumber} · {t(c.mode)} · {dateTime(c.createdAt)}{c.rejectionReason ? ` · ${c.rejectionReason}` : ''}</span>
            </span>
            <span className="text-right shrink-0"><strong>{inr(c.amount)}</strong><div><StatusBadge status={c.status} label={status(c.status)} /></div></span>
          </div>
        ))}
      </div>
      {collecting && (
        <CollectSheet
          customer={collecting}
          onClose={() => setCollecting(null)}
          onDone={async () => {
            setCollecting(null);
            setTick((n) => n + 1);
            await onChanged();
          }}
          toast={toast}
        />
      )}
    </>
  );
}

function CollectSheet({ customer, onClose, onDone, toast }: { customer: DueCustomer; onClose: () => void; onDone: () => Promise<void>; toast: (m: string, t?: 'ok' | 'error') => void }) {
  const { t } = useT();
  const due = Math.max(0, Math.round(customer.balance * 100) / 100);
  const [mode, setMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('CASH');
  const [amount, setAmount] = useState(due > 0 ? String(due) : '');
  const [txn, setTxn] = useState('');
  const [cheque, setCheque] = useState({ number: '', bank: '', date: '' });
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const fail = (m: string) => {
      cue('error');
      toast(m, 'error');
    };
    if (!(Number(amount) > 0)) return fail('Enter the amount collected.');
    if (mode === 'ONLINE' && (!txn.trim() || !photo)) return fail('Transaction ID and payment screenshot are required.');
    if (mode === 'CHEQUE' && (!cheque.number || !cheque.bank || !cheque.date || !photo)) return fail('Cheque number, bank, date and photo are required.');
    setBusy(true);
    try {
      const proofUrl = photo ? await uploadFile(photo) : null;
      await api('/api/delivery/collections', {
        body: {
          customerId: customer.id,
          mode,
          amount: Number(amount),
          transactionId: mode === 'ONLINE' ? txn.trim() : null,
          chequeNumber: mode === 'CHEQUE' ? cheque.number : null,
          chequeBank: mode === 'CHEQUE' ? cheque.bank : null,
          chequeDate: mode === 'CHEQUE' ? cheque.date : null,
          proofUrl,
          notes: notes.trim() || null,
        },
      });
      cue('success');
      toast(t('{amount} collected — sent to accounts for verification.', { amount: inr(Number(amount)) }));
      await onDone();
    } catch (e) {
      fail(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={t('Collect payment')}
      onClose={onClose}
      footer={
        <PosTotal
          lines={<div className="text-base font-bold text-slate-900">{inr(Number(amount) || 0)}</div>}
          action={
            <PosButton busy={busy} disabled={!(Number(amount) > 0)} onClick={submit}>
              <Send className="h-4 w-4" />{t('Save payment')}
            </PosButton>
          }
        />
      }
    >
      <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center">
        <div className="min-w-0">
          <div className="font-black truncate">{partyLabel(customer.shortName, customer.name)}</div>
          <div className="text-[11px] opacity-70">{customer.phone}{customer.area ? ` · ${customer.area}` : ''}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase opacity-70">{t('Due')}</div>
          <div className="font-black">{inr(customer.balance)}</div>
        </div>
      </div>
      <a href={`tel:${customer.phone}`} className="py-2 rounded-xl bg-slate-100 text-xs font-bold flex items-center justify-center gap-1">
        <Phone className="h-4 w-4" />{t('Call')}</a>
      <ChoiceTiles
        compact
        value={mode}
        onChange={setMode}
        options={[
          { value: 'CASH', label: t('CASH'), icon: Banknote },
          { value: 'ONLINE', label: t('ONLINE'), icon: Smartphone, tone: 'sky' },
          { value: 'CHEQUE', label: t('CHEQUE'), icon: FileText, tone: 'slate' },
        ]}
      />
      <AmountPad
        compact
        otherLabel={t('Other amount')}
        label={t('Amount collected (₹)')}
        value={amount}
        onChange={setAmount}
        quick={due > 0 ? [{ label: t('Full due {amount}', { amount: inr(due) }), value: due }] : []}
      />
      {due > 0 && Number(amount) > due && <p className="text-[11px] font-bold text-amber-700">{t('More than the due — the extra stays as advance.')}</p>}
      {mode === 'ONLINE' && (
        <>
          <Field label={t('Transaction ID / UTR')}>
            <input value={txn} onChange={(e) => setTxn(e.target.value)} className={inputClass} />
          </Field>
          <PhotoInput label={t('Payment screenshot')} file={photo} onFile={setPhoto} required />
        </>
      )}
      {mode === 'CHEQUE' && (
        <>
          <Field label={t('Cheque no.')}><input value={cheque.number} onChange={(e) => setCheque({ ...cheque, number: e.target.value })} className={inputClass} /></Field>
          <Field label={t('Cheque date')}><DateInput value={cheque.date} onChange={(date) => setCheque({ ...cheque, date })} /></Field>
          <Field label={t('Bank')}><input value={cheque.bank} onChange={(e) => setCheque({ ...cheque, bank: e.target.value })} className={inputClass} /></Field>
          <PhotoInput label={t('Cheque photo')} file={photo} onFile={setPhoto} required />
        </>
      )}
      {mode === 'CASH' && <PhotoInput label={t('Receipt photo (optional)')} file={photo} onFile={setPhoto} />}
      <Field label={t('Remarks')}>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>
    </Modal>
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
      cue('success');
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
          <div className="grid grid-cols-2 gap-2">
            {info.receivers.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { cue('tap'); setReceiverId(r.id); }}
                className={cx('rounded-xl border-2 px-3 py-2.5 text-left active:scale-[0.97] transition', receiverId === r.id ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-800')}
              >
                <span className="block text-sm font-black truncate">{r.name}</span>
                <span className={cx('block text-[10px] font-semibold', receiverId === r.id ? 'text-emerald-100' : 'text-slate-500')}>{t(ROLE_LABELS[r.role as Role] || r.role)}</span>
              </button>
            ))}
          </div>
        </Field>
        <AmountPad label={t('Amount (₹)')} value={amount} onChange={setAmount} quick={info.available > 0 ? [{ label: t('All {amount}', { amount: inr(info.available) }), value: info.available }] : []} />
        <PhotoInput label={t('Proof photo (optional)')} file={photo} onFile={setPhoto} />
        <div className="[&>button]:w-full">
          <PosButton busy={busy} disabled={!receiverId || !(Number(amount) > 0)} onClick={submit}>
            <Send className="h-4 w-4" />{t('Submit')}
          </PosButton>
        </div>
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
  const [form, setForm] = useState<{ kind: 'ISSUE' | 'RETURN'; warehouseId: string; qty: Record<string, { full: number; empty: number }> } | null>(null);
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

  const transferItems = form ? Object.entries(form.qty).filter(([, q]) => q.full > 0 || q.empty > 0).map(([productId, q]) => ({ productId, fullQty: q.full, emptyQty: q.empty })) : [];
  // Returning more than he holds is refused by the server; show it before sending.
  const overReturn = form?.kind === 'RETURN' && transferItems.some((i) => { const s = stock.find((x) => x.productId === i.productId); return i.fullQty > (s?.fullQty ?? 0) || i.emptyQty > (s?.emptyQty ?? 0); });
  const setQty = (productId: string, patch: Partial<{ full: number; empty: number }>) =>
    form && setForm({ ...form, qty: { ...form.qty, [productId]: { ...(form.qty[productId] ?? { full: 0, empty: 0 }), ...patch } } });

  const submitTransfer = async () => {
    if (!form || !transferItems.length) return;
    setBusy(true);
    try {
      const me = userId;
      await api('/api/cylinder/transfers', {
        body: {
          transferType: form.kind === 'ISSUE' ? 'WAREHOUSE_TO_DRIVER' : 'DRIVER_TO_WAREHOUSE',
          fromId: form.kind === 'ISSUE' ? form.warehouseId : me,
          toId: form.kind === 'ISSUE' ? me : form.warehouseId,
          items: transferItems,
        },
      });
      cue('success');
      toast('Request sent for manager approval.');
      setForm(null);
      await Promise.all([load(), onChanged()]);
    } catch (e) {
      cue('error');
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
        <Button className="py-3" onClick={() => setForm({ kind: 'ISSUE', warehouseId: warehouses[0]?.id || '', qty: {} })}>{t('Request stock')}</Button>
        <Button tone="secondary" className="py-3" onClick={() => setForm({ kind: 'RETURN', warehouseId: warehouses[0]?.id || '', qty: {} })}>{t('Return to godown')}</Button>
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

      <Modal
        open={!!form}
        title={t(form?.kind === 'ISSUE' ? 'Request stock from godown' : 'Return stock to godown')}
        onClose={() => setForm(null)}
        footer={
          <PosTotal
            lines={<div className="text-base font-bold text-slate-900">{t('{n} cylinders', { n: transferItems.reduce((s, i) => s + i.fullQty + i.emptyQty, 0) })}</div>}
            action={
              <PosButton busy={busy} disabled={!transferItems.length || !form?.warehouseId || overReturn} onClick={submitTransfer}>
                <Send className="h-4 w-4" />{t('Send for approval')}
              </PosButton>
            }
          />
        }
      >
        {form && (
          <>
            <Field label={t('Godown')}>
              <PickerField
                title={t('Godown')}
                placeholder={t('Select…')}
                value={form.warehouseId}
                onChange={(id) => setForm({ ...form, warehouseId: id })}
                options={warehouses.map((w) => ({ id: w.id, label: w.name, icon: /^truck/i.test(w.name) ? Truck : Warehouse }))}
              />
            </Field>
            {(() => {
              // Few products: a tile for each. Many: search to add, tiles only for the ones added.
              const many = products.length > 6;
              const holding = (id: string) => stock.find((s) => s.productId === id);
              const shown = many ? products.filter((p) => p.id in form.qty) : products;
              // Returning: what he holds comes first in the search list.
              const addable = products
                .filter((p) => !(p.id in form.qty))
                .map((p) => {
                  const h = holding(p.id);
                  return { id: p.id, label: p.name, sub: form.kind === 'RETURN' ? t('With me: {full} full · {empty} empty', { full: h?.fullQty ?? 0, empty: h?.emptyQty ?? 0 }) : undefined, held: (h?.fullQty ?? 0) + (h?.emptyQty ?? 0) };
                })
                .sort((a, b) => (form.kind === 'RETURN' ? b.held - a.held : 0));
              return (
                <div className="space-y-2">
                  {many && <SearchPick placeholder={t('Search cylinder to add…')} items={addable} onPick={(id) => setQty(id, {})} />}
                  {shown.map((p) => {
                    const mine = holding(p.id);
                    const q = form.qty[p.id] || { full: 0, empty: 0 };
                    return (
                      <StockTile
                        key={p.id}
                        name={p.name}
                        available={form.kind === 'RETURN' ? { full: mine?.fullQty ?? 0, empty: mine?.emptyQty ?? 0 } : undefined}
                        full={q.full}
                        empty={q.empty}
                        onFull={(n) => setQty(p.id, { full: n })}
                        onEmpty={(n) => setQty(p.id, { empty: n })}
                        labels={{ full: t('Full'), empty: t('Empty') }}
                        onRemove={many ? () => { const next = { ...form.qty }; delete next[p.id]; setForm({ ...form, qty: next }); } : undefined}
                      />
                    );
                  })}
                  {many && shown.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-[11px] font-semibold text-slate-400">{t('Search above and tap a cylinder to add it')}</div>}
                </div>
              );
            })()}
            {overReturn && <p className="text-xs font-semibold text-rose-600">{t('More than you hold — reduce the red quantities.')}</p>}
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
