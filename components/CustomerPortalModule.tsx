'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Printer, RefreshCw } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useT } from '../lib/i18n';
import { useApiData } from '../lib/useApiData';
import { logout, useSession } from '../lib/auth';
import { LanguageToggle } from './LanguageToggle';
import CustomerComplaints from './ops/CustomerComplaints';
import { PrintInvoiceModal, InvoiceView } from './PrintInvoiceModal';
import { Button, Card, Empty, Field, inputClass, Modal, Stat, StatusBadge, cx, today, useToast } from './ui';

// Customer self-service portal (V2): balance, cylinders, orders, invoices,
// payments and statement — the same data the WhatsApp bot answers from.

interface Portal {
  customer: { id: string; name: string; customerCode: string; balance: number; creditLimit: number; paymentTerms: string; defaultProductIds: string[]; cylinderBalances: { productName: string; currentBalance: number }[] };
  orders: { id: string; orderNumber: string; status: string; requestedDeliveryDate: string; totalAmount: number; items: { id: string; productName: string; orderedQty: number }[]; rejectionReason: string | null }[];
  invoices: (InvoiceView & { id: string })[];
  payments: { id: string; paymentNumber: string; paymentDate: string; mode: string; amount: number }[];
  ledger: { id: string; date: string; voucherNumber: string; particulars: string; debit: number; credit: number; balance: number }[];
}

export function CustomerPortalModule() {
  const { t } = useT();
  const { session } = useSession();
  const [tab, setTab] = useState<'orders' | 'invoices' | 'payments' | 'statement' | 'complaints'>('orders');
  const [ordering, setOrdering] = useState(false);
  const [printing, setPrinting] = useState<InvoiceView | null>(null);
  const [toast, showToast] = useToast();

  const customerId = session?.user.customerId;
  const portalQ = useApiData<Portal>(customerId ? `/api/customers/${customerId}/360` : null, (m) => showToast(m, 'error'));
  const data = portalQ.data ?? null;
  const load = portalQ.reload;

  // Invoice link from WhatsApp (?invoice=<id>) opens that invoice once.
  const [deepLinkId, setDeepLinkId] = useState<string | null>(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('invoice')));
  const deepLinked = deepLinkId ? data?.invoices.find((i) => i.id === deepLinkId) || null : null;
  const shownInvoice = printing ?? deepLinked;

  return (
    <div className="min-h-screen bg-slate-100">
      {toast}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-black">{data?.customer.name || session?.user.name}</div>
          <div className="text-[11px] text-emerald-300">{session?.company.name} · {data?.customer.customerCode}</div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button onClick={() => void logout()} className="p-2 rounded-lg hover:bg-slate-800"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {!data ? (
          <Empty>{t('Loading…')}</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label={t('Outstanding')} value={inr(data.customer.balance)} tone={data.customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'} />
              <Stat label={t('Credit limit')} value={data.customer.creditLimit ? inr(data.customer.creditLimit) : '—'} />
              {data.customer.cylinderBalances.map((c) => <Stat key={c.productName} label={`${c.productName} with you`} value={c.currentBalance} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {(['orders', 'invoices', 'payments', 'statement', 'complaints'] as const).map((tabKey) => (
                  <button key={tabKey} onClick={() => setTab(tabKey)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold capitalize', tab === tabKey ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
                    {t(tabKey)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button tone="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
                <Button onClick={() => setOrdering(true)}><Plus className="h-4 w-4" />{t('New order')}</Button>
              </div>
            </div>
            {tab === 'orders' && (
              <Card>
                {data.orders.length === 0 ? <Empty>No orders yet.</Empty> : data.orders.map((o) => (
                  <div key={o.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                    <div>
                      <strong className="font-mono">{o.orderNumber}</strong> · deliver {o.requestedDeliveryDate}
                      <div className="text-slate-500">{o.items.map((i) => `${i.productName} × ${i.orderedQty}`).join(', ')}</div>
                      {o.rejectionReason && <div className="text-rose-600">{o.rejectionReason}</div>}
                    </div>
                    <div className="text-right"><StatusBadge status={o.status} /><div className="font-mono mt-1">{inr(o.totalAmount)}</div></div>
                  </div>
                ))}
              </Card>
            )}
            {tab === 'invoices' && (
              <Card>
                {data.invoices.length === 0 ? <Empty>No invoices yet.</Empty> : data.invoices.map((i) => (
                  <div key={i.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                    <div><strong className="font-mono">{i.invoiceNumber}</strong> · {i.date}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{inr(i.grandTotal)}</span>
                      <StatusBadge status={i.status || 'Unpaid'} />
                      {i.status !== 'Paid' && i.status !== 'Cancelled' && <PayNow invoiceId={i.id} onError={(m) => showToast(m, 'error')} />}
                      <Button size="sm" tone="ghost" onClick={() => setPrinting(i)}><Printer className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </Card>
            )}
            {tab === 'payments' && (
              <Card>
                {data.payments.length === 0 ? <Empty>No payments recorded.</Empty> : data.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs py-2 border-b border-slate-50">
                    <span><strong className="font-mono">{p.paymentNumber}</strong> · {p.paymentDate} · {p.mode}</span>
                    <strong>{inr(p.amount)}</strong>
                  </div>
                ))}
              </Card>
            )}
            {tab === 'complaints' && <CustomerComplaints onToast={showToast} />}
            {tab === 'statement' && (
              <Card>
                <table className="w-full text-xs">
                  <thead className="text-slate-500 text-left">
                    <tr><th className="p-2">Date</th><th className="p-2">Voucher</th><th className="p-2">Details</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th><th className="p-2 text-right">Balance</th></tr>
                  </thead>
                  <tbody>
                    {data.ledger.map((e) => (
                      <tr key={e.id} className="border-t border-slate-100">
                        <td className="p-2">{e.date}</td><td className="p-2 font-mono">{e.voucherNumber}</td><td className="p-2">{e.particulars}</td>
                        <td className="p-2 text-right">{e.debit ? inr(e.debit) : ''}</td><td className="p-2 text-right">{e.credit ? inr(e.credit) : ''}</td><td className="p-2 text-right font-bold">{inr(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </>
        )}
      </main>
      {ordering && data && <NewOrder defaultProductIds={data.customer.defaultProductIds} onClose={() => setOrdering(false)} onDone={(m) => { showToast(m); setOrdering(false); void load(); }} onError={(m) => showToast(m, 'error')} />}
      <PrintInvoiceModal
        invoice={shownInvoice}
        onClose={() => {
          setPrinting(null);
          setDeepLinkId(null);
        }}
      />
    </div>
  );
}

/** Opens the online payment page (Razorpay) or the UPI app for this invoice's balance. */
function PayNow({ invoiceId, onError }: { invoiceId?: string; onError: (m: string) => void }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  if (!invoiceId) return null;
  const go = async () => {
    setBusy(true);
    try {
      const link = await api<{ url: string; upiUrl: string | null; provider: string }>('/api/payments/pay-link', { body: { invoiceId } });
      window.location.href = link.provider === 'RAZORPAY' ? link.url : link.upiUrl || link.url;
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return <Button size="sm" busy={busy} onClick={go}>{t('Pay now')}</Button>;
}

function NewOrder({ defaultProductIds, onClose, onDone, onError }: { defaultProductIds: string[]; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const { t } = useT();
  const [products, setProducts] = useState<{ id: string; name: string; salePrice: number }[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ id: string; name: string; salePrice: number }[]>('/api/products')
      .then((all) => setProducts(defaultProductIds.length ? all.filter((p) => defaultProductIds.includes(p.id)) : all))
      .catch(() => {});
  }, [defaultProductIds]);
  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/cylinder/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Object.entries(qty).filter(([, q]) => Number(q) > 0).map(([productId, q]) => ({ productId, qty: Number(q) })), requestedDeliveryDate: date }) });
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
    <Modal open title="New order" onClose={onClose} footer={<Button busy={busy} disabled={!Object.values(qty).some((q) => Number(q) > 0)} onClick={submit}>{t('Place order')}</Button>}>
      {products.map((p) => (
        <Field key={p.id} label={p.name}>
          <input type="number" min={0} value={qty[p.id] || ''} onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })} className={inputClass} placeholder="Quantity" />
        </Field>
      ))}
      <Field label={t('Delivery date')}><input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
      <p className="text-[11px] text-slate-500">Your order goes to the office for approval; you will get WhatsApp updates at every step.</p>
    </Modal>
  );
}
