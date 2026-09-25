'use client';

import React, { useMemo, useState } from 'react';
import { Eye, IndianRupee, PackageCheck, Plus, ShoppingCart, Trash2, XCircle } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Column, LedgerOption, money, PeriodBar, plain, ReportTable, sum, usePeriod } from './shared';
import { SupplierSelect } from './SupplierSelect';

interface BillItem { id: string; productId: string | null; description: string; hsnCode: string; quantity: number; unit: string; rate: number; taxRate: number; taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number }
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
  status: string;
  itcEligible: boolean;
  stockReceived: boolean;
  notes: string | null;
  createdBy: string;
  items: BillItem[];
}
interface Product { id: string; name: string; hsnCode: string; unit: string; taxRate: number; purchasePrice?: number }
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

  const cancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await api('/api/books/purchases', { method: 'PATCH', body: { id: cancelling.id, reason } });
      showToast(`${cancelling.billNumber} cancelled.`);
      setCancelling(null);
      setReason('');
      billsQ.reload();
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
          {b.stockReceived && b.status !== 'Cancelled' && <Badge tone="blue">Stock in</Badge>}
          {!b.itcEligible && <Badge tone="amber">No ITC</Badge>}
        </div>
      ),
    },
    {
      label: '',
      render: (b) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setViewing(b)} title="View" className="p-1 text-slate-500 hover:text-slate-900"><Eye className="h-4 w-4" /></button>
          {b.status !== 'Cancelled' && b.status !== 'Paid' && <button onClick={() => setPaying(b)} title="Pay" className="p-1 text-emerald-700 hover:text-emerald-900"><IndianRupee className="h-4 w-4" /></button>}
          {b.status !== 'Cancelled' && b.paidAmount === 0 && <button onClick={() => setCancelling(b)} title="Cancel" className="p-1 text-rose-600 hover:text-rose-800"><XCircle className="h-4 w-4" /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={ShoppingCart} title="Purchase bills" subtitle="Refill bills from the bottling plant and any other supplier. GST input credit, stock receipt into the godown and the supplier's ledger update together." actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New purchase bill</Button>} />
      <PeriodBar value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Bills</div><div className="text-xl font-black">{live.length}</div></Card>
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Taxable value</div><div className="text-xl font-black font-mono">{money(sum(live, (b) => b.subTotal))}</div></Card>
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Input GST (ITC)</div><div className="text-xl font-black font-mono text-emerald-700">{money(sum(live.filter((b) => b.itcEligible), (b) => b.totalCgst + b.totalSgst + b.totalIgst))}</div></Card>
        <Card><div className="text-[10px] uppercase font-bold text-slate-500">Still to pay</div><div className="text-xl font-black font-mono text-rose-600">{money(sum(live, (b) => b.grandTotal - b.paidAmount))}</div></Card>
      </div>
      <ReportTable rows={bills} columns={columns} rowKey={(b) => b.id} onRowClick={setViewing} empty="No purchase bills in this period." />

      {editing && (
        <BillForm
          bill={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            showToast(m);
            setEditing(null);
            billsQ.reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}
      {viewing && <BillView bill={viewing} onClose={() => setViewing(null)} onEdit={viewing.status !== 'Cancelled' && viewing.paidAmount === 0 && !viewing.stockReceived ? () => { setEditing(viewing); setViewing(null); } : undefined} />}
      {paying && (
        <PayBill
          bill={paying}
          onClose={() => setPaying(null)}
          onSaved={(m) => {
            showToast(m);
            setPaying(null);
            billsQ.reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}
      <Modal
        open={!!cancelling}
        title={`Cancel ${cancelling?.billNumber || ''}`}
        onClose={() => setCancelling(null)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setCancelling(null)}>Back</Button>
            <Button tone="danger" busy={busy} disabled={!reason.trim()} onClick={cancel}>Cancel bill</Button>
          </>
        }
      >
        {cancelling?.stockReceived && <p className="text-xs font-semibold text-amber-700">The {cancelling.items.reduce((s, i) => s + i.quantity, 0)} cylinders received on this bill will be taken back out of the godown.</p>}
        <Field label="Reason (required)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>
      </Modal>
    </div>
  );
}

type FormLine = { productId: string; description: string; hsnCode: string; quantity: string; unit: string; rate: string; taxRate: string };
const emptyLine = (): FormLine => ({ productId: '', description: '', hsnCode: '', quantity: '', unit: 'PCS', rate: '', taxRate: '18' });

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
  const [receive, setReceive] = useState(!bill);
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState(bill?.notes || '');
  const [lines, setLines] = useState<FormLine[]>(
    bill ? bill.items.map((i) => ({ productId: i.productId || '', description: i.description, hsnCode: i.hsnCode, quantity: String(i.quantity), unit: i.unit, rate: String(i.rate), taxRate: String(i.taxRate) })) : [emptyLine()]
  );
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<FormLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const pickProduct = (i: number, id: string) => {
    const p = products.find((x) => x.id === id);
    set(i, p ? { productId: id, description: p.name, hsnCode: p.hsnCode, unit: p.unit, taxRate: String(p.taxRate), rate: lines[i].rate || (p.purchasePrice ? String(p.purchasePrice) : '') } : { productId: '' });
  };

  const calc = useMemo(() => {
    const rows = lines.map((l) => {
      const taxable = (Number(l.quantity) || 0) * (Number(l.rate) || 0);
      const tax = (taxable * (Number(l.taxRate) || 0)) / 100;
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
          receiveStock: !bill && receive,
          warehouseId: warehouseId || null,
          notes,
          items: lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ productId: l.productId || null, description: l.description, hsnCode: l.hsnCode, quantity: Number(l.quantity), unit: l.unit, rate: Number(l.rate), taxRate: Number(l.taxRate) })),
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
  return (
    <Modal
      open
      wide
      title={bill ? `Edit ${bill.billNumber}` : 'New purchase bill'}
      onClose={onClose}
      footer={
        <>
          <Button tone="secondary" onClick={onClose}>Close</Button>
          <Button busy={busy} disabled={!supplierId || !invoiceNo.trim() || calc.grand <= 0} onClick={save}>Save bill · {money(calc.grand)}</Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Supplier / plant" className="sm:col-span-2">
          <SupplierSelect value={supplierId} showGstin onError={onError} onChange={(id) => setSupplierId(id)} />
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
              <th className="p-2 w-28 text-right">Rate (excl. GST)</th>
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
                </td>
                <td className="p-1.5"><input value={l.hsnCode} onChange={(e) => set(i, { hsnCode: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs')} /></td>
                <td className="p-1.5"><input type="number" min={0} value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs text-right')} /></td>
                <td className="p-1.5"><input value={l.unit} onChange={(e) => set(i, { unit: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs')} /></td>
                <td className="p-1.5"><input type="number" min={0} step="0.01" value={l.rate} onChange={(e) => set(i, { rate: e.target.value })} className={cx(inputClass, 'py-1.5 text-xs text-right font-mono')} /></td>
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

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Due date (optional)">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="e.g. truck MH12 AB 1234, load 180 cylinders" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        <label className="flex items-center gap-2"><input type="checkbox" checked={itc} onChange={(e) => setItc(e.target.checked)} /> Claim GST input credit (ITC) on this bill</label>
        {!bill && hasCylinders && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={receive} onChange={(e) => setReceive(e.target.checked)} />
            <PackageCheck className="h-4 w-4 text-sky-700" /> Receive the full cylinders into
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!receive} className={cx(inputClass, 'w-44 py-1 text-xs')}>
              <option value="">default godown</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
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
          { label: 'HSN', render: (i) => i.hsnCode },
          { label: 'Qty', align: 'right', render: (i) => `${i.quantity} ${i.unit}` },
          { label: 'Rate', align: 'right', render: (i) => plain(i.rate) },
          { label: 'Taxable', align: 'right', render: (i) => plain(i.taxableAmount), total: (r) => plain(sum(r, (x) => x.taxableAmount)) },
          { label: bill.isIgst ? 'IGST' : 'CGST + SGST', align: 'right', render: (i) => plain(i.cgstAmount + i.sgstAmount + i.igstAmount), total: (r) => plain(sum(r, (x) => x.cgstAmount + x.sgstAmount + x.igstAmount)) },
          { label: 'Total', align: 'right', render: (i) => plain(i.totalAmount), total: (r) => plain(sum(r, (x) => x.totalAmount)) },
        ]}
      />
      <div className="text-right text-sm font-black">Round off {plain(bill.roundOff)} · Bill total {money(bill.grandTotal)}</div>
      {bill.notes && <p className="text-xs text-slate-500">{bill.notes}</p>}
      <p className="text-[11px] text-slate-400">Entered by {bill.createdBy}{bill.stockReceived ? ' · cylinders received into the godown' : ''}{bill.itcEligible ? ' · ITC claimed' : ' · ITC not claimed'}</p>
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
