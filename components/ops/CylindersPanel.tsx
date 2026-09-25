'use client';

import React, { useState } from 'react';
import { FileUp, Plus, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Column, Kpi, ReportTable, Tabs } from '../books/shared';

interface Asset { id: string; serialNo: string; productId: string | null; productName: string; manufacturer: string | null; mfgDate: string | null; lastTestDate: string | null; nextTestDue: string | null; tareWeight: number | null; status: string; locationName: string | null; notes: string | null }
interface Summary { total: number; overdue: number; dueSoon: number; byStatus: Record<string, number> }
interface Product { id: string; name: string }

const STATUSES: [string, string][] = [
  ['IN_STOCK', 'In godown'],
  ['WITH_CUSTOMER', 'With customer'],
  ['WITH_DELIVERY_BOY', 'With delivery boy'],
  ['AT_PLANT', 'At plant'],
  ['FOR_TESTING', 'Sent for testing'],
  ['CONDEMNED', 'Condemned'],
];

/** Parse "serial, product, manufacturer, mfg date, last test date" lines (CSV / pasted from Excel). */
function parseRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.split(/\t|,/).map((c) => c.trim()))
    .filter((c) => c[0] && !/serial/i.test(c[0]))
    .map(([serialNo, productName, manufacturer, mfgDate, lastTestDate]) => ({ serialNo, productName, manufacturer, mfgDate: toIso(mfgDate), lastTestDate: toIso(lastTestDate) }));
}
function toIso(v?: string) {
  if (!v) return null;
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(v);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export default function CylindersPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [filter, setFilter] = useState<'all' | 'due' | 'overdue'>('all');
  const [search, setSearch] = useState('');
  const q = useApiData<{ rows: Asset[]; summary: Summary }>(`/api/ops/cylinders?filter=${filter}&search=${encodeURIComponent(search)}`, onError);
  const products = useApiData<Product[]>('/api/products', onError).data ?? [];
  const [editing, setEditing] = useState<Asset | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const now = today();

  const columns: Column<Asset>[] = [
    { label: 'Serial no.', render: (a) => <span className="font-mono font-bold">{a.serialNo}</span> },
    { label: 'Cylinder', render: (a) => a.productName },
    { label: 'Maker', render: (a) => a.manufacturer || '—' },
    { label: 'Made', render: (a) => a.mfgDate || '—' },
    { label: 'Last test', render: (a) => a.lastTestDate || '—' },
    { label: 'Next test due', render: (a) => (a.nextTestDue ? <Badge tone={a.nextTestDue < now ? 'red' : a.nextTestDue <= addDays(now, 30) ? 'amber' : 'green'}>{a.nextTestDue}</Badge> : '—') },
    { label: 'Where', render: (a) => <div>{STATUSES.find(([k]) => k === a.status)?.[1] || a.status}{a.locationName && <div className="text-[10px] text-slate-400">{a.locationName}</div>}</div> },
    { label: '', render: (a) => <Button size="sm" tone="ghost" onClick={() => setEditing(a)}>Edit</Button> },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={ShieldCheck} title="Cylinder register & testing" subtitle="Every cylinder by serial number with its statutory test dates (first test 10 years after manufacture, then every 5 years). Overdue cylinders must not be filled." actions={<><Button tone="secondary" onClick={() => setImporting(true)}><FileUp className="h-4 w-4" /> Import list</Button><Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add cylinder</Button></>} />
      {q.data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Cylinders registered" value={String(q.data.summary.total)} />
          <Kpi label="Test overdue" value={String(q.data.summary.overdue)} tone={q.data.summary.overdue ? 'red' : 'green'} onClick={() => setFilter('overdue')} />
          <Kpi label="Due in 30 days" value={String(q.data.summary.dueSoon)} tone="amber" onClick={() => setFilter('due')} />
          <Kpi label="Condemned" value={String(q.data.summary.byStatus.CONDEMNED || 0)} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onChange={setFilter} items={[['all', 'All'], ['due', 'Due soon'], ['overdue', 'Overdue']]} />
        <div className="w-64"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search serial / location" className={cx(inputClass, 'py-1.5')} /></div>
      </div>
      <ReportTable rows={q.data?.rows ?? []} columns={columns} rowKey={(a) => a.id} dense empty="No cylinders registered yet — add them or import your list." />

      {editing && <AssetForm asset={editing === 'new' ? null : editing} products={products} onClose={() => setEditing(null)} onSaved={() => { showToast('Cylinder saved.'); setEditing(null); q.reload(); }} onError={onError} />}
      {importing && <ImportForm onClose={() => setImporting(false)} onDone={(m) => { showToast(m); setImporting(false); q.reload(); }} onError={onError} />}
    </div>
  );
}

function addDays(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

function AssetForm({ asset, products, onClose, onSaved, onError }: { asset: Asset | null; products: Product[]; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [v, setV] = useState({ serialNo: asset?.serialNo || '', productId: asset?.productId || products[0]?.id || '', manufacturer: asset?.manufacturer || '', mfgDate: asset?.mfgDate || '', lastTestDate: asset?.lastTestDate || '', nextTestDue: asset?.nextTestDue || '', status: asset?.status || 'IN_STOCK', locationName: asset?.locationName || '', notes: asset?.notes || '' });
  const [busy, setBusy] = useState(false);
  const f = (k: keyof typeof v, label: string, type = 'text') => <Field label={label}><input type={type} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={inputClass} /></Field>;
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/ops/cylinders', { body: { ...v, id: asset?.id, nextTestDue: v.nextTestDue || null } });
      onSaved();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={asset ? `Cylinder ${asset.serialNo}` : 'Add cylinder'} onClose={onClose} footer={<Button busy={busy} disabled={!v.serialNo.trim()} onClick={save}>Save</Button>}>
      <div className="grid grid-cols-2 gap-3">
        {f('serialNo', 'Serial number')}
        <Field label="Cylinder type"><select value={v.productId} onChange={(e) => setV({ ...v, productId: e.target.value })} className={inputClass}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        {f('manufacturer', 'Manufacturer')}
        {f('mfgDate', 'Manufacture date', 'date')}
        {f('lastTestDate', 'Last hydro test', 'date')}
        <Field label="Next test due" hint="Blank = worked out automatically"><input type="date" value={v.nextTestDue} onChange={(e) => setV({ ...v, nextTestDue: e.target.value })} className={inputClass} /></Field>
        <Field label="Where is it"><select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} className={inputClass}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        {f('locationName', 'Location / customer')}
      </div>
      {f('notes', 'Notes')}
    </Modal>
  );
}

function ImportForm({ onClose, onDone, onError }: { onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = parseRows(text);
  const run = async () => {
    setBusy(true);
    try {
      const r = await api<{ added: number; updated: number; errors: string[] }>('/api/ops/cylinders', { method: 'PUT', body: { rows } });
      onDone(`${r.added} added, ${r.updated} updated${r.errors.length ? ` — ${r.errors.length} rows had errors: ${r.errors.slice(0, 3).join('; ')}` : ''}.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open wide title="Import cylinder list" onClose={onClose} footer={<Button busy={busy} disabled={!rows.length} onClick={run}>Import {rows.length} cylinders</Button>}>
      <p className="text-xs text-slate-600">Paste from Excel or a CSV file, one cylinder per line, columns in this order: <strong>serial no, cylinder type, manufacturer, manufacture date, last test date</strong> (dates as dd/mm/yyyy). Existing serial numbers are updated.</p>
      <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 cursor-pointer"><FileUp className="h-4 w-4" /> Choose CSV file<input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setText(await file.text()); }} /></label>
      <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} className={cx(inputClass, 'font-mono text-xs')} placeholder={'AB123456, 19 KG, Kosan, 15/03/2018, 15/03/2023\nAB123457, 47.5 KG, Hindustan, 01/06/2016,'} />
      {rows.length > 0 && <p className="text-[11px] text-slate-500">First row: {rows[0].serialNo} · {rows[0].productName} · made {rows[0].mfgDate || '—'} · tested {rows[0].lastTestDate || '—'}</p>}
    </Modal>
  );
}
