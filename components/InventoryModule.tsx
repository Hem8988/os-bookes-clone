'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, Factory, PackagePlus, RefreshCw, SlidersHorizontal, Warehouse as WarehouseIcon } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useSession } from '../lib/auth';
import { Button, Card, Empty, Field, inputClass, Modal, Stat, StatusBadge, cx, dateTime, useToast } from './ui';

// Three-tier cylinder inventory (SRS §10): godowns → delivery boys → customers.

interface StockRow { id: string; productId: string; productName: string; fullQty: number; emptyQty: number; defectiveQty: number }
interface Overview {
  products: { id: string; name: string; minStockAlert: number }[];
  warehouses: { id: string; code: string; name: string; isDefault: boolean; stock: StockRow[] }[];
  deliveryBoys: { id: string; name: string; status: string; stock: StockRow[]; cash: number }[];
  customerHoldings: { productId: string; productName: string; held: number; delivered: number; emptiesReceived: number }[];
}
interface Transfer { id: string; transferNumber: string; transferType: string; fromName: string; toName: string; status: string; requestedBy: string; approvedBy: string | null; rejectionReason: string | null; createdAt: string; items: { productName: string; fullQty: number; emptyQty: number }[] }
interface Movement { id: string; transactionType: string; fromName: string | null; toName: string | null; productName: string; fullQty: number; emptyQty: number; defectiveQty: number; referenceNumber: string | null; reason: string | null; performedBy: string; createdAt: string }

type Tab = 'overview' | 'transfers' | 'movements' | 'warehouses';

export function InventoryModule({ initialTab = 'overview' }: { initialTab?: Tab }) {
  const { can } = useSession();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<Overview | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [modal, setModal] = useState<'plant' | 'transfer' | 'adjust' | 'warehouse' | null>(null);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      const [overview, t, m] = await Promise.all([
        api<Overview>('/api/cylinder/inventory'),
        api<Transfer[]>('/api/cylinder/transfers'),
        api<Movement[]>('/api/cylinder/ledger?limit=300'),
      ]);
      setData(overview);
      setTransfers(t);
      setMovements(m);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setTab(initialTab), [initialTab]);

  const totals = (rows: StockRow[]) => rows.reduce((a, r) => ({ full: a.full + r.fullQty, empty: a.empty + r.emptyQty }), { full: 0, empty: 0 });
  const done = (msg: string) => {
    showToast(msg);
    setModal(null);
    void load();
  };

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Cylinder Inventory</h2>
        <div className="flex flex-wrap gap-2">
          {can('inventory.receive') && (
            <Button onClick={() => setModal('plant')}>
              <Factory className="h-4 w-4" /> Plant receipt / dispatch
            </Button>
          )}
          {can('stock.transfer.request') && (
            <Button tone="secondary" onClick={() => setModal('transfer')}>
              <ArrowRightLeft className="h-4 w-4" /> Stock transfer
            </Button>
          )}
          {can('stock.adjust.request') && (
            <Button tone="secondary" onClick={() => setModal('adjust')}>
              <SlidersHorizontal className="h-4 w-4" /> Adjustment
            </Button>
          )}
          <Button tone="ghost" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['overview', 'transfers', 'movements', 'warehouses'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold capitalize', tab === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {t}
          </button>
        ))}
      </div>

      {!data ? (
        <Empty>Loading…</Empty>
      ) : tab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.products.map((p) => {
              const inGodown = data.warehouses.flatMap((w) => w.stock).filter((s) => s.productId === p.id);
              const withBoys = data.deliveryBoys.flatMap((b) => b.stock).filter((s) => s.productId === p.id);
              const held = data.customerHoldings.find((h) => h.productId === p.id)?.held || 0;
              const g = totals(inGodown);
              const b = totals(withBoys);
              return (
                <Stat
                  key={p.id}
                  label={p.name}
                  value={g.full + g.empty + b.full + b.empty + held}
                  tone={p.minStockAlert && g.full <= p.minStockAlert ? 'text-rose-600' : undefined}
                  sub={`Godown ${g.full}F/${g.empty}E · Boys ${b.full}F/${b.empty}E · Customers ${held}`}
                />
              );
            })}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Godowns">
              {data.warehouses.map((w) => (
                <StockTable key={w.id} title={`${w.name}${w.isDefault ? ' (main)' : ''}`} rows={w.stock} />
              ))}
            </Card>
            <Card title="With delivery boys">
              {data.deliveryBoys.length === 0 && <Empty>No delivery boys yet.</Empty>}
              {data.deliveryBoys.map((b) => (
                <StockTable key={b.id} title={`${b.name} · cash ${inr(b.cash)}`} rows={b.stock} />
              ))}
            </Card>
          </div>
          <Card title="Held by customers">
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2 text-right">Delivered (total)</th>
                  <th className="p-2 text-right">Empties received</th>
                  <th className="p-2 text-right">Currently with customers</th>
                </tr>
              </thead>
              <tbody>
                {data.customerHoldings.map((h) => (
                  <tr key={h.productId} className="border-t border-slate-100">
                    <td className="p-2 font-bold">{h.productName}</td>
                    <td className="p-2 text-right">{h.delivered}</td>
                    <td className="p-2 text-right">{h.emptiesReceived}</td>
                    <td className="p-2 text-right font-black">{h.held}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : tab === 'transfers' ? (
        <Card title="Stock transfers">
          {transfers.length === 0 ? (
            <Empty>No transfers yet.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="p-2">No.</th>
                  <th className="p-2">From → To</th>
                  <th className="p-2">Items</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">By</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="p-2 font-mono font-bold">{t.transferNumber}<div className="text-[10px] text-slate-400">{dateTime(t.createdAt)}</div></td>
                    <td className="p-2">{t.fromName} → {t.toName}</td>
                    <td className="p-2">{t.items.map((i) => `${i.productName}: ${i.fullQty}F / ${i.emptyQty}E`).join(', ')}</td>
                    <td className="p-2"><StatusBadge status={t.status} />{t.rejectionReason && <div className="text-[10px] text-rose-600">{t.rejectionReason}</div>}</td>
                    <td className="p-2">{t.requestedBy}{t.approvedBy && <div className="text-[10px] text-slate-400">approved: {t.approvedBy}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : tab === 'movements' ? (
        <Card title="Stock movements (latest 300)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="p-2">When</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">From → To</th>
                  <th className="p-2">Product</th>
                  <th className="p-2 text-right">Full</th>
                  <th className="p-2 text-right">Empty</th>
                  <th className="p-2">Ref / reason</th>
                  <th className="p-2">By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="p-2 whitespace-nowrap">{dateTime(m.createdAt)}</td>
                    <td className="p-2 font-bold">{m.transactionType.replace(/_/g, ' ')}</td>
                    <td className="p-2">{m.fromName || '—'} → {m.toName || '—'}</td>
                    <td className="p-2">{m.productName}</td>
                    <td className="p-2 text-right">{m.fullQty}</td>
                    <td className="p-2 text-right">{m.emptyQty}</td>
                    <td className="p-2">{m.referenceNumber}{m.reason && <div className="text-[10px] text-slate-400">{m.reason}</div>}</td>
                    <td className="p-2">{m.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Godowns / warehouses" actions={can('settings.manage') && <Button size="sm" onClick={() => setModal('warehouse')}><WarehouseIcon className="h-3.5 w-3.5" /> Add godown</Button>}>
          {data.warehouses.map((w) => (
            <div key={w.id} className="flex justify-between text-xs py-2 border-b border-slate-50">
              <span><strong>{w.name}</strong> <span className="text-slate-400 font-mono">{w.code}</span></span>
              {w.isDefault && <StatusBadge status="ACTIVE" />}
            </div>
          ))}
        </Card>
      )}

      {data && modal === 'plant' && <PlantModal data={data} onClose={() => setModal(null)} onDone={done} onError={(m) => showToast(m, 'error')} />}
      {data && modal === 'transfer' && <TransferModal data={data} onClose={() => setModal(null)} onDone={done} onError={(m) => showToast(m, 'error')} />}
      {data && modal === 'adjust' && <AdjustModal data={data} onClose={() => setModal(null)} onDone={done} onError={(m) => showToast(m, 'error')} />}
      {modal === 'warehouse' && <WarehouseModal onClose={() => setModal(null)} onDone={done} onError={(m) => showToast(m, 'error')} />}
    </div>
  );
}

const StockTable = ({ title, rows }: { title: string; rows: StockRow[] }) => (
  <div className="mb-3">
    <div className="text-xs font-black text-slate-800 mb-1">{title}</div>
    {rows.length === 0 ? (
      <div className="text-[11px] text-slate-400">No stock.</div>
    ) : (
      rows.map((r) => (
        <div key={r.id} className="flex justify-between text-xs py-1 border-b border-slate-50">
          <span>{r.productName}</span>
          <span>
            <strong>{r.fullQty}</strong> full · {r.emptyQty} empty{r.defectiveQty ? ` · ${r.defectiveQty} defective` : ''}
          </span>
        </div>
      ))
    )}
  </div>
);

type ModalProps = { data: Overview; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void };

function useLines(products: Overview['products']) {
  const [lines, setLines] = useState(products.map((p) => ({ productId: p.id, productName: p.name, full: '', empty: '' })));
  const items = lines.filter((l) => Number(l.full) > 0 || Number(l.empty) > 0).map((l) => ({ productId: l.productId, fullQty: Number(l.full) || 0, emptyQty: Number(l.empty) || 0 }));
  const editor = (showFull = true, showEmpty = true) => (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={l.productId} className="grid grid-cols-12 gap-2 items-center">
          <span className="col-span-6 text-xs font-bold">{l.productName}</span>
          {showFull && <input type="number" min={0} placeholder="Full" value={l.full} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, full: e.target.value } : x)))} className={cx(inputClass, 'col-span-3')} />}
          {showEmpty && <input type="number" min={0} placeholder="Empty" value={l.empty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, empty: e.target.value } : x)))} className={cx(inputClass, 'col-span-3')} />}
        </div>
      ))}
    </div>
  );
  return { items, editor };
}

function PlantModal({ data, onClose, onDone, onError }: ModalProps) {
  const [kind, setKind] = useState<'RECEIPT' | 'EMPTY_TO_PLANT' | 'DAMAGE'>('RECEIPT');
  const [warehouseId, setWarehouseId] = useState(data.warehouses[0]?.id || '');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const { items, editor } = useLines(data.products);
  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/cylinder/inventory', { body: { kind, warehouseId, items, reference, notes } });
      onDone('Stock updated.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="Plant receipt / dispatch" onClose={onClose} footer={<Button busy={busy} disabled={!items.length} onClick={submit}><PackagePlus className="h-4 w-4" /> Save</Button>}>
      <Field label="Type">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={inputClass}>
          <option value="RECEIPT">Full cylinders received from plant</option>
          <option value="EMPTY_TO_PLANT">Empty cylinders sent to plant for refill</option>
          <option value="DAMAGE">Damaged / defective cylinders set aside</option>
        </select>
      </Field>
      <Field label="Godown">
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputClass}>
          {data.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>
      {editor(kind !== 'EMPTY_TO_PLANT', kind !== 'RECEIPT')}
      <Field label="Challan / invoice ref"><input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} /></Field>
      <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}

function TransferModal({ data, onClose, onDone, onError }: ModalProps) {
  const [type, setType] = useState<'WAREHOUSE_TO_DRIVER' | 'DRIVER_TO_DRIVER' | 'DRIVER_TO_WAREHOUSE' | 'WAREHOUSE_TO_WAREHOUSE'>('WAREHOUSE_TO_DRIVER');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const { items, editor } = useLines(data.products);
  const [fromKind, toKind] = type.split('_TO_') as ['WAREHOUSE' | 'DRIVER', 'WAREHOUSE' | 'DRIVER'];
  const options = (kind: 'WAREHOUSE' | 'DRIVER') => (kind === 'WAREHOUSE' ? data.warehouses.map((w) => ({ id: w.id, name: w.name })) : data.deliveryBoys.map((b) => ({ id: b.id, name: b.name })));
  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/cylinder/transfers', { body: { transferType: type, fromId, toId, items, notes } });
      onDone('Transfer sent for approval.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="Stock transfer (needs approval)" onClose={onClose} footer={<Button busy={busy} disabled={!items.length || !fromId || !toId} onClick={submit}>Submit</Button>}>
      <Field label="Transfer">
        <select value={type} onChange={(e) => { setType(e.target.value as typeof type); setFromId(''); setToId(''); }} className={inputClass}>
          <option value="WAREHOUSE_TO_DRIVER">Godown → Delivery boy (issue)</option>
          <option value="DRIVER_TO_WAREHOUSE">Delivery boy → Godown (return)</option>
          <option value="DRIVER_TO_DRIVER">Delivery boy → Delivery boy</option>
          <option value="WAREHOUSE_TO_WAREHOUSE">Godown → Godown</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From">
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {options(fromKind).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="To">
          <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {options(toKind).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      </div>
      {editor()}
      <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}

function AdjustModal({ data, onClose, onDone, onError }: ModalProps) {
  const [target, setTarget] = useState<'LOCATION' | 'CUSTOMER'>('LOCATION');
  const [locationType, setLocationType] = useState<'WAREHOUSE' | 'DELIVERY_BOY'>('WAREHOUSE');
  const [locationId, setLocationId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState(data.products[0]?.id || '');
  const [delta, setDelta] = useState({ full: '', empty: '', defective: '', qty: '' });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target !== 'CUSTOMER' || customerQuery.length < 2) return;
    const t = window.setTimeout(() => api<{ id: string; name: string; phone: string }[]>(`/api/customers?search=${encodeURIComponent(customerQuery)}`).then(setCustomers).catch(() => {}), 250);
    return () => window.clearTimeout(t);
  }, [customerQuery, target]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/cylinder/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, locationType, locationId, customerId, productId, fullDelta: Number(delta.full) || 0, emptyDelta: Number(delta.empty) || 0, defectiveDelta: Number(delta.defective) || 0, qtyDelta: Number(delta.qty) || 0, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onDone(json.message);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const locations = locationType === 'WAREHOUSE' ? data.warehouses : data.deliveryBoys;
  return (
    <Modal open title="Stock adjustment" onClose={onClose} footer={<Button busy={busy} disabled={!reason.trim()} onClick={submit}>Submit</Button>}>
      <p className="text-[11px] text-slate-500">Use + to add and − to remove. Only the Super Admin&apos;s adjustments apply immediately; others go for approval.</p>
      <Field label="Adjust">
        <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className={inputClass}>
          <option value="LOCATION">Godown / delivery boy stock</option>
          <option value="CUSTOMER">Customer cylinder holding</option>
        </select>
      </Field>
      {target === 'LOCATION' ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Location type">
            <select value={locationType} onChange={(e) => { setLocationType(e.target.value as typeof locationType); setLocationId(''); }} className={inputClass}>
              <option value="WAREHOUSE">Godown</option>
              <option value="DELIVERY_BOY">Delivery boy</option>
            </select>
          </Field>
          <Field label="Location">
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <Field label="Customer">
          <input value={customerQuery} onChange={(e) => { setCustomerQuery(e.target.value); setCustomerId(''); }} placeholder="Search customer" className={inputClass} />
          {!customerId && customers.map((c) => (
            <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerQuery(c.name); }} className="block w-full text-left text-xs p-1.5 hover:bg-slate-50">{c.name} · {c.phone}</button>
          ))}
        </Field>
      )}
      <Field label="Product">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
          {data.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      {target === 'LOCATION' ? (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Full ±"><input type="number" value={delta.full} onChange={(e) => setDelta({ ...delta, full: e.target.value })} className={inputClass} /></Field>
          <Field label="Empty ±"><input type="number" value={delta.empty} onChange={(e) => setDelta({ ...delta, empty: e.target.value })} className={inputClass} /></Field>
          <Field label="Defective ±"><input type="number" value={delta.defective} onChange={(e) => setDelta({ ...delta, defective: e.target.value })} className={inputClass} /></Field>
        </div>
      ) : (
        <Field label="Cylinders held ±"><input type="number" value={delta.qty} onChange={(e) => setDelta({ ...delta, qty: e.target.value })} className={inputClass} /></Field>
      )}
      <Field label="Reason (required)"><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></Field>
    </Modal>
  );
}

function WarehouseModal({ onClose, onDone, onError }: { onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({ code: '', name: '', address: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/cylinder/warehouses', { body: form });
      onDone('Godown saved.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="Add godown" onClose={onClose} footer={<Button busy={busy} onClick={submit}>Save</Button>}>
      <Field label="Code"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} /></Field>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
      <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} /></Field>
    </Modal>
  );
}
