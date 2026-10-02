'use client';

import React, { useMemo, useState } from 'react';
import { Eye, FileUp, Pencil, IndianRupee, Landmark, PackageCheck, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Column, LedgerOption, money, PeriodBar, plain, ReportTable, sum, usePeriod } from './shared';
import { SupplierSelect } from './SupplierSelect';
import { TruckPicker } from '../TruckPicker';
import { QRCodeSVG } from 'qrcode.react';

interface BillItem { id: string; productId: string | null; materialCode: string | null; description: string; hsnCode: string; quantity: number; unit: string; rate: number; taxRate: number; taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number }
interface Bill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGstin: string | null;
  supplierInvoiceNo: string;
  date: string;
  dueDate: string | null;
  isIgst: boolean;
  subTotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  advanceAdjusted: number;
  status: string;
  itcEligible: boolean;
  stockReceived: boolean;
  warehouseId?: string | null;
  warehouseName?: string | null;
  stockSplit?: { deliveryBoyId: string; deliveryBoyName: string; productId: string; qty: number }[];
  vehicleNumber: string | null;
  driverName: string | null;
  sapDocNo: string | null;
  deliveryNo: string | null;
  salesOrderNo: string | null;
  irn: string | null;
  irnDate: string | null;
  einvoiceQr: string | null;
  invoicePdfUrl: string | null;
  notes: string | null;
  createdBy: string;
  items: BillItem[];
}
interface Product { id: string; name: string; hsnCode: string; unit: string; taxRate: number; purchasePrice?: number; weightVolume?: number | null; weightUnit?: string | null; materialCode?: string | null }
interface Warehouse { id: string; name: string; isDefault: boolean }

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'slate'> = { Paid: 'green', Partial: 'amber', Unpaid: 'red', Cancelled: 'slate' };

export default function PurchasesPanel() {
  const [toast, showToast] = useToast();
  const [period, setPeriod] = usePeriod('month');
  const [editing, setEditing] = useState<Bill | 'new' | null>(null);
  const [viewing, setViewing] = useState<Bill | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [cancelling, setCancelling] = useState<Bill | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const billsQ = useApiData<Bill[]>(`/api/books/purchases?from=${period.from}&to=${period.to}`, (m) => showToast(m, 'error'));
  const bills = billsQ.data ?? [];
  const live = bills.filter((b) => b.status !== 'Cancelled');
  const plantQ = useApiData<PlantRow[]>('/api/books/plant-balance', (m) => showToast(m, 'error'));
  const [depositing, setDepositing] = useState<string | null>(null);
  const reload = () => {
    billsQ.reload();
    plantQ.reload();
  };
  /** Paid only from the plant balance (no payment voucher) — still editable / cancellable. */
  const noPayments = (b: Bill) => b.paidAmount - (b.advanceAdjusted || 0) < 0.01;

  const cancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await api('/api/books/purchases', { method: 'PATCH', body: { id: cancelling.id, reason } });
      showToast(`${cancelling.billNumber} deleted.`);
      setCancelling(null);
      setReason('');
      reload();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Bill>[] = [
    { label: 'Date', render: (b) => b.date },
    { label: 'Our no.', render: (b) => <span className="font-mono font-bold">{b.billNumber}</span> },
    { label: 'Supplier', render: (b) => <div><div className="font-bold">{b.supplierName}</div><div className="text-[10px] text-slate-400">Bill {b.supplierInvoiceNo}{b.supplierGstin ? ` · ${b.supplierGstin}` : ''}</div></div> },
    { label: 'Taxable', align: 'right', render: (b) => plain(b.subTotal), total: (rows) => plain(sum(rows.filter((r) => r.status !== 'Cancelled'), (r) => r.subTotal)) },
    { label: 'GST', align: 'right', render: (b) => plain(b.totalCgst + b.totalSgst + b.totalIgst), total: (rows) => plain(sum(rows.filter((r) => r.status !== 'Cancelled'), (r) => r.totalCgst + r.totalSgst + r.totalIgst)) },
    { label: 'Total', align: 'right', render: (b) => <strong>{plain(b.grandTotal)}</strong>, total: (rows) => plain(sum(rows.filter((r) => r.status !== 'Cancelled'), (r) => r.grandTotal)) },
    { label: 'Due', align: 'right', render: (b) => (b.status === 'Cancelled' ? '—' : plain(b.grandTotal - b.paidAmount)), total: (rows) => plain(sum(rows.filter((r) => r.status !== 'Cancelled'), (r) => r.grandTotal - r.paidAmount)) },
    {
      label: 'Status',
      render: (b) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={STATUS_TONE[b.status] || 'slate'}>{b.status}</Badge>
          {b.status !== 'Cancelled' && b.advanceAdjusted > 0 && <Badge tone="violet">From plant balance{b.advanceAdjusted + 0.5 < b.grandTotal ? ` ${plain(b.advanceAdjusted)}` : ''}</Badge>}
          {b.stockReceived && b.status !== 'Cancelled' && b.warehouseName && <Badge tone="blue">Stock in · {b.warehouseName}</Badge>}
          {b.stockReceived && b.status !== 'Cancelled' && !!b.stockSplit?.length && <Badge tone="blue">Truck → {new Set(b.stockSplit.map((s) => s.deliveryBoyId)).size} boy(s)</Badge>}
          {!b.itcEligible && <Badge tone="amber">No ITC</Badge>}
        </div>
      ),
    },
    {
      label: '',
      render: (b) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setViewing(b)} title="View" className="p-1 text-slate-500 hover:text-slate-900"><Eye className="h-4 w-4" /></button>
          {b.status !== 'Cancelled' && b.status !== 'Paid' && (
            <button onClick={() => setPaying(b)} title="Record a payment to the supplier" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" /> Pay
            </button>
          )}
          {b.status !== 'Cancelled' && <button onClick={() => setEditing(b)} title="Edit" className="p-1 text-slate-500 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>}
          <button onClick={() => setCancelling(b)} title="Delete" className="p-1 text-rose-600 hover:text-rose-800"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={ShoppingCart} title="Purchase bills" subtitle="Refill bills from the bottling plant and any other supplier. GST input credit, stock receipt into the godown and the supplier's ledger update together." actions={<><Button tone="secondary" onClick={() => setDepositing('')}><Landmark className="h-4 w-4" /> Add to plant balance</Button><Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New purchase bill</Button></>} />
      <PeriodBar value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Bills</div><div className="text-xl font-black">{live.length}</div></Card>
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Taxable value</div><div className="text-xl font-black font-mono">{money(sum(live, (b) => b.subTotal))}</div></Card>
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Input GST (ITC)</div><div className="text-xl font-black font-mono text-emerald-700">{money(sum(live.filter((b) => b.itcEligible), (b) => b.totalCgst + b.totalSgst + b.totalIgst))}</div></Card>
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Still to pay</div><div className="text-xl font-black font-mono text-rose-600">{money(sum(live, (b) => b.grandTotal - b.paidAmount))}</div></Card>
      </div>
      <PlantBalances rows={plantQ.data ?? []} onAdd={(id) => setDepositing(id)} />
      <ReportTable rows={bills} columns={columns} rowKey={(b) => b.id} onRowClick={setViewing} empty="No purchase bills in this period." />
      {depositing !== null && (
        <PlantDeposit
          supplierId={depositing}
          onClose={() => setDepositing(null)}
          onSaved={(m) => {
            showToast(m);
            setDepositing(null);
            reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}

      {editing && (
        <BillForm
          bill={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            showToast(m);
            setEditing(null);
            reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}
      {viewing && <BillView bill={viewing} onClose={() => setViewing(null)} onEdit={viewing.status !== 'Cancelled' ? () => { setEditing(viewing); setViewing(null); } : undefined} />}
      {paying && (
        <PayBill
          bill={paying}
          onClose={() => setPaying(null)}
          onSaved={(m) => {
            showToast(m);
            setPaying(null);
            reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}
      <Modal
        open={!!cancelling}
        title={`Delete ${cancelling?.billNumber || ''}`}
        onClose={() => setCancelling(null)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setCancelling(null)}>Back</Button>
            <Button tone="danger" busy={busy} disabled={!reason.trim()} onClick={cancel}>Delete bill</Button>
          </>
        }
      >
        <p className="text-xs text-slate-600">The bill is deleted completely — its GST credit, supplier dues, purchase voucher and stock entry are all removed. This cannot be undone (a copy stays in Admin → Audit log).</p>
        {cancelling && cancelling.status !== 'Cancelled' && !noPayments(cancelling) && <p className="text-xs font-semibold text-violet-700">₹{plain(cancelling.paidAmount - (cancelling.advanceAdjusted || 0))} paid against this bill is kept as plant balance (advance) with {cancelling.supplierName} for the next bills.</p>}
        {cancelling?.stockReceived && cancelling.status !== 'Cancelled' && <p className="text-xs font-semibold text-amber-700">The {cancelling.items.reduce((s, i) => s + i.quantity, 0)} cylinders received on this bill will be taken back out of {cancelling.stockSplit?.length ? `the delivery boys (${[...new Set(cancelling.stockSplit.map((s) => s.deliveryBoyName))].join(', ')}) and the godown` : 'the godown'}.</p>}
        <Field label="Reason (required)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>
      </Modal>
    </div>
  );
}

interface PlantRow { supplierId: string; name: string; balance: number; unpaidBills: number; unpaidAmount: number }

/** Money lying with each plant / supplier (+) or owed to it (−), from the books. */
function PlantBalances({ rows, onAdd }: { rows: PlantRow[]; onAdd: (supplierId: string) => void }) {
  if (!rows.length) return null;
  // One slim strip: plant name, balance and a small "+" to add money.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase font-bold text-slate-500">Plant balance</span>
      {rows.map((r) => (
        <div key={r.supplierId} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-3 pr-1 py-1 text-xs">
          <span className="font-bold text-slate-700 max-w-[220px] truncate" title={r.name}>{r.name}</span>
          <span className={cx('font-black font-mono', r.balance >= 0 ? 'text-emerald-700' : 'text-rose-600')}>{money(Math.abs(r.balance))}</span>
          <span className={cx('text-[10px] font-bold', r.balance >= 0 ? 'text-emerald-700' : 'text-rose-600')}>{r.balance >= 0 ? 'CR' : 'DR · to pay'}</span>
          {r.unpaidBills > 0 && <span className="text-[10px] font-semibold text-rose-600">{r.unpaidBills} unpaid · {money(r.unpaidAmount)}</span>}
          <button onClick={() => onAdd(r.supplierId)} title="Add money to the plant balance" className="rounded-lg bg-slate-100 p-1 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

/**
 * Money sent to the plant (Payment from cash / bank, no bill) or the opening
 * advance already lying there; the server then settles unpaid bills from it.
 */
function PlantDeposit({ supplierId: initialSupplier, onClose, onSaved, onError }: { supplierId: string; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const ledgersQ = useApiData<LedgerOption[]>('/api/books/accounts', onError);
  const moneyLedgers = (ledgersQ.data ?? []).filter((l) => l.groupName === 'Cash-in-Hand' || l.groupName === 'Bank Accounts');
  const [supplierId, setSupplierId] = useState(initialSupplier);
  const [opening, setOpening] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [fromId, setFromId] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const source = fromId || moneyLedgers.find((l) => l.groupName === 'Bank Accounts')?.id || moneyLedgers[0]?.id || '';

  const save = async () => {
    setBusy(true);
    try {
      const v = await api<{ voucherNumber: string }>('/api/books/plant-balance', { body: { supplierId, amount: Number(amount), date, opening, fromAccountId: opening ? null : source, reference } });
      onSaved(`${v.voucherNumber} saved — plant balance updated, unpaid bills settled from it.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="Add to plant balance" onClose={onClose} footer={<Button busy={busy} disabled={!supplierId || !(Number(amount) > 0) || (!opening && !source)} onClick={save}>Save</Button>}>
      <Field label="Plant / supplier">
        <SupplierSelect value={supplierId} showGstin onError={onError} onChange={(id) => setSupplierId(id)} />
      </Field>
      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
        <button type="button" onClick={() => setOpening(false)} className={cx('rounded-xl border px-3 py-2 text-left', !opening ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600')}>
          Money sent now<div className="font-normal text-[11px]">RTGS / NEFT / cheque from your bank or cash</div>
        </button>
        <button type="button" onClick={() => setOpening(true)} className={cx('rounded-xl border px-3 py-2 text-left', opening ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600')}>
          Opening balance<div className="font-normal text-[11px]">Already with the plant before you started this software</div>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount"><input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={cx(inputClass, 'font-mono')} /></Field>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
      </div>
      {!opening && (
        <Field label="Paid from">
          <select value={source} onChange={(e) => setFromId(e.target.value)} className={inputClass}>
            {moneyLedgers.length === 0 && <option value="">No bank / cash ledger — add one in Books → Ledgers</option>}
            {moneyLedgers.map((l) => (
              <option key={l.id} value={l.id}>{l.name} · balance {money(l.closing)}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label={opening ? 'Note (optional)' : 'UTR / cheque no. (optional)'}><input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} /></Field>
      <p className="text-[11px] text-slate-500">Unpaid bills of this plant are settled from the balance automatically, oldest first.</p>
    </Modal>
  );
}

/** Plant invoices quote LPG per tonne; `basis: 'TONNE'` converts that to a per-cylinder rate. */
type FormLine = { productId: string; materialCode: string; description: string; hsnCode: string; quantity: string; unit: string; rate: string; taxRate: string; basis: 'UNIT' | 'TONNE'; tonneRate: string; kg: string };
const emptyLine = (): FormLine => ({ productId: '', materialCode: '', description: '', hsnCode: '', quantity: '', unit: 'PCS', rate: '', taxRate: '18', basis: 'UNIT', tonneRate: '', kg: '' });
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const lineRate = (l: FormLine) => (l.basis === 'TONNE' ? ((Number(l.tonneRate) || 0) * (Number(l.kg) || 0)) / 1000 : Number(l.rate) || 0);
const kgOf = (p?: Product) => (p?.weightVolume && (!p.weightUnit || p.weightUnit.toUpperCase() === 'KG') ? String(p.weightVolume) : '');

interface ImportedLine { materialCode: string; description: string; quantity: number; kgPerUnit: number | null; tonneRate: number | null; taxable: number; taxRate: number; hsnCode: string }
interface ImportedInvoice {
  invoiceNo: string | null;
  date: string | null;
  vehicleNumber: string | null;
  supplierGstin: string | null;
  supplierName: string;
  supplierAddress: string;
  supplierCity: string;
  supplierId: string | null;
  duplicateOf: string | null;
  lines: ImportedLine[];
  total: number | null;
  plantBalance: number | null;
  booksBalance: number | null;
  sapDocNo: string | null;
  deliveryNo: string | null;
  salesOrderNo: string | null;
  irn: string | null;
  irnDate: string | null;
  einvoiceQr: string | null;
  qrVerified: boolean;
  problems: string[];
  invoicePdfUrl: string | null;
}

/** Cylinder product for an invoice line: its material code, then the same weight, then "19 kg" in the name. */
function matchProduct(products: Product[], l: ImportedLine) {
  const byCode = l.materialCode ? products.find((p) => p.materialCode?.toUpperCase() === l.materialCode.toUpperCase()) : undefined;
  if (byCode) return byCode;
  const kg = l.kgPerUnit ?? Number(l.description.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1]);
  if (!kg) return undefined;
  const byWeight = products.filter((p) => kgOf(p) && Number(kgOf(p)) === kg);
  const byName = products.filter((p) => new RegExp(`(^|[^\\d.])${String(kg).replace('.', '\\.')}\\s*kg`, 'i').test(p.name));
  return byWeight[0] || byName[0];
}

const crdr = (n: number) => `${money(Math.abs(n))} ${n >= 0 ? 'CR' : 'DR'}`;

/** The plant's printed balance (after this invoice) against our books after saving this bill. */
function PlantCheck({ imported, grand }: { imported: ImportedInvoice; grand: number }) {
  if (imported.plantBalance == null || imported.booksBalance == null) return null;
  // A duplicate is already in the books; otherwise this bill will take `grand` out of the balance.
  const after = Math.round((imported.booksBalance - (imported.duplicateOf ? 0 : grand)) * 100) / 100;
  const diff = Math.round((imported.plantBalance - after) * 100) / 100;
  return Math.abs(diff) < 1 ? (
    <div className="font-bold text-emerald-700">✅ Plant balance matches: invoice says {crdr(imported.plantBalance)}, your books after this bill {crdr(after)}</div>
  ) : (
    <div className="font-semibold text-amber-700">
      ⚠️ Plant balance: invoice says {crdr(imported.plantBalance)}, your books after this bill {crdr(after)} — difference {money(Math.abs(diff))}.{' '}
      {diff > 0 ? 'Money sent to the plant (or the opening balance) is probably not entered yet — use "Add to plant balance".' : 'Check for a payment entered twice or a bill not yet entered by the plant.'}
    </div>
  );
}

/** What the import found, and whether our total agrees with the invoice. */
function ImportCheck({ imported, grand, lines }: { imported: ImportedInvoice; grand: number; lines: FormLine[] }) {
  const unmatched = lines.filter((l) => !l.productId).length;
  const totalOk = imported.total != null && Math.abs(imported.total - grand) < 1;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs space-y-1">
      <div className={cx('font-bold', imported.qrVerified ? 'text-emerald-700' : 'text-rose-700')}>
        {imported.qrVerified ? '✅ Genuine e-invoice: the GST QR matches the invoice (no., GSTIN, IRN, date, total).' : '❌ E-invoice QR check failed:'}
      </div>
      {imported.problems.map((p) => <div key={p} className="text-rose-700 pl-4">• {p}</div>)}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-slate-600">
        {imported.sapDocNo && <span>SAP doc <strong className="font-mono">{imported.sapDocNo}</strong></span>}
        {imported.deliveryNo && <span>Delivery <strong className="font-mono">{imported.deliveryNo}</strong></span>}
        {imported.salesOrderNo && <span>Sales order <strong className="font-mono">{imported.salesOrderNo}</strong></span>}
        {imported.irn && <span className="break-all">IRN <span className="font-mono">{imported.irn}</span></span>}
        {imported.invoicePdfUrl && <a href={imported.invoicePdfUrl} target="_blank" rel="noreferrer" className="font-bold text-sky-700 underline">View uploaded PDF</a>}
      </div>
      <div className={cx('font-bold', totalOk ? 'text-emerald-700' : 'text-rose-700')}>
        {imported.total == null ? '⚠️ Invoice total not found — check the lines.' : totalOk ? `✅ Total matches the invoice: ${money(imported.total)}` : `❌ Invoice total ${money(imported.total)} but this bill is ${money(grand)} — check the lines.`}
      </div>
      {imported.duplicateOf && <div className="font-bold text-rose-700">❌ Invoice {imported.invoiceNo} is already entered as {imported.duplicateOf}.</div>}
      {!imported.supplierId && <div className="text-amber-700">Supplier with GSTIN {imported.supplierGstin || '—'} is not in your list — fill mobile no. below and press &quot;Add supplier&quot;.</div>}
      {unmatched > 0 && <div className="text-amber-700">{unmatched} line(s) did not match a product — choose the cylinder, otherwise stock will not be added.</div>}
      <PlantCheck imported={imported} grand={grand} />
    </div>
  );
}

/** Hand cylinders straight off the truck to delivery boys; whatever is left goes to the godown. */
function TruckSplit({ direct, onDirect, boys, products, split, onChange, godownName }: {
  direct: boolean;
  onDirect: (v: boolean) => void;
  boys: { id: string; name: string }[];
  products: { productId: string; name: string; qty: number }[];
  split: Record<string, Record<string, string>>;
  onChange: (s: Record<string, Record<string, string>>) => void;
  godownName: string;
}) {
  const given = (productId: string) => boys.reduce((s, b) => s + (Number(split[b.id]?.[productId]) || 0), 0);
  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
      <div className="font-bold text-slate-700">Where did the truck&apos;s cylinders go?</div>
      <div className="flex flex-wrap gap-4 font-semibold">
        <label className="flex items-center gap-2"><input type="radio" checked={!direct} onChange={() => onDirect(false)} /> All into the godown</label>
        <label className="flex items-center gap-2"><input type="radio" checked={direct} onChange={() => onDirect(true)} /> Handed out from the truck to delivery boys</label>
      </div>
      {direct && (
        boys.length === 0 ? (
          <p className="text-amber-700">No active delivery boys yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs min-w-[360px]">
              <thead className="text-slate-500">
                <tr>
                  <th className="p-1.5 text-left">Delivery boy</th>
                  {products.map((p) => <th key={p.productId} className="p-1.5 text-right whitespace-nowrap">{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {boys.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="p-1.5 font-semibold whitespace-nowrap">{b.name}</td>
                    {products.map((p) => (
                      <td key={p.productId} className="p-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={split[b.id]?.[p.productId] ?? ''}
                          onChange={(e) => onChange({ ...split, [b.id]: { ...split[b.id], [p.productId]: e.target.value } })}
                          className={cx(inputClass, 'w-24 py-1 text-xs text-right font-mono')}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="p-1.5 font-bold">{godownName} (rest)</td>
                  {products.map((p) => {
                    const rest = p.qty - given(p.productId);
                    return <td key={p.productId} className={cx('p-1.5 text-right font-mono font-bold', rest < 0 && 'text-rose-600')}>{rest}</td>;
                  })}
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="p-1.5 font-bold">On the bill</td>
                  {products.map((p) => <td key={p.productId} className="p-1.5 text-right font-mono">{p.qty}</td>)}
                </tr>
              </tbody>
            </table>
            {products.some((p) => given(p.productId) > p.qty) && <p className="text-rose-600 font-semibold mt-1">More cylinders handed out than the bill has — reduce the quantities.</p>}
          </div>
        )
      )}
    </div>
  );
}

function BillForm({ bill, onClose, onSaved, onError }: { bill: Bill | null; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const productsQ = useApiData<Product[]>('/api/products', onError);
  const warehousesQ = useApiData<Warehouse[]>('/api/cylinder/warehouses', onError);
  const products = productsQ.data ?? [];
  const warehouses = warehousesQ.data ?? [];
  const [supplierId, setSupplierId] = useState(bill?.supplierId || '');
  const [invoiceNo, setInvoiceNo] = useState(bill?.supplierInvoiceNo || '');
  const [date, setDate] = useState(bill?.date || today());
  const [dueDate, setDueDate] = useState(bill?.dueDate || '');
  const [itc, setItc] = useState(bill ? bill.itcEligible : true);
  const [receive, setReceive] = useState(bill ? bill.stockReceived : true);
  const [warehouseId, setWarehouseId] = useState(bill?.warehouseId || '');
  // Cylinders handed straight from the truck to delivery boys: { boyId: { productId: qty } }.
  const [direct, setDirect] = useState(!!bill?.stockSplit?.length);
  const [split, setSplit] = useState<Record<string, Record<string, string>>>(() => {
    const s: Record<string, Record<string, string>> = {};
    for (const x of bill?.stockSplit || []) s[x.deliveryBoyId] = { ...s[x.deliveryBoyId], [x.productId]: String(x.qty) };
    return s;
  });
  const boysQ = useApiData<{ deliveryBoys: { id: string; name: string; status: string }[] }>('/api/cylinder/inventory', onError);
  const boys = (boysQ.data?.deliveryBoys ?? []).filter((b) => b.status === 'ACTIVE' || split[b.id]);
  const [vehicleNumber, setVehicleNumber] = useState(bill?.vehicleNumber || '');
  const [driverName, setDriverName] = useState(bill?.driverName || '');
  const [notes, setNotes] = useState(bill?.notes || '');
  const [lines, setLines] = useState<FormLine[]>(
    bill ? bill.items.map((i) => ({ productId: i.productId || '', materialCode: i.materialCode || '', description: i.description, hsnCode: i.hsnCode, quantity: String(i.quantity), unit: i.unit, rate: String(i.rate), taxRate: String(i.taxRate), basis: 'UNIT' as const, tonneRate: '', kg: '' })) : [emptyLine()]
  );
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<ImportedInvoice | null>(null);
  const [importing, setImporting] = useState(false);
  const set = (i: number, patch: Partial<FormLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  /** Fill the form from the plant's invoice PDF; the user still reviews and saves. */
  const importPdf = async (file: File) => {
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/books/purchases/import', { method: 'POST', body: form, credentials: 'same-origin' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: ImportedInvoice; error?: string };
      if (!res.ok || !json.data) throw new Error(json.error || 'Could not read the invoice.');
      const inv = json.data;
      setImported(inv);
      if (inv.supplierId) setSupplierId(inv.supplierId);
      if (inv.invoiceNo) setInvoiceNo(inv.invoiceNo);
      if (inv.date) setDate(inv.date);
      if (inv.vehicleNumber) setVehicleNumber(inv.vehicleNumber);
      setLines(
        inv.lines.map((l) => {
          const p = matchProduct(products, l);
          return {
            productId: p?.id || '',
            materialCode: l.materialCode,
            description: p?.name || l.description,
            hsnCode: p?.hsnCode || l.hsnCode,
            quantity: String(l.quantity),
            unit: p?.unit || 'PCS',
            rate: l.tonneRate ? '' : String(l.quantity ? l.taxable / l.quantity : 0),
            taxRate: String(l.taxRate),
            basis: l.tonneRate ? 'TONNE' : 'UNIT',
            tonneRate: l.tonneRate ? String(l.tonneRate) : '',
            kg: l.kgPerUnit ? String(l.kgPerUnit) : kgOf(p),
          };
        })
      );
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  const pickProduct = (i: number, id: string) => {
    const p = products.find((x) => x.id === id);
    set(i, p ? { productId: id, description: p.name, hsnCode: p.hsnCode, unit: p.unit, taxRate: String(p.taxRate), rate: lines[i].rate || (p.purchasePrice ? String(p.purchasePrice) : ''), kg: kgOf(p) } : { productId: '' });
  };

  const calc = useMemo(() => {
    const rows = lines.map((l) => {
      const taxable = r2((Number(l.quantity) || 0) * lineRate(l));
      const tax = 2 * r2((taxable * (Number(l.taxRate) || 0)) / 200);
      return { taxable, tax, total: taxable + tax };
    });
    const exact = sum(rows, (r) => r.total);
    return { rows, taxable: sum(rows, (r) => r.taxable), tax: sum(rows, (r) => r.tax), exact, grand: Math.round(exact) };
  }, [lines]);

  const save = async () => {
    setBusy(true);
    try {
      const saved = await api<{ billNumber: string }>('/api/books/purchases', {
        body: {
          id: bill?.id,
          supplierId,
          supplierInvoiceNo: invoiceNo,
          date,
          dueDate: dueDate || null,
          itcEligible: itc,
          receiveStock: hasCylinders && receive,
          warehouseId: warehouseId || null,
          stockSplit: hasCylinders && receive ? splitLines : [],
          vehicleNumber,
          driverName,
          notes,
          einvoice: imported && !imported.duplicateOf ? { sapDocNo: imported.sapDocNo, deliveryNo: imported.deliveryNo, salesOrderNo: imported.salesOrderNo, irn: imported.irn, irnDate: imported.irnDate, einvoiceQr: imported.einvoiceQr, invoicePdfUrl: imported.invoicePdfUrl } : undefined,
          items: lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ productId: l.productId || null, materialCode: l.materialCode || null, description: l.description, hsnCode: l.hsnCode, quantity: Number(l.quantity), unit: l.unit, rate: lineRate(l), taxRate: Number(l.taxRate) })),
        },
      });
      onSaved(`Purchase bill ${saved.billNumber} saved.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const hasCylinders = lines.some((l) => l.productId);
  // Cylinders on the bill per product, for the truck split.
  const cylinderTotals = useMemo(() => {
    const m = new Map<string, { productId: string; name: string; qty: number }>();
    for (const l of lines) {
      if (!l.productId || !(Number(l.quantity) > 0)) continue;
      const t = m.get(l.productId);
      m.set(l.productId, { productId: l.productId, name: t?.name || l.description, qty: (t?.qty || 0) + Number(l.quantity) });
    }
    return [...m.values()];
  }, [lines]);
  const splitLines = direct ? Object.entries(split).flatMap(([deliveryBoyId, row]) => Object.entries(row).map(([productId, q]) => ({ deliveryBoyId, productId, qty: Number(q) || 0 })).filter((s) => s.qty > 0 && cylinderTotals.some((p) => p.productId === s.productId))) : [];
  const overSplit = cylinderTotals.some((p) => splitLines.filter((s) => s.productId === p.productId).reduce((a, s) => a + s.qty, 0) > p.qty);
  return (
    <Modal
      open
      full
      title={bill ? `Edit ${bill.billNumber}` : 'New purchase bill'}
      onClose={onClose}
      footer={
        <>
          <Button tone="secondary" onClick={onClose}>Close</Button>
          <Button busy={busy} disabled={!supplierId || !invoiceNo.trim() || calc.grand <= 0 || overSplit} onClick={save}>Save bill · {money(calc.grand)}</Button>
        </>
      }
    >
      {!bill && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-sky-300 bg-sky-50 px-3 py-2">
          <label className={cx('inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white', importing || !productsQ.data ? 'opacity-60' : 'cursor-pointer hover:bg-sky-800')}>
            <FileUp className="h-4 w-4" /> {importing ? 'Reading invoice…' : 'Upload invoice PDF'}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={importing || !productsQ.data}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void importPdf(file);
              }}
            />
          </label>
          <span className="text-[11px] text-sky-900">Indian Oil (Indane) tax invoice PDF from the plant: fills supplier, invoice no., date, truck and cylinders.</span>
        </div>
      )}
      {imported && <ImportCheck imported={imported} grand={calc.grand} lines={lines} />}

      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Supplier / plant" className="sm:col-span-2">
          <SupplierSelect
            key={imported && !imported.supplierId ? `new-${imported.supplierGstin}` : 'select'}
            value={supplierId}
            showGstin
            onError={onError}
            onChange={(id) => setSupplierId(id)}
            newSupplier={imported && !imported.supplierId && !supplierId ? { name: imported.supplierName, gstin: imported.supplierGstin, address: imported.supplierAddress, city: imported.supplierCity } : undefined}
          />
        </Field>
        <Field label="Supplier's invoice no.">
          <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputClass} placeholder="e.g. IOCL/2345" />
        </Field>
        <Field label="Bill date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left min-w-[220px]">Product / description</th>
              <th className="p-2 w-24 text-left">HSN</th>
              <th className="p-2 w-20 text-right">Qty</th>
              <th className="p-2 w-16 text-left">Unit</th>
              <th className="p-2 w-32 text-right">Rate (excl. GST)</th>
              <th className="p-2 w-20 text-right">GST %</th>
              <th className="p-2 w-28 text-right">Amount</th>
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                <td className="p-1.5 space-y-1">
                  <select value={l.productId} onChange={(e) => pickProduct(i, e.target.value)} className={cx(inputClass, 'py-1.5 text-xs')}>
                    <option value="">Other item (type below)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {!l.productId && <input value={l.description} onChange={(e) => set(i, { description: e.target.value })} placeholder="Description, e.g. Freight" className={cx(inputClass, 'py-1.5 text-xs')} />}
                  {l.materialCode && <div className="text-[10px] text-slate-500">Material code <span className="font-mono font-bold">{l.materialCode}</span></div>}
                </td>
                <td className="p-1.5"><input value={l.hsnCode} onChange={(e) => set(i, { hsnCode: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs')} /></td>
                <td className="p-1.5"><input type="number" min={0} value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs text-right')} /></td>
                <td className="p-1.5"><input value={l.unit} onChange={(e) => set(i, { unit: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs')} /></td>
                <td className="p-1.5 space-y-1">
                  <select value={l.basis} onChange={(e) => set(i, { basis: e.target.value as FormLine['basis'] })} className={cx(inputClass, 'py-1 text-[11px]')}>
                    <option value="UNIT">per {l.unit || 'unit'}</option>
                    <option value="TONNE">per tonne (TO)</option>
                  </select>
                  {l.basis === 'UNIT' ? (
                    <input type="number" min={0} step="0.01" value={l.rate} onChange={(e) => set(i, { rate: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs text-right font-mono')} />
                  ) : (
                    <>
                      <input type="number" min={0} step="0.01" value={l.tonneRate} onChange={(e) => set(i, { tonneRate: e.target.value })} placeholder="₹ / tonne" className={cx(inputClass, 'py-1.5 text-xs text-right font-mono')} />
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} step="0.1" value={l.kg} onChange={(e) => set(i, { kg: e.target.value })} placeholder="kg" className={cx(inputClass, 'py-1 text-[11px] text-right font-mono')} />
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">kg / cyl</span>
                      </div>
                      <div className="text-[10px] text-right text-slate-500">= {plain(lineRate(l))} / {l.unit || 'unit'}</div>
                    </>
                  )}
                </td>
                <td className="p-1.5">
                  <select value={l.taxRate} onChange={(e) => set(i, { taxRate: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs')}>
                    {['0', '5', '12', '18', '28'].map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </td>
                <td className="p-1.5 text-right font-mono font-bold pt-3">{plain(calc.rows[i]?.total)}</td>
                <td className="p-1.5 pt-3 text-center">
                  {lines.length > 1 && (
                    <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-2 border-t border-slate-100 flex flex-wrap items-start justify-between gap-3 bg-slate-50">
          <button onClick={() => setLines([...lines, emptyLine()])} className="text-xs font-bold text-emerald-700 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add item</button>
          <div className="text-xs text-right space-y-0.5 font-mono">
            <div>Taxable {plain(calc.taxable)}</div>
            <div>GST {plain(calc.tax)} <span className="font-sans text-[10px] text-slate-400">(CGST+SGST, or IGST for another state)</span></div>
            <div>Round off {plain(calc.grand - calc.exact)}</div>
            <div className="text-sm font-black">Bill total {money(calc.grand)}</div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Due date (optional)">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <TruckPicker vehicleNumber={vehicleNumber} driverName={driverName} onError={onError} onChange={(t) => { setVehicleNumber(t.vehicleNumber); setDriverName(t.driverName); }} />
        </div>
        <Field label="Notes">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="e.g. load 180 cylinders" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        <label className="flex items-center gap-2"><input type="checkbox" checked={itc} onChange={(e) => setItc(e.target.checked)} /> Claim GST input credit (ITC) on this bill</label>
        {hasCylinders && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={receive} onChange={(e) => setReceive(e.target.checked)} />
            <PackageCheck className="h-4 w-4 text-sky-700" /> Receive the full cylinders {direct ? '— what the boys don’t take goes to' : 'into'}
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!receive} className={cx(inputClass, 'w-44 py-1 text-xs')}>
              <option value="">{warehouses.find((w) => w.isDefault)?.name || warehouses[0]?.name || 'Main Godown'} (default)</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {hasCylinders && receive && (
        <TruckSplit
          direct={direct}
          onDirect={setDirect}
          boys={boys}
          products={cylinderTotals}
          split={split}
          onChange={setSplit}
          godownName={warehouses.find((w) => w.id === warehouseId)?.name || warehouses.find((w) => w.isDefault)?.name || 'Godown'}
        />
      )}
    </Modal>
  );
}

function BillView({ bill, onClose, onEdit }: { bill: Bill; onClose: () => void; onEdit?: () => void }) {
  return (
    <Modal open wide title={`${bill.billNumber} · ${bill.supplierName}`} onClose={onClose} footer={onEdit ? <Button tone="secondary" onClick={onEdit}>Edit bill</Button> : undefined}>
      <div className="grid sm:grid-cols-4 gap-3 text-xs">
        <div><div className="text-slate-500">Supplier bill</div><div className="font-bold">{bill.supplierInvoiceNo}</div></div>
        <div><div className="text-slate-500">Date / due</div><div className="font-bold">{bill.date}{bill.dueDate ? ` → ${bill.dueDate}` : ''}</div></div>
        <div><div className="text-slate-500">GSTIN</div><div className="font-bold">{bill.supplierGstin || 'Unregistered'}</div></div>
        <div><div className="text-slate-500">Status</div><div className="font-bold">{bill.status} · paid {money(bill.paidAmount)}</div></div>
      </div>
      <ReportTable
        dense
        rows={bill.items}
        rowKey={(i) => i.id}
        columns={[
          { label: 'Item', render: (i) => i.description },
          { label: 'Material', render: (i) => <span className="font-mono">{i.materialCode || '—'}</span> },
          { label: 'HSN', render: (i) => i.hsnCode },
          { label: 'Qty', align: 'right', render: (i) => `${i.quantity} ${i.unit}` },
          { label: 'Rate', align: 'right', render: (i) => plain(i.rate) },
          { label: 'Taxable', align: 'right', render: (i) => plain(i.taxableAmount), total: (r) => plain(sum(r, (x) => x.taxableAmount)) },
          { label: bill.isIgst ? 'IGST' : 'CGST + SGST', align: 'right', render: (i) => plain(i.cgstAmount + i.sgstAmount + i.igstAmount), total: (r) => plain(sum(r, (x) => x.cgstAmount + x.sgstAmount + x.igstAmount)) },
          { label: 'Total', align: 'right', render: (i) => plain(i.totalAmount), total: (r) => plain(sum(r, (x) => x.totalAmount)) },
        ]}
      />
      <div className="text-right text-sm font-black">Round off {plain(bill.roundOff)} · Bill total {money(bill.grandTotal)}</div>
      {(bill.vehicleNumber || bill.driverName) && <p className="text-xs text-slate-600">Truck <strong className="font-mono">{bill.vehicleNumber || '—'}</strong>{bill.driverName ? ` · driver ${bill.driverName}` : ''}</p>}
      {(bill.sapDocNo || bill.irn || bill.invoicePdfUrl) && (
        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 p-3 text-xs">
          {bill.einvoiceQr && (
            <div className="text-center">
              <QRCodeSVG value={bill.einvoiceQr} size={132} level="L" />
              <div className="text-[10px] text-slate-500 mt-1">E-invoice QR (scan with GST verify app)</div>
            </div>
          )}
          <div className="space-y-1 min-w-0 flex-1">
            {bill.sapDocNo && <div>SAP doc no. <strong className="font-mono">{bill.sapDocNo}</strong></div>}
            {bill.deliveryNo && <div>Delivery no. <strong className="font-mono">{bill.deliveryNo}</strong>{bill.salesOrderNo ? <> · Sales order <strong className="font-mono">{bill.salesOrderNo}</strong></> : null}</div>}
            {bill.irn && <div className="break-all">IRN <span className="font-mono">{bill.irn}</span>{bill.irnDate ? ` · ${bill.irnDate}` : ''}</div>}
            {bill.invoicePdfUrl && <a href={bill.invoicePdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-sky-700 underline"><FileUp className="h-3.5 w-3.5" /> Open the plant&apos;s invoice PDF</a>}
          </div>
        </div>
      )}
      {bill.notes && <p className="text-xs text-slate-500">{bill.notes}</p>}
      {!!bill.stockSplit?.length && (
        <div className="text-xs rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">
          <div className="font-bold text-sky-900">Handed out from the truck</div>
          {[...new Set(bill.stockSplit.map((s) => s.deliveryBoyId))].map((id) => {
            const rows = bill.stockSplit!.filter((s) => s.deliveryBoyId === id);
            return <div key={id}>{rows[0].deliveryBoyName}: {rows.map((s) => `${s.qty} × ${bill.items.find((i) => i.productId === s.productId)?.description || 'cylinder'}`).join(', ')}</div>;
          })}
        </div>
      )}
      <p className="text-[11px] text-slate-400">Entered by {bill.createdBy}{bill.stockReceived ? (bill.warehouseName ? ` · ${bill.stockSplit?.length ? 'the rest ' : 'cylinders '}received into ${bill.warehouseName}` : ' · all cylinders handed out from the truck') : ''}{bill.itcEligible ? ' · ITC claimed' : ' · ITC not claimed'}</p>
    </Modal>
  );
}

function PayBill({ bill, onClose, onSaved, onError }: { bill: Bill; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const ledgersQ = useApiData<LedgerOption[]>('/api/books/accounts', onError);
  const ledgers = ledgersQ.data ?? [];
  const moneyLedgers = ledgers.filter((l) => l.groupName === 'Cash-in-Hand' || l.groupName === 'Bank Accounts');
  const supplier = ledgers.find((l) => l.partyId === bill.supplierId);
  const due = Math.round((bill.grandTotal - bill.paidAmount) * 100) / 100;
  const [amount, setAmount] = useState(String(due));
  const [fromId, setFromId] = useState('');
  const [date, setDate] = useState(today());
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const source = fromId || moneyLedgers.find((l) => l.groupName === 'Bank Accounts')?.id || moneyLedgers[0]?.id || '';

  const pay = async () => {
    if (!supplier) return onError("The supplier's ledger was not found — open Books → Ledgers once and try again.");
    setBusy(true);
    try {
      const v = await api<{ voucherNumber: string }>('/api/books/vouchers', {
        body: {
          voucherType: 'PAYMENT',
          date,
          againstBillId: bill.id,
          narration: `Paid against ${bill.billNumber} (supplier bill ${bill.supplierInvoiceNo})${ref ? ` · ${ref}` : ''}`,
          lines: [
            { accountId: supplier.id, debit: Number(amount) },
            { accountId: source, credit: Number(amount) },
          ],
        },
      });
      onSaved(`Payment ${v.voucherNumber} saved.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={`Pay ${bill.supplierName}`} onClose={onClose} footer={<Button busy={busy} disabled={!(Number(amount) > 0) || !source} onClick={pay}>Save payment</Button>}>
      <p className="text-xs text-slate-600">{bill.billNumber} · supplier bill {bill.supplierInvoiceNo} · due <strong>{money(due)}</strong></p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount"><input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></Field>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Paid from">
        <select value={source} onChange={(e) => setFromId(e.target.value)} className={inputClass}>
          {moneyLedgers.map((l) => (
            <option key={l.id} value={l.id}>{l.name} · balance {money(l.closing)}</option>
          ))}
        </select>
      </Field>
      <Field label="Cheque / UTR (optional)"><input value={ref} onChange={(e) => setRef(e.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}
