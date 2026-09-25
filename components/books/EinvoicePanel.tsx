'use client';

import React, { useMemo, useState } from 'react';
import { FileJson, Truck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Field, inputClass, Modal, useToast } from '../ui';
import { BooksHeader, Column, Kpi, PeriodBar, plain, ReportTable, Tabs, usePeriod } from './shared';

interface Row { id: string; invoiceNumber: string; date: string; customerName: string; gstin: string; b2b: boolean; grandTotal: number; isIgst: boolean; irn: string; ackNo: string; ackDate: string; hasQr: boolean; ewbNo: string; ewbDate: string; ewbValidUpto: string }
interface Built { json: unknown; count: number; errors: { invoiceNumber: string; problems: string[] }[] }

function saveJson(data: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EinvoicePanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [period, setPeriod] = usePeriod('month');
  const q = useApiData<Row[]>(`/api/books/einvoice?from=${period.from}&to=${period.to}`, onError);
  const [view, setView] = useState<'b2b' | 'all'>('b2b');
  const rows = useMemo(() => (q.data ?? []).filter((r) => view === 'all' || r.b2b), [q.data, view]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [problems, setProblems] = useState<Built['errors'] | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [distance, setDistance] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);

  const build = async (kind: 'einvoice' | 'ewaybill') => {
    setBusy(kind);
    try {
      const r = await api<Built>('/api/books/einvoice', { body: { kind, ids: picked, vehicleNo, distanceKm: Number(distance) || 0 } });
      if (r.count) {
        saveJson(r.json, `${kind === 'einvoice' ? 'e-invoice' : 'e-way-bill'}-${period.from.slice(0, 7)}-${r.count}.json`);
        showToast(`${r.count} invoice${r.count > 1 ? 's' : ''} in the file.${r.errors.length ? ` ${r.errors.length} skipped.` : ''}`);
      }
      setProblems(r.errors.length ? r.errors : null);
      if (!r.count && !r.errors.length) onError('Nothing to export.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const allPicked = rows.length > 0 && rows.every((r) => picked.includes(r.id));
  const columns: Column<Row>[] = [
    { label: <input type="checkbox" checked={allPicked} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} />, render: (r) => <input type="checkbox" checked={picked.includes(r.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} /> },
    { label: 'Date', render: (r) => r.date },
    { label: 'Invoice', render: (r) => <span className="font-mono font-bold">{r.invoiceNumber}</span> },
    { label: 'Customer', render: (r) => <div><div className="font-bold">{r.customerName}</div><div className="text-[10px] text-slate-400">{r.gstin || 'Unregistered (B2C)'}</div></div> },
    { label: 'Value', align: 'right', render: (r) => plain(r.grandTotal) },
    { label: 'E-invoice', render: (r) => (r.irn ? <div><Badge tone="green">IRN</Badge><div className="text-[10px] font-mono text-slate-400">{r.ackNo || r.irn.slice(0, 12)}</div></div> : r.b2b ? <Badge tone="amber">Pending</Badge> : <span className="text-[10px] text-slate-400">Not needed</span>) },
    { label: 'E-way bill', render: (r) => (r.ewbNo ? <div><Badge tone="green">{r.ewbNo}</Badge>{r.ewbValidUpto && <div className="text-[10px] text-slate-400">valid {r.ewbValidUpto}</div>}</div> : r.grandTotal > 50000 ? <Badge tone="amber">Check</Badge> : <span className="text-[10px] text-slate-400">—</span>) },
    { label: '', render: (r) => <Button size="sm" tone="ghost" onClick={() => setEditing(r)}>Enter IRN / EWB</Button> },
  ];

  const data = q.data ?? [];
  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={FileJson} title="E-invoice & e-way bill" subtitle="Build the JSON files for the e-invoice portal (IRP bulk upload) and the e-way bill portal (bulk generate). Then paste the IRN, Ack no., signed QR and e-way bill no. back here — they print on the invoice. Direct API filing needs GSP credentials." />
      <PeriodBar value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="B2B invoices" value={String(data.filter((r) => r.b2b).length)} />
        <Kpi label="IRN pending" value={String(data.filter((r) => r.b2b && !r.irn).length)} tone="amber" />
        <Kpi label="IRN generated" value={String(data.filter((r) => r.irn).length)} tone="green" />
        <Kpi label="E-way bills" value={String(data.filter((r) => r.ewbNo).length)} tone="blue" />
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <Tabs value={view} onChange={(v) => { setView(v); setPicked([]); }} items={[['b2b', 'B2B only'], ['all', 'All invoices']]} />
        <div className="text-xs font-semibold text-slate-500">{picked.length} selected</div>
        <Button busy={busy === 'einvoice'} disabled={!picked.length} onClick={() => build('einvoice')}><FileJson className="h-4 w-4" /> E-invoice JSON</Button>
        <div className="w-44"><input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="Vehicle no. (if not set)" className={`${inputClass} py-1.5`} /></div>
        <div className="w-28"><input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Distance km" className={`${inputClass} py-1.5`} /></div>
        <Button tone="secondary" busy={busy === 'ewaybill'} disabled={!picked.length} onClick={() => build('ewaybill')}><Truck className="h-4 w-4" /> E-way bill JSON</Button>
      </div>
      <p className="text-[11px] text-slate-500">E-invoice is required once your turnover crossed ₹5 crore in any year since 2017-18. E-way bill: needed above ₹50,000 (state limits vary); LPG for household and exempted (NDEC) customers is exempt. Distance 0 lets the portal work it out from the PIN codes.</p>
      {problems && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs space-y-1">
          <div className="font-black text-amber-900">Skipped — fix these and export again</div>
          {problems.map((p) => <div key={p.invoiceNumber}><strong className="font-mono">{p.invoiceNumber}</strong>: {p.problems.join('; ')}</div>)}
        </div>
      )}
      <ReportTable rows={rows} columns={columns} rowKey={(r) => r.id} dense empty="No invoices in this period." />
      {editing && <DetailsForm row={editing} onClose={() => setEditing(null)} onError={onError} onSaved={() => { showToast('Saved — it will print on the invoice.'); setEditing(null); q.reload(); }} />}
    </div>
  );
}

function DetailsForm({ row, onClose, onSaved, onError }: { row: Row; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [v, setV] = useState({ irn: row.irn, ackNo: row.ackNo, ackDate: row.ackDate, signedQr: '', ewbNo: row.ewbNo, ewbDate: row.ewbDate, ewbValidUpto: row.ewbValidUpto });
  const [busy, setBusy] = useState(false);
  const f = (k: keyof typeof v, label: string, type = 'text', hint?: string) => <Field label={label} hint={hint}><input type={type} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={inputClass} /></Field>;
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/books/einvoice', { method: 'PATCH', body: { id: row.id, ...v, signedQr: v.signedQr || undefined } });
      onSaved();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open wide title={`${row.invoiceNumber} — IRN & e-way bill`} onClose={onClose} footer={<Button busy={busy} onClick={save}>Save</Button>}>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">{f('irn', 'IRN', 'text', '64-character code from the e-invoice portal')}</div>
        {f('ackNo', 'Ack no.')}
        {f('ackDate', 'Ack date', 'date')}
        <div />
        {f('ewbNo', 'E-way bill no.', 'text', '12 digits')}
        {f('ewbDate', 'E-way bill date', 'date')}
        {f('ewbValidUpto', 'Valid up to', 'date')}
      </div>
      <Field label="Signed QR code text (optional)" hint={row.hasQr ? 'A QR is saved — leave blank to keep it.' : 'Paste the SignedQRCode from the portal to print the official QR.'}><textarea rows={3} value={v.signedQr} onChange={(e) => setV({ ...v, signedQr: e.target.value })} className={`${inputClass} font-mono text-[10px]`} /></Field>
    </Modal>
  );
}
