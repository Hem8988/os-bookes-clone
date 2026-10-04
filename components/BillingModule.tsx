'use client';

import React, { useMemo, useState } from 'react';
import { Banknote, Clock, Landmark, Printer, Receipt, Search, Smartphone, Trash2 } from 'lucide-react';
import { Customer, Product, Invoice, InvoiceItem } from '../lib/types';
import { cue } from '../lib/feedback';
import { ChoiceTiles, PosButton, RecentChips, SoundToggle, Stepper, useRecent } from './pos';
import { cx, partyLabel } from './ui';

interface BillingModuleProps {
  customers: Customer[];
  products: Product[];
  /** Saves the invoice (and opens it for printing); resolves false when saving failed. */
  onAddInvoice: (invoice: Invoice) => void | Promise<boolean | void>;
  onOpenInvoiceModal: (inv: Invoice) => void;
}

type PayMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';
interface Line { productId: string; quantity: number; unitPrice: number; discountPercent: number }

const r2 = (n: number) => parseFloat(n.toFixed(2));
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
/** Temporary id, today and the 14-day due date for a new invoice. */
const invoiceStamp = () => ({ id: `inv-${Date.now()}`, date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] });

/** Counter billing (POS): tap products into the cart, pick the payment, save & print. */
export const BillingModule: React.FC<BillingModuleProps> = ({ customers, products, onAddInvoice }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [customerQuery, setCustomerQuery] = useState('');
  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [recent, pushRecent] = useRecent('billing-customers');
  const [productQuery, setProductQuery] = useState('');
  const [paymentMode, setPaymentMode] = useState<PayMode>('UPI');
  const [isIgst, setIsIgst] = useState(false);
  const [notes, setNotes] = useState('Thank you for shopping with us!');
  const [lineItems, setLineItems] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const customerMatches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.shortName || '').toLowerCase().includes(q) || c.phone.includes(q) || (c.customerCode || '').toLowerCase().includes(q) || (c.gstin || '').toLowerCase().includes(q)).slice(0, 12);
  }, [customers, customerQuery]);
  const shownProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.hsnCode || '').includes(q)) : products;
  }, [products, productQuery]);

  const pickCustomer = (c: Customer) => {
    cue('tap');
    setSelectedCustomerId(c.id);
    setCustomerQuery('');
    setPickingCustomer(false);
    pushRecent({ id: c.id, label: partyLabel(c.shortName, c.name), sub: c.gstin || c.phone });
  };

  // Calculate detailed line item figures
  const calculatedItems: InvoiceItem[] = lineItems.map((item, idx) => {
    const prod = products.find((p) => p.id === item.productId) || products[0];
    const qty = Math.max(1, item.quantity);
    const price = item.unitPrice || prod.salePrice;
    const disc = Math.min(100, Math.max(0, item.discountPercent));
    const taxableAmount = qty * price - (qty * price * disc) / 100;
    const taxRate = prod.taxRate;
    const igstAmount = isIgst ? (taxableAmount * taxRate) / 100 : 0;
    const cgstAmount = isIgst ? 0 : (taxableAmount * (taxRate / 2)) / 100;
    const sgstAmount = cgstAmount;
    return {
      id: `item-${idx}`,
      productId: prod.id,
      productName: prod.name,
      hsnCode: prod.hsnCode,
      quantity: qty,
      unit: prod.unit,
      unitPrice: price,
      discountPercent: disc,
      taxRate,
      taxableAmount: r2(taxableAmount),
      cgstAmount: r2(cgstAmount),
      sgstAmount: r2(sgstAmount),
      igstAmount: r2(igstAmount),
      totalAmount: r2(taxableAmount + cgstAmount + sgstAmount + igstAmount),
    };
  });

  const subTotal = calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalCgst = calculatedItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalSgst = calculatedItems.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalIgst = calculatedItems.reduce((sum, item) => sum + item.igstAmount, 0);
  const rawGrandTotal = subTotal + totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = r2(grandTotal - rawGrandTotal);
  const count = lineItems.reduce((s, l) => s + l.quantity, 0);

  const qtyOf = (productId: string) => lineItems.find((l) => l.productId === productId)?.quantity || 0;
  /** Set a product's quantity in the cart (0 removes the line). */
  const setQty = (productId: string, quantity: number) => {
    const prod = products.find((p) => p.id === productId);
    setLineItems((cur) => {
      if (quantity <= 0) return cur.filter((l) => l.productId !== productId);
      if (cur.some((l) => l.productId === productId)) return cur.map((l) => (l.productId === productId ? { ...l, quantity } : l));
      return [...cur, { productId, quantity, unitPrice: prod?.salePrice || 0, discountPercent: 0 }];
    });
  };
  const setField = (productId: string, field: 'unitPrice' | 'discountPercent', val: number) => setLineItems((cur) => cur.map((l) => (l.productId === productId ? { ...l, [field]: val } : l)));

  const handleSaveInvoice = async () => {
    if (!lineItems.length || !selectedCustomer) return;
    const newInv: Invoice = {
      ...invoiceStamp(),
      invoiceNumber: 'NEW',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerGstin: selectedCustomer.gstin,
      customerPhone: selectedCustomer.phone,
      items: calculatedItems,
      subTotal: r2(subTotal),
      totalDiscount: 0,
      totalCgst: r2(totalCgst),
      totalSgst: r2(totalSgst),
      totalIgst: r2(totalIgst),
      roundOff,
      grandTotal,
      paymentMode,
      status: paymentMode === 'Credit' ? 'Unpaid' : 'Paid',
      isIgst,
      notes,
    };
    setBusy(true);
    try {
      const saved = await onAddInvoice(newInv);
      if (saved === false) return cue('error');
      cue('success');
      setLineItems([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-500" />
            Billing counter (POS)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tap products to add them — GST is worked out as you go.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
            <input type="checkbox" checked={isIgst} onChange={(e) => setIsIgst(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
            <span>Inter-state (IGST)</span>
          </label>
          <SoundToggle className="bg-slate-100 text-slate-700 hover:bg-slate-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Left: customer + product tiles */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            {!pickingCustomer && selectedCustomer ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 text-white">
                <div className="min-w-0">
                  <div className="text-sm font-black truncate">{partyLabel(selectedCustomer.shortName, selectedCustomer.name)}</div>
                  <div className="text-[11px] opacity-70 truncate">GSTIN: {selectedCustomer.gstin || 'Unregistered / Retail'} · {selectedCustomer.phone}</div>
                </div>
                <button type="button" onClick={() => setPickingCustomer(true)} className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 text-xs font-black">Change</button>
              </div>
            ) : (
              <div className="space-y-2">
                <RecentChips title="Recent customers" items={recent.filter((r) => customers.some((c) => c.id === r.id))} onPick={(r) => { const c = customers.find((x) => x.id === r.id); if (c) pickCustomer(c); }} />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input autoFocus value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Search customer — name, mobile, code or GSTIN" className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {customerMatches.map((c) => (
                    <button key={c.id} type="button" onClick={() => pickCustomer(c)} className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs">
                      <strong className="text-sm text-slate-900 dark:text-slate-100">{partyLabel(c.shortName, c.name)}</strong>
                      <span className="block text-slate-500">{c.phone}{c.gstin ? ` · ${c.gstin}` : ''}</span>
                    </button>
                  ))}
                </div>
                {selectedCustomer && <button type="button" onClick={() => setPickingCustomer(false)} className="text-xs font-bold text-slate-500">Keep {partyLabel(selectedCustomer.shortName, selectedCustomer.name)}</button>}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            {products.length > 8 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search product or HSN" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {shownProducts.map((p) => {
                const q = qtyOf(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { cue('tap'); setQty(p.id, q + 1); }}
                    className={cx('relative text-left p-3 min-h-[92px] rounded-2xl border-2 bg-white dark:bg-slate-800 active:scale-[0.97] transition', q > 0 ? 'border-emerald-500 shadow-md shadow-emerald-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700')}
                  >
                    <div className="pr-8 text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">{p.name}</div>
                    <div className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-400">{rupees(p.salePrice)}</div>
                    <div className={cx('text-[10px] font-bold', (p.stock ?? 0) > 0 ? 'text-slate-500' : 'text-rose-600')}>Stock {p.stock ?? 0} {p.unit} · GST {p.taxRate}%</div>
                    {q > 0 && <span className="absolute top-2 right-2 min-w-7 h-7 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">{q}</span>}
                  </button>
                );
              })}
            </div>
            {shownProducts.length === 0 && <div className="py-6 text-center text-xs text-slate-400">No product matches.</div>}
          </div>
        </div>

        {/* Right: cart, payment, totals */}
        <div className="lg:col-span-2 lg:sticky lg:top-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Cart · {count} item{count === 1 ? '' : 's'}</div>
            {lineItems.length > 0 && <button type="button" onClick={() => { cue('remove'); setLineItems([]); }} className="text-[11px] font-bold text-rose-600">Clear</button>}
          </div>
          {lineItems.length === 0 ? (
            <div className="py-10 text-center text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Tap a product to start the bill</div>
          ) : (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {lineItems.map((item, idx) => {
                const calc = calculatedItems[idx];
                return (
                  <div key={item.productId} className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{calc.productName}</div>
                        <div className="text-[10px] text-slate-500">HSN {calc.hsnCode} · GST {calc.taxRate}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">{rupees(calc.totalAmount)}</div>
                        <button type="button" onClick={() => { cue('remove'); setQty(item.productId, 0); }} className="text-slate-400 hover:text-rose-600" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 items-end">
                      <div className="col-span-3"><Stepper value={item.quantity} min={1} onChange={(n) => setQty(item.productId, n)} /></div>
                      <label className="block">
                        <span className="text-[9px] font-black uppercase text-slate-500">Rate</span>
                        <input type="number" min={0} value={item.unitPrice} onChange={(e) => setField(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full h-10 px-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-right text-slate-900 dark:text-slate-100" />
                      </label>
                      <label className="block">
                        <span className="text-[9px] font-black uppercase text-slate-500">Disc %</span>
                        <input type="number" min={0} max={100} value={item.discountPercent} onChange={(e) => setField(item.productId, 'discountPercent', parseFloat(e.target.value) || 0)} className="w-full h-10 px-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center text-slate-900 dark:text-slate-100" />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <ChoiceTiles
            value={paymentMode}
            onChange={setPaymentMode}
            cols={4}
            options={[
              { value: 'UPI', label: 'UPI', icon: Smartphone, tone: 'sky' },
              { value: 'Cash', label: 'Cash', icon: Banknote },
              { value: 'Bank Transfer', label: 'Bank', icon: Landmark, tone: 'slate' },
              { value: 'Credit', label: 'Credit', icon: Clock, tone: 'amber' },
            ]}
          />

          <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex justify-between"><span>Taxable</span><span className="font-mono font-bold text-slate-800 dark:text-slate-200">{rupees(r2(subTotal))}</span></div>
            {!isIgst ? (
              <>
                <div className="flex justify-between"><span>CGST</span><span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{rupees(r2(totalCgst))}</span></div>
                <div className="flex justify-between"><span>SGST</span><span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{rupees(r2(totalSgst))}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span>IGST</span><span className="font-mono font-bold text-purple-600 dark:text-purple-400">{rupees(r2(totalIgst))}</span></div>
            )}
            <div className="flex justify-between"><span>Round off</span><span className="font-mono">{roundOff >= 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span></div>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">Invoice notes</summary>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500" />
          </details>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase text-slate-500">Grand total</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{rupees(grandTotal)}</div>
            </div>
            <PosButton busy={busy} disabled={!lineItems.length || !selectedCustomer} onClick={() => void handleSaveInvoice()}>
              <Printer className="h-4 w-4" /> Save &amp; print
            </PosButton>
          </div>
          <div className="text-[10px] text-slate-400">The invoice number is assigned by the server when you save.</div>
        </div>
      </div>
    </div>
  );
};
