'use client';

import React, { useMemo, useState } from 'react';
import { PackageCheck, Plus, Trash2, Undo2, XCircle } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Column, LedgerOption, money, PeriodBar, plain, ReportTable, sum, Tabs, usePeriod } from './shared';

interface NoteItem { productId: string | null; productName?: string; description?: string; quantity: number; rate: number; taxRate: number; totalAmount: number }
interface CreditNote { id: string; noteNumber: string; date: string; customerName: string; customerGstin: string | null; invoiceNumber: string | null; reason: string; subTotal: number; totalCgst: number; totalSgst: number; totalIgst: number; grandTotal: number; stockReturned: boolean; refundAmount: number; refundMode: string; status: string; notes: string | null; items: NoteItem[] }
interface DebitNote { id: string; noteNumber: string; date: string; supplierName: string; supplierGstin: string | null; billNumber: string | null; supplierInvoiceNo: string | null; reason: string; subTotal: number; totalCgst: number; totalSgst: number; totalIgst: number; grandTotal: number; stockReturned: boolean; itcReversed: boolean; status: string; notes: string | null; items: NoteItem[] }
interface Party { id: string; name: string; shortName?: string | null; type: string; gstin?: string | null }
interface InvoiceOpt { id: string; invoiceNumber: string; date: string; grandTotal: number; credited: number; items: { productId: string | null; productName: string; hsnCode: string; unit: string; quantity: number; unitPrice: number; taxRate: number; returned: number }[] }
interface BillOpt { id: string; billNumber: string; supplierId: string; supplierInvoiceNo: string; date: string; grandTotal: number; status: string; items: { productId: string | null; description: string; hsnCode: string; unit: string; quantity: number; rate: number; taxRate: number }[] }
interface Product { id: string; name: string; hsnCode: string; unit: string; taxRate: number; salePrice: number; purchasePrice?: number }
interface Warehouse { id: string; name: string }

const CN_REASONS: [string, string][] = [
  ['RETURN', 'Cylinders returned'],
  ['RATE_DIFFERENCE', 'Rate difference / discount'],
  ['DAMAGED', 'Damaged / leaking cylinder'],
  ['OTHER', 'Other'],
];
const DN_REASONS: [string, string][] = [
  ['RETURN', 'Returned to plant'],
  ['SHORT_SUPPLY', 'Short supply / short weight'],
  ['RATE_DIFFERENCE', 'Rate difference'],
  ['DAMAGED', 'Damaged / defective'],
  ['OTHER', 'Other'],
];
const reasonLabel = (list: [string, string][], v: string) => list.find(([k]) => k === v)?.[1] || v;

export default function ReturnsPanel({ initial = 'credit' }: { initial?: 'credit' | 'debit' }) {
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState<'credit' | 'debit'>(initial);
  const [period, setPeriod] = usePeriod('month');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<{ id: string; number: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const onError = (m: string) => showToast(m, 'error');
  const cnQ = useApiData<CreditNote[]>(tab === 'credit' ? `/api/books/credit-notes?from=${period.from}&to=${period.to}` : null, onError);
  const dnQ = useApiData<DebitNote[]>(tab === 'debit' ? `/api/books/debit-notes?from=${period.from}&to=${period.to}` : null, onError);

  const cancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await api(tab === 'credit' ? '/api/books/credit-notes' : '/api/books/debit-notes', { method: 'PATCH', body: { id: cancelling.id, reason } });
      showToast(`${cancelling.number} cancelled.`);
      setCancelling(null);
      setReason('');
      if (tab === 'credit') cnQ.reload();
      else dnQ.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const status = (s: string) => <Badge tone={s === 'Cancelled' ? 'slate' : 'green'}>{s}</Badge>;
  const cnCols: Column<CreditNote>[] = [
    { label: 'Date', render: (n) => n.date },
    { label: 'Credit note', render: (n) => <span className="font-mono font-bold">{n.noteNumber}</span> },
    { label: 'Customer', render: (n) => <div><div className="font-bold">{n.customerName}</div><div className="text-[10px] text-slate-400">{n.invoiceNumber ? `against ${n.invoiceNumber}` : 'not against an invoice'}</div></div> },
    { label: 'Reason', render: (n) => <div className="flex flex-wrap gap-1"><span>{reasonLabel(CN_REASONS, n.reason)}</span>{n.stockReturned && <Badge tone="blue">Stock in</Badge>}</div> },
    { label: 'Taxable', align: 'right', render: (n) => plain(n.subTotal), total: (r) => plain(sum(r.filter((x) => x.status !== 'Cancelled'), (x) => x.subTotal)) },
    { label: 'GST', align: 'right', render: (n) => plain(n.totalCgst + n.totalSgst + n.totalIgst), total: (r) => plain(sum(r.filter((x) => x.status !== 'Cancelled'), (x) => x.totalCgst + x.totalSgst + x.totalIgst)) },
    { label: 'Total', align: 'right', render: (n) => <strong className={cx(n.status === 'Cancelled' && 'line-through text-slate-400')}>{plain(n.grandTotal)}</strong>, total: (r) => plain(sum(r.filter((x) => x.status !== 'Cancelled'), (x) => x.grandTotal)) },
    { label: 'Refund', align: 'right', render: (n) => (n.refundAmount ? `${plain(n.refundAmount)} ${n.refundMode.toLowerCase()}` : '—') },
    { label: 'Status', render: (n) => status(n.status) },
    { label: '', render: (n) => (n.status !== 'Cancelled' && !n.refundAmount ? <button onClick={() => setCancelling({ id: n.id, number: n.noteNumber })} className="text-rose-600 hover:text-rose-800" title="Cancel"><XCircle className="h-4 w-4" /></button> : null) },
  ];
  const dnCols: Column<DebitNote>[] = [
    { label: 'Date', render: (n) => n.date },
    { label: 'Debit note', render: (n) => <span className="font-mono font-bold">{n.noteNumber}</span> },
    { label: 'Supplier', render: (n) => <div><div className="font-bold">{n.supplierName}</div><div className="text-[10px] text-slate-400">{n.billNumber ? `against ${n.billNumber} / ${n.supplierInvoiceNo}` : 'not against a bill'}</div></div> },
    { label: 'Reason', render: (n) => <div className="flex flex-wrap gap-1"><span>{reasonLabel(DN_REASONS, n.reason)}</span>{n.stockReturned && <Badge tone="blue">Stock out</Badge>}{!n.itcReversed && <Badge tone="amber">ITC kept</Badge>}</div> },
    { label: 'Taxable', align: 'right', render: (n) => plain(n.subTotal), total: (r) => plain(sum(r.filter((x) => x.status !== 'Cancelled'), (x) => x.subTotal)) },
    { label: 'GST', align: 'right', render: (n) => plain(n.totalCgst + n.totalSgst + n.totalIgst), total: (r) => plain(sum(r.filter((x) => x.status !== 'Cancelled'), (x) => x.totalCgst + x.totalSgst + x.totalIgst)) },
    { label: 'Total', align: 'right', render: (n) => <strong className={cx(n.status === 'Cancelled' && 'line-through text-slate-400')}>{plain(n.grandTotal)}</strong>, total: (r) => plain(sum(r.filter((x) => x.status !== 'Cancelled'), (x) => x.grandTotal)) },
    { label: 'Status', render: (n) => status(n.status) },
    { label: '', render: (n) => (n.status !== 'Cancelled' ? <button onClick={() => setCancelling({ id: n.id, number: n.noteNumber })} className="text-rose-600 hover:text-rose-800" title="Cancel"><XCircle className="h-4 w-4" /></button> : null) },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader
        icon={Undo2}
        title="Returns — credit & debit notes"
        subtitle="Sales returns / rate differences to customers (credit notes, GSTR-1 table 9B) and returns to the plant (debit notes, ITC reversal). Stock, ledgers and GST update together."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {tab === 'credit' ? 'New credit note' : 'New debit note'}</Button>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} items={[['credit', 'Sales returns (credit notes)'], ['debit', 'Purchase returns (debit notes)']]} />
        <PeriodBar value={period} onChange={setPeriod} />
      </div>
      {tab === 'credit' ? <ReportTable rows={cnQ.data ?? []} columns={cnCols} rowKey={(n) => n.id} empty="No credit notes in this period." /> : <ReportTable rows={dnQ.data ?? []} columns={dnCols} rowKey={(n) => n.id} empty="No debit notes in this period." />}

      {creating && tab === 'credit' && <CreditNoteForm onClose={() => setCreating(false)} onSaved={(m) => { showToast(m); setCreating(false); cnQ.reload(); }} onError={onError} />}
      {creating && tab === 'debit' && <DebitNoteForm onClose={() => setCreating(false)} onSaved={(m) => { showToast(m); setCreating(false); dnQ.reload(); }} onError={onError} />}
      <Modal open={!!cancelling} title={`Cancel ${cancelling?.number || ''}`} onClose={() => setCancelling(null)} footer={<><Button tone="secondary" onClick={() => setCancelling(null)}>Back</Button><Button tone="danger" busy={busy} disabled={!reason.trim()} onClick={cancel}>Cancel note</Button></>}>
        <p className="text-xs text-slate-600">Stock moved by the note goes back, and the ledger entry is reversed.</p>
        <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></Field>
      </Modal>
    </div>
  );
}

type Line = { productId: string; name: string; hsnCode: string; unit: string; quantity: string; rate: string; taxRate: string; max?: number };

function LinesTable({ lines, setLines, products, inclusive, allowAdd }: { lines: Line[]; setLines: (l: Line[]) => void; products: Product[]; inclusive: boolean; allowAdd: boolean }) {
  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = (l: Line) => {
    const base = (Number(l.quantity) || 0) * (Number(l.rate) || 0);
    return inclusive ? base : base * (1 + (Number(l.taxRate) || 0) / 100);
  };
  return (
    <div className="rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-xs min-w-[640px]">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="p-2 text-left">Item</th>
            <th className="p-2 w-24 text-right">Qty</th>
            <th className="p-2 w-32 text-right">{inclusive ? 'Rate (incl. GST)' : 'Rate (excl. GST)'}</th>
            <th className="p-2 w-20 text-right">GST %</th>
            <th className="p-2 w-28 text-right">Amount</th>
            <th className="p-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="p-1.5">
                {allowAdd ? (
                  <select value={l.productId} onChange={(e) => { const p = products.find((x) => x.id === e.target.value); set(i, p ? { productId: p.id, name: p.name, hsnCode: p.hsnCode, unit: p.unit, taxRate: String(p.taxRate), rate: String(inclusive ? p.salePrice : p.purchasePrice || '') } : { productId: '' }); }} className={cx(inputClass, 'py-1.5 text-xs')}>
                    <option value="">Choose product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <div className="px-1 font-semibold">{l.name}{l.max !== undefined && <span className="block text-[10px] font-normal text-slate-400">up to {l.max}</span>}</div>
                )}
              </td>
              <td className="p-1.5"><input type="number" min={0} max={l.max} value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs text-right')} /></td>
              <td className="p-1.5"><input type="number" min={0} step="0.01" value={l.rate} onChange={(e) => set(i, { rate: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs text-right font-mono')} /></td>
              <td className="p-1.5 text-right pr-3">{l.taxRate}%</td>
              <td className="p-1.5 text-right font-mono font-bold pr-3">{plain(total(l))}</td>
              <td className="p-1.5 text-center">{allowAdd && lines.length > 1 && <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
        {allowAdd ? <button onClick={() => setLines([...lines, { productId: '', name: '', hsnCode: '', unit: 'PCS', quantity: '', rate: '', taxRate: '18' }])} className="text-xs font-bold text-emerald-700 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add line</button> : <span />}
        <span className="text-sm font-black">Total {money(Math.round(lines.reduce((s, l) => s + total(l), 0)))}</span>
      </div>
    </div>
  );
}

function CreditNoteForm({ onClose, onSaved, onError }: { onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const customers = useApiData<Party[]>('/api/customers', onError).data ?? [];
  const products = useApiData<Product[]>('/api/products', onError).data ?? [];
  const warehouses = useApiData<Warehouse[]>('/api/cylinder/warehouses', onError).data ?? [];
  const ledgers = useApiData<LedgerOption[]>('/api/books/accounts', onError).data ?? [];
  const [customerId, setCustomerId] = useState('');
  const invoices = useApiData<InvoiceOpt[]>(customerId ? `/api/books/credit-notes?invoicesFor=${customerId}` : null, onError).data ?? [];
  const [invoiceId, setInvoiceId] = useState('');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('RETURN');
  const [returnStock, setReturnStock] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [refundMode, setRefundMode] = useState<'NONE' | 'CASH' | 'BANK'>('NONE');
  const [refundAccountId, setRefundAccountId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', name: '', hsnCode: '', unit: 'PCS', quantity: '', rate: '', taxRate: '18' }]);
  const [busy, setBusy] = useState(false);
  const invoice = invoices.find((i) => i.id === invoiceId);
  const moneyLedgers = ledgers.filter((l) => (refundMode === 'BANK' ? l.groupName === 'Bank Accounts' : l.groupName === 'Cash-in-Hand'));
  const refundLedger = refundAccountId && moneyLedgers.some((l) => l.id === refundAccountId) ? refundAccountId : moneyLedgers[0]?.id || '';
  const total = Math.round(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0));

  const pickInvoice = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) setLines(inv.items.map((it) => ({ productId: it.productId || '', name: it.productName, hsnCode: it.hsnCode, unit: it.unit, quantity: '', rate: String(it.unitPrice), taxRate: String(it.taxRate), max: Math.max(0, it.quantity - it.returned) })));
    else setLines([{ productId: '', name: '', hsnCode: '', unit: 'PCS', quantity: '', rate: '', taxRate: '18' }]);
  };
  const pickReason = (r: string) => {
    setReason(r);
    setReturnStock(r === 'RETURN');
  };

  const save = async () => {
    setBusy(true);
    try {
      const n = await api<{ noteNumber: string }>('/api/books/credit-notes', {
        body: {
          date,
          customerId,
          invoiceId: invoiceId || null,
          reason,
          returnStock,
          warehouseId: warehouseId || null,
          refundMode,
          refundAccountId: refundMode === 'NONE' ? null : refundLedger,
          refundAmount: Number(refundAmount) || 0,
          notes,
          items: lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ productId: l.productId || null, productName: l.name, hsnCode: l.hsnCode, unit: l.unit, quantity: Number(l.quantity), rate: Number(l.rate), taxRate: Number(l.taxRate) })),
        },
      });
      onSaved(`Credit note ${n.noteNumber} saved.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open wide title="New credit note (sales return)" onClose={onClose} footer={<><Button tone="secondary" onClick={onClose}>Close</Button><Button busy={busy} disabled={!customerId || total <= 0} onClick={save}>Save · {money(total)}</Button></>}>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Customer">
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); pickInvoice(''); }} className={inputClass}>
            <option value="">Choose customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.shortName || c.name}{c.shortName ? ` (${c.name})` : ''}</option>)}
          </select>
        </Field>
        <Field label="Against invoice" hint={invoice ? `Billed ${money(invoice.grandTotal)} · already credited ${money(invoice.credited)}` : 'Optional, but needed for GSTR-1'}>
          <select value={invoiceId} onChange={(e) => pickInvoice(e.target.value)} disabled={!customerId} className={inputClass}>
            <option value="">— none —</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.date} · {money(i.grandTotal)}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Reason">
        <div className="flex flex-wrap gap-1">
          {CN_REASONS.map(([k, label]) => <button key={k} type="button" onClick={() => pickReason(k)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold border', reason === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>{label}</button>)}
        </div>
      </Field>
      {reason === 'RATE_DIFFERENCE' && <p className="text-[11px] text-slate-500">Enter the quantity billed and the reduction per cylinder (incl. GST) as the rate — no stock moves.</p>}
      <LinesTable lines={lines} setLines={setLines} products={products} inclusive allowAdd={!invoice} />
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={returnStock} onChange={(e) => setReturnStock(e.target.checked)} />
          <PackageCheck className="h-4 w-4 text-sky-700" /> Full cylinders come back into
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!returnStock} className={cx(inputClass, 'w-44 py-1 text-xs')}>
            <option value="">default godown</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Refund to customer">
          <select value={refundMode} onChange={(e) => setRefundMode(e.target.value as 'NONE' | 'CASH' | 'BANK')} className={inputClass}>
            <option value="NONE">No refund — adjust in dues</option>
            <option value="CASH">Refund in cash</option>
            <option value="BANK">Refund from bank</option>
          </select>
        </Field>
        {refundMode !== 'NONE' && (
          <>
            <Field label="Paid from">
              <select value={refundLedger} onChange={(e) => setRefundAccountId(e.target.value)} className={inputClass}>
                {moneyLedgers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Refund amount"><input type="number" min={0} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder={String(total)} className={inputClass} /></Field>
          </>
        )}
      </div>
      <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="e.g. 2 cylinders returned unused" /></Field>
    </Modal>
  );
}

function DebitNoteForm({ onClose, onSaved, onError }: { onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const suppliers = useApiData<Party[]>('/api/customers?type=Vendor', onError).data ?? [];
  const products = useApiData<Product[]>('/api/products', onError).data ?? [];
  const warehouses = useApiData<Warehouse[]>('/api/cylinder/warehouses', onError).data ?? [];
  const [supplierId, setSupplierId] = useState('');
  const billsQ = useApiData<BillOpt[]>(supplierId ? `/api/books/purchases?supplierId=${supplierId}` : null, onError);
  const bills = useMemo(() => (billsQ.data ?? []).filter((b) => b.status !== 'Cancelled'), [billsQ.data]);
  const [billId, setBillId] = useState('');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('RETURN');
  const [returnStock, setReturnStock] = useState(true);
  const [itcReversed, setItcReversed] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', name: '', hsnCode: '', unit: 'PCS', quantity: '', rate: '', taxRate: '5' }]);
  const [busy, setBusy] = useState(false);
  const bill = bills.find((b) => b.id === billId);
  const total = Math.round(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0) * (1 + (Number(l.taxRate) || 0) / 100), 0));

  const pickBill = (id: string) => {
    setBillId(id);
    const b = bills.find((x) => x.id === id);
    if (b) setLines(b.items.map((it) => ({ productId: it.productId || '', name: it.description, hsnCode: it.hsnCode, unit: it.unit, quantity: '', rate: String(it.rate), taxRate: String(it.taxRate), max: it.quantity })));
    else setLines([{ productId: '', name: '', hsnCode: '', unit: 'PCS', quantity: '', rate: '', taxRate: '5' }]);
  };

  const save = async () => {
    setBusy(true);
    try {
      const n = await api<{ noteNumber: string }>('/api/books/debit-notes', {
        body: { date, supplierId, purchaseBillId: billId || null, reason, returnStock, itcReversed, warehouseId: warehouseId || null, notes, items: lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ productId: l.productId || null, description: l.name, hsnCode: l.hsnCode, unit: l.unit, quantity: Number(l.quantity), rate: Number(l.rate), taxRate: Number(l.taxRate) })) },
      });
      onSaved(`Debit note ${n.noteNumber} saved.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open wide title="New debit note (purchase return)" onClose={onClose} footer={<><Button tone="secondary" onClick={onClose}>Close</Button><Button busy={busy} disabled={!supplierId || total <= 0} onClick={save}>Save · {money(total)}</Button></>}>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Supplier / plant">
          <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); pickBill(''); }} className={inputClass}>
            <option value="">Choose supplier…</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Against purchase bill" hint={bill ? `Bill total ${money(bill.grandTotal)}` : 'Optional'}>
          <select value={billId} onChange={(e) => pickBill(e.target.value)} disabled={!supplierId} className={inputClass}>
            <option value="">— none —</option>
            {bills.map((b) => <option key={b.id} value={b.id}>{b.billNumber} · {b.supplierInvoiceNo} · {money(b.grandTotal)}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Reason">
        <div className="flex flex-wrap gap-1">
          {DN_REASONS.map(([k, label]) => <button key={k} type="button" onClick={() => { setReason(k); setReturnStock(k === 'RETURN' || k === 'DAMAGED'); }} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold border', reason === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>{label}</button>)}
        </div>
      </Field>
      <LinesTable lines={lines} setLines={setLines} products={products} inclusive={false} allowAdd={!bill} />
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={returnStock} onChange={(e) => setReturnStock(e.target.checked)} /> Full cylinders go back from
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!returnStock} className={cx(inputClass, 'w-44 py-1 text-xs')}>
            <option value="">default godown</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={itcReversed} onChange={(e) => setItcReversed(e.target.checked)} /> Reverse the GST input credit (ITC)</label>
      </div>
      <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="e.g. 3 cylinders leaking, returned with truck MH12…" /></Field>
    </Modal>
  );
}
