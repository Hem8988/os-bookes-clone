'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { api, apiWithMessage, errorMessage, inr, uploadFile } from '../lib/api';
import { cue } from '../lib/feedback';
import { Button, Field, inputClass, Modal, cx, partyLabel, today } from './ui';

// Shared by the office screen (Customers → Customer POs) and the customer portal.

export interface CustomerPoItem { id?: string; productId: string; productName: string; itemCode: string | null; qty: number; deliveredQty: number; pendingQty?: number; rate: number; taxRate: number }
export interface CustomerPo {
  id: string;
  customerId: string;
  customer?: { name: string; shortName: string | null; customerCode: string } | null;
  poNumber: string;
  poDate: string;
  validTill: string | null;
  deliveryDate: string | null;
  deliveryAddressId: string | null;
  paymentTerms: string | null;
  vendorCode: string | null;
  refNumber: string | null;
  poTotal: number | null;
  fileUrl: string | null;
  source: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  warnings?: string[];
  items: CustomerPoItem[];
  _count?: { orders: number };
  orders?: { id: string; orderNumber: string; status: string; requestedDeliveryDate: string; totalAmount: number }[];
}

export const PO_STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'To check',
  OPEN: 'Open',
  PARTIAL: 'Partly supplied',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

interface Product { id: string; name: string; taxRate?: number; active?: boolean }
interface CustomerOption { id: string; name: string; shortName?: string | null; customerCode: string; phone: string; deliveryAddresses?: { id: string; label: string; address: string }[] }
type Line = { productId: string; itemCode: string; qty: string; rate: string };
const EMPTY_LINE: Line = { productId: '', itemCode: '', qty: '', rate: '' };

/** Create or edit a customer PO. `customerId` fixed = customer portal (no rates, no sites); otherwise the office picks the customer. */
export function CustomerPoForm({ po, customerId: fixedCustomerId, showRates = true, onClose, onSaved }: { po?: CustomerPo | null; customerId?: string; showRates?: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState(po?.customerId || fixedCustomerId || '');
  const [query, setQuery] = useState('');
  const [poNumber, setPoNumber] = useState(po?.poNumber || '');
  const [poDate, setPoDate] = useState(po?.poDate || today());
  const [validTill, setValidTill] = useState(po?.validTill || '');
  const [deliveryDate, setDeliveryDate] = useState(po?.deliveryDate || '');
  const [addressId, setAddressId] = useState(po?.deliveryAddressId || '');
  const [refNumber, setRefNumber] = useState(po?.refNumber || '');
  const [vendorCode, setVendorCode] = useState(po?.vendorCode || '');
  const [paymentTerms, setPaymentTerms] = useState(po?.paymentTerms || '');
  const [poTotal, setPoTotal] = useState(po?.poTotal ? String(po.poTotal) : '');
  const [fileUrl, setFileUrl] = useState(po?.fileUrl || '');
  const [notes, setNotes] = useState(po?.notes || '');
  const [lines, setLines] = useState<Line[]>(po?.items.length ? po.items.map((i) => ({ productId: i.productId, itemCode: i.itemCode || '', qty: String(i.qty), rate: i.rate ? String(i.rate) : '' })) : [EMPTY_LINE]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Product[]>('/api/products').then((rows) => setProducts(rows.filter((p) => p.active !== false))).catch(() => {});
    // Office: customer search and the customer's delivery sites.
    if (!fixedCustomerId) api<CustomerOption[]>('/api/customers?status=ACTIVE').then(setCustomers).catch(() => {});
  }, [fixedCustomerId]);

  const customer = customers.find((c) => c.id === customerId);
  const sites = customer?.deliveryAddresses ?? [];
  const q = query.toLowerCase();
  const matches = q ? customers.filter((c) => c.name.toLowerCase().includes(q) || (c.shortName || '').toLowerCase().includes(q) || c.phone.includes(q) || c.customerCode.toLowerCase().includes(q)).slice(0, 6) : [];
  const setLine = (index: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  // Same sum as the server: basic rate + the product's GST.
  const basic = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const withGst = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0) * (1 + (products.find((p) => p.id === l.productId)?.taxRate ?? 0) / 100), 0);
  const totalMismatch = showRates && Number(poTotal) > 0 && withGst > 0 && Math.abs(Number(poTotal) - withGst) > 1;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      setFileUrl(await uploadFile(file));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const body = {
        customerId,
        poNumber,
        poDate,
        validTill: validTill || null,
        deliveryDate: deliveryDate || null,
        deliveryAddressId: addressId || null,
        refNumber,
        vendorCode,
        paymentTerms,
        poTotal: poTotal || null,
        fileUrl: fileUrl || null,
        notes,
        items: lines.filter((l) => l.productId).map((l) => ({ productId: l.productId, itemCode: l.itemCode, qty: Number(l.qty), rate: Number(l.rate) || 0 })),
      };
      const res = po ? await apiWithMessage(`/api/customer-pos/${po.id}`, { action: 'edit', ...body }, 'PATCH') : await apiWithMessage('/api/customer-pos', body);
      cue('success');
      onSaved(res.message || 'PO saved.');
    } catch (e) {
      cue('error');
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      wide
      title={po ? `Edit PO ${po.poNumber}` : 'New customer PO'}
      onClose={onClose}
      footer={
        <>
          <Button tone="secondary" onClick={onClose}>Cancel</Button>
          <Button busy={busy} disabled={!customerId || !poNumber.trim() || uploading} onClick={save}>{po ? 'Save changes' : 'Save PO'}</Button>
        </>
      }
    >
      {!fixedCustomerId && !po && (
        customer ? (
          <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center text-xs">
            <div className="min-w-0">
              <div className="text-sm font-black truncate">{partyLabel(customer.shortName, customer.name)}</div>
              <div className="opacity-70">{customer.phone} · {customer.customerCode}</div>
            </div>
            <button type="button" onClick={() => { setCustomerId(''); setAddressId(''); }} className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 font-black">Change</button>
          </div>
        ) : (
          <Field label="Customer">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, mobile or code" className={inputClass} />
            <div className="mt-1 grid sm:grid-cols-2 gap-1.5">
              {matches.map((c) => (
                <button key={c.id} type="button" onClick={() => { setCustomerId(c.id); setQuery(''); setAddressId(''); }} className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs">
                  <strong className="text-sm">{partyLabel(c.shortName, c.name)}</strong>
                  <div className="text-slate-500">{c.phone} · {c.customerCode}</div>
                </button>
              ))}
            </div>
          </Field>
        )
      )}
      {po?.customer && <div className="text-xs font-bold text-slate-600">{partyLabel(po.customer.shortName, po.customer.name)} · {po.customer.customerCode}</div>}

      <Field label="PO copy" hint="PDF or photo, up to 5 MB">
        <div className="flex flex-wrap items-center gap-2">
          <label className={cx('inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200', uploading && 'opacity-50 pointer-events-none')}>
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : fileUrl ? 'Replace file' : 'Upload file'}
            <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
              <FileText className="h-3.5 w-3.5" /> View PO copy
            </a>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="PO number" className="col-span-2 sm:col-span-1">
          <input value={poNumber} onChange={(e) => setPoNumber(e.target.value.toUpperCase())} placeholder="As on the PO" className={inputClass} />
        </Field>
        <Field label="PO date">
          <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Valid till" hint="End date / validity">
          <input type="date" min={poDate} value={validTill} onChange={(e) => setValidTill(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Deliver on">
          <input type="date" min={poDate} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Our vendor code" hint="Printed on the invoice">
          <input value={vendorCode} onChange={(e) => setVendorCode(e.target.value.toUpperCase())} className={inputClass} />
        </Field>
        <Field label="Quotation / indent no.">
          <input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Payment terms" className="col-span-2 sm:col-span-1">
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 30 days from GRN" className={inputClass} />
        </Field>
        {sites.length > 0 && (
          <Field label="Deliver to (site)" className="col-span-2">
            <select value={addressId} onChange={(e) => setAddressId(e.target.value)} className={inputClass}>
              <option value="">Customer&apos;s default address</option>
              {sites.map((a) => (
                <option key={a.id} value={a.id}>{a.label}: {a.address}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Items</span>
          <span className="text-[10px] text-slate-400">Leave empty to save only the PO number and copy</span>
        </div>
        {lines.map((l, i) => {
          const delivered = po?.items.find((it) => it.productId === l.productId)?.deliveredQty || 0;
          return (
            <div key={i} className={cx('grid gap-2 items-start', showRates ? 'grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_7rem_5rem_7rem_auto]' : 'grid-cols-[1fr_5rem_auto] sm:grid-cols-[1fr_7rem_5rem_auto]')}>
              <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })} className={cx(inputClass, showRates && 'col-span-2 sm:col-span-1')} aria-label="Product">
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={lines.some((x, j) => j !== i && x.productId === p.id)}>{p.name}</option>
                ))}
              </select>
              <input value={l.itemCode} onChange={(e) => setLine(i, { itemCode: e.target.value })} placeholder="Their item code" className={cx(inputClass, !showRates && 'hidden sm:block')} aria-label="Customer item code" />
              <div>
                <input type="number" min={delivered || 1} inputMode="decimal" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} placeholder="Qty" className={inputClass} aria-label="Quantity" />
                {delivered > 0 && <div className="text-[10px] text-slate-500 mt-0.5">{delivered} delivered</div>}
              </div>
              {showRates && <input type="number" min={0} step="0.01" inputMode="decimal" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} placeholder="Basic rate" className={inputClass} aria-label="Basic rate before GST" />}
              <button type="button" disabled={delivered > 0} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [EMPTY_LINE]))} aria-label="Remove line" className="p-2.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        <Button type="button" tone="ghost" size="sm" onClick={() => setLines((ls) => [...ls, EMPTY_LINE])}>
          <Plus className="h-3.5 w-3.5" /> Add item
        </Button>
        {showRates && <p className="text-[10px] text-slate-400">Enter the basic rate as on the PO (before GST); GST is added on orders and invoices. Leave it empty to use the customer&apos;s normal rate.</p>}
      </div>

      {showRates && (
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <Field label="PO grand total (with GST)" hint="As printed on the PO — used to cross-check">
            <input type="number" min={0} step="0.01" inputMode="decimal" value={poTotal} onChange={(e) => setPoTotal(e.target.value)} className={inputClass} />
          </Field>
          {basic > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Basic</span><span className="font-mono">{inr(basic)}</span></div>
              <div className="flex justify-between font-bold"><span>With GST</span><span className="font-mono">{inr(withGst)}</span></div>
            </div>
          )}
        </div>
      )}
      {totalMismatch && (
        <p className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" /> PO total {inr(Number(poTotal))} does not match the items with GST ({inr(withGst)}). Check the rates and quantities.
        </p>
      )}

      <Field label="Notes">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>
      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{error}</div>}
    </Modal>
  );
}
