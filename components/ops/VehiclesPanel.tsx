'use client';

import React, { useState } from 'react';
import { AlertTriangle, Fuel, Plus, Truck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Empty, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Column, LedgerOption, plain, ReportTable } from '../books/shared';

interface Log { id: string; date: string; kind: string; odometer: number | null; litres: number | null; amount: number; notes: string | null; expenseEntryId: string | null }
interface Vehicle { id: string; number: string; type: string; capacity: number | null; driverUserId: string | null; driverName: string | null; fuelType: string; odometer: number; insuranceUpto: string | null; pucUpto: string | null; permitUpto: string | null; fitnessUpto: string | null; serviceDueKm: number | null; serviceDueDate: string | null; active: boolean; notes: string | null; logs: Log[] }
interface Cost { vehicle: string; type: string; driver: string; km: number; litres: number; kmPerLitre: number; fuelCost: number; maintenance: number; total: number; perKm: number }
interface Data { vehicles: Vehicle[]; alerts: { vehicle: string; item: string; due: string; overdue: boolean }[]; costs: Cost[]; drivers: { id: string; name: string }[]; from: string; to: string }

const KINDS: [string, string][] = [['FUEL', 'Fuel'], ['SERVICE', 'Service'], ['REPAIR', 'Repair'], ['TYRE', 'Tyre'], ['INSURANCE', 'Insurance'], ['OTHER', 'Other']];

export default function VehiclesPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const q = useApiData<Data>('/api/ops/vehicles', onError);
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const [logFor, setLogFor] = useState<Vehicle | null>(null);
  const d = q.data;

  const costCols: Column<Cost>[] = [
    { label: 'Vehicle', render: (c) => <span className="font-bold">{c.vehicle}</span> },
    { label: 'Driver', render: (c) => c.driver || '—' },
    { label: 'Km run', align: 'right', render: (c) => c.km.toLocaleString('en-IN'), total: (r) => r.reduce((s, x) => s + x.km, 0).toLocaleString('en-IN') },
    { label: 'Litres', align: 'right', render: (c) => plain(c.litres) },
    { label: 'Km / litre', align: 'right', render: (c) => (c.kmPerLitre ? c.kmPerLitre.toFixed(1) : '—') },
    { label: 'Fuel ₹', align: 'right', render: (c) => plain(c.fuelCost), total: (r) => plain(r.reduce((s, x) => s + x.fuelCost, 0)) },
    { label: 'Maintenance ₹', align: 'right', render: (c) => plain(c.maintenance), total: (r) => plain(r.reduce((s, x) => s + x.maintenance, 0)) },
    { label: 'Total ₹', align: 'right', render: (c) => plain(c.total), total: (r) => plain(r.reduce((s, x) => s + x.total, 0)) },
    { label: '₹ / km', align: 'right', render: (c) => (c.perKm ? plain(c.perKm) : '—') },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={Truck} title="Vehicles" subtitle="Insurance, PUC, permit and fitness expiry alerts, fuel and service log (booked as expenses automatically), cost per km." actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add vehicle</Button>} />
      {!d ? (
        <Empty>Loading…</Empty>
      ) : (
        <>
          {d.alerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-1">
              <div className="text-xs font-black text-amber-900 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Attention</div>
              {d.alerts.map((a, i) => <div key={i} className={cx('text-xs', a.overdue ? 'text-rose-700 font-bold' : 'text-amber-900')}>{a.vehicle} · {a.item} {a.overdue ? 'expired' : 'due'} {a.due}</div>)}
            </div>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {d.vehicles.length === 0 && <Empty>No vehicles yet.</Empty>}
            {d.vehicles.map((v) => (
              <Card key={v.id} title={<span className="flex items-center gap-2 font-mono">{v.number}{!v.active && <Badge tone="slate">inactive</Badge>}</span>} actions={<Button size="sm" tone="ghost" onClick={() => setEditing(v)}>Edit</Button>}>
                <div className="text-xs space-y-1">
                  <div className="text-slate-500">{v.type}{v.capacity ? ` · ${v.capacity} cylinders` : ''} · {v.fuelType} · {v.driverName || 'no driver'}</div>
                  <div className="font-mono">{v.odometer.toLocaleString('en-IN')} km</div>
                  <div className="flex flex-wrap gap-1">
                    {[['Insurance', v.insuranceUpto], ['PUC', v.pucUpto], ['Permit', v.permitUpto], ['Fitness', v.fitnessUpto]].map(([label, date]) => <Badge key={label} tone={!date ? 'slate' : date < today() ? 'red' : 'green'}>{label}: {date || '—'}</Badge>)}
                  </div>
                  <div className="border-t border-slate-100 pt-2 mt-2 space-y-0.5">
                    {v.logs.slice(0, 4).map((l) => <div key={l.id} className="flex justify-between text-[11px]"><span>{l.date} · {l.kind.toLowerCase()}{l.litres ? ` ${l.litres} L` : ''}{l.odometer ? ` @ ${l.odometer} km` : ''}</span><span className="font-mono">{plain(l.amount)}</span></div>)}
                    {!v.logs.length && <div className="text-[11px] text-slate-400">No fuel / service entries yet.</div>}
                  </div>
                  <Button size="sm" className="w-full mt-2" onClick={() => setLogFor(v)}><Fuel className="h-3.5 w-3.5" /> Add fuel / service</Button>
                </div>
              </Card>
            ))}
          </div>
          <div>
            <div className="text-xs font-black text-slate-700 mb-2">Running cost {d.from} to {d.to}</div>
            <ReportTable rows={d.costs} columns={costCols} rowKey={(c) => c.vehicle} dense />
          </div>
        </>
      )}
      {editing && <VehicleForm v={editing === 'new' ? null : editing} drivers={d?.drivers ?? []} onClose={() => setEditing(null)} onSaved={() => { showToast('Vehicle saved.'); setEditing(null); q.reload(); }} onError={onError} />}
      {logFor && <LogForm v={logFor} onClose={() => setLogFor(null)} onSaved={(m) => { showToast(m); setLogFor(null); q.reload(); }} onError={onError} />}
    </div>
  );
}

function VehicleForm({ v, drivers, onClose, onSaved, onError }: { v: Vehicle | null; drivers: { id: string; name: string }[]; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [x, setX] = useState({ number: v?.number || '', type: v?.type || 'Tempo', capacity: String(v?.capacity || ''), driverUserId: v?.driverUserId || '', fuelType: v?.fuelType || 'Diesel', odometer: String(v?.odometer || ''), insuranceUpto: v?.insuranceUpto || '', pucUpto: v?.pucUpto || '', permitUpto: v?.permitUpto || '', fitnessUpto: v?.fitnessUpto || '', serviceDueKm: String(v?.serviceDueKm || ''), serviceDueDate: v?.serviceDueDate || '', active: v?.active !== false });
  const [busy, setBusy] = useState(false);
  const f = (k: keyof typeof x, label: string, type = 'text') => <Field label={label}><input type={type} value={x[k] as string} onChange={(e) => setX({ ...x, [k]: e.target.value })} className={inputClass} /></Field>;
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/ops/vehicles', { body: { ...x, id: v?.id, capacity: Number(x.capacity) || null, odometer: Number(x.odometer) || 0, serviceDueKm: Number(x.serviceDueKm) || null } });
      onSaved();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open wide title={v ? `Vehicle ${v.number}` : 'Add vehicle'} onClose={onClose} footer={<Button busy={busy} disabled={!x.number.trim()} onClick={save}>Save</Button>}>
      <div className="grid sm:grid-cols-3 gap-3">
        {f('number', 'Number (e.g. MH12 AB 1234)')}
        <Field label="Type"><select value={x.type} onChange={(e) => setX({ ...x, type: e.target.value })} className={inputClass}>{['Tempo', 'Tata Ace', 'Truck', 'Pickup', 'Bike', 'Other'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        {f('capacity', 'Capacity (cylinders)', 'number')}
        <Field label="Driver"><select value={x.driverUserId} onChange={(e) => setX({ ...x, driverUserId: e.target.value })} className={inputClass}><option value="">—</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Fuel"><select value={x.fuelType} onChange={(e) => setX({ ...x, fuelType: e.target.value })} className={inputClass}>{['Diesel', 'Petrol', 'CNG', 'Electric'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        {f('odometer', 'Odometer (km)', 'number')}
        {f('insuranceUpto', 'Insurance valid up to', 'date')}
        {f('pucUpto', 'PUC valid up to', 'date')}
        {f('permitUpto', 'Permit valid up to', 'date')}
        {f('fitnessUpto', 'Fitness valid up to', 'date')}
        {f('serviceDueKm', 'Next service at (km)', 'number')}
        {f('serviceDueDate', 'Next service date', 'date')}
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={x.active} onChange={(e) => setX({ ...x, active: e.target.checked })} /> In use</label>
    </Modal>
  );
}

function LogForm({ v, onClose, onSaved, onError }: { v: Vehicle; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const ledgers = (useApiData<LedgerOption[]>('/api/books/accounts', onError).data ?? []).filter((l) => l.groupName === 'Cash-in-Hand' || l.groupName === 'Bank Accounts');
  const [x, setX] = useState({ date: today(), kind: 'FUEL', odometer: '', litres: '', amount: '', paidFrom: 'CASH', paidAccountId: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const options = ledgers.filter((l) => (x.paidFrom === 'BANK' ? l.groupName === 'Bank Accounts' : l.groupName === 'Cash-in-Hand'));
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ expenseEntryId: string | null }>('/api/ops/vehicles', { method: 'PUT', body: { ...x, vehicleId: v.id, odometer: Number(x.odometer) || null, litres: Number(x.litres) || null, amount: Number(x.amount) || 0, paidAccountId: x.paidAccountId || options[0]?.id || null } });
      onSaved(r.expenseEntryId ? 'Saved and booked as an expense.' : 'Saved.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={`${v.number} — fuel / service`} onClose={onClose} footer={<Button busy={busy} onClick={save}>Save</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={x.date} onChange={(e) => setX({ ...x, date: e.target.value })} className={inputClass} /></Field>
        <Field label="Type"><select value={x.kind} onChange={(e) => setX({ ...x, kind: e.target.value })} className={inputClass}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Odometer (km)"><input type="number" value={x.odometer} onChange={(e) => setX({ ...x, odometer: e.target.value })} placeholder={String(v.odometer)} className={inputClass} /></Field>
        {x.kind === 'FUEL' ? <Field label="Litres"><input type="number" step="0.01" value={x.litres} onChange={(e) => setX({ ...x, litres: e.target.value })} className={inputClass} /></Field> : <div />}
        <Field label="Amount ₹"><input type="number" value={x.amount} onChange={(e) => setX({ ...x, amount: e.target.value })} className={inputClass} /></Field>
        <Field label="Paid"><select value={x.paidFrom} onChange={(e) => setX({ ...x, paidFrom: e.target.value, paidAccountId: '' })} className={inputClass}><option value="CASH">Cash</option><option value="BANK">Bank</option></select></Field>
      </div>
      {Number(x.amount) > 0 && <Field label="From ledger"><select value={x.paidAccountId || options[0]?.id || ''} onChange={(e) => setX({ ...x, paidAccountId: e.target.value })} className={inputClass}>{options.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>}
      <Field label="Notes"><input value={x.notes} onChange={(e) => setX({ ...x, notes: e.target.value })} className={inputClass} /></Field>
    </Modal>
  );
}
