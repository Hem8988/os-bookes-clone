'use client';

import React, { useState } from 'react';
import { Download, FileCheck2, Upload } from 'lucide-react';
import { errorMessage } from '../../lib/api';
import { Badge, Button, Card, Empty, cx, useToast } from '../ui';
import { BooksHeader, Column, Kpi, money, PeriodBar, plain, ReportTable, Tabs, usePeriod } from './shared';

interface Result {
  columns: { key: string; label: string; type?: string }[];
  rows: Record<string, unknown>[];
  summary: { label: string; value: number; type?: string }[];
  note: string;
  uploaded: number;
}
const TONE: Record<string, 'green' | 'amber' | 'red' | 'blue'> = { Matched: 'green', 'Probable (no. differs)': 'blue', 'Amount differs': 'amber', 'Only in GSTR-2B': 'red', 'Only in books': 'red' };

export default function Gstr2bPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [period, setPeriod] = usePeriod('month');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<'run' | 'xlsx' | null>(null);
  const [filter, setFilter] = useState<'issues' | 'all'>('issues');

  const send = async (format?: 'xlsx') => {
    if (!file) return;
    setBusy(format || 'run');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('from', period.from);
      form.append('to', period.to);
      if (format) form.append('format', format);
      const res = await fetch('/api/books/gstr2b', { method: 'POST', body: form, credentials: 'same-origin' });
      if (format) {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Download failed.');
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = `GSTR-2B-reconciliation-${period.from.slice(0, 7)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed.');
        setResult(json.data);
      }
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const shown = (result?.rows ?? []).filter((r) => filter === 'all' || r.status !== 'Matched');
  const columns: Column<Record<string, unknown>>[] = (result?.columns ?? []).map((c) => ({
    label: c.label,
    align: c.type === 'money' ? 'right' : undefined,
    render: (r) => {
      const v = r[c.key];
      if (c.key === 'status') return <Badge tone={TONE[String(v)] || 'slate'}>{String(v)}</Badge>;
      if (c.type === 'money') return <span className={cx(c.key === 'difference' && Number(v) !== 0 && 'font-bold text-rose-600')}>{v ? plain(Number(v)) : ''}</span>;
      return v == null ? '' : String(v);
    },
  }));

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={FileCheck2} title="GSTR-2B match" subtitle="Download GSTR-2B from the GST portal (Returns → GSTR-2B → Download JSON or Excel), upload it here and see which purchase bills your suppliers have filed, which differ, and which are missing." />
      <Card>
        <div className="space-y-3">
          <PeriodBar value={period} onChange={setPeriod} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
              <Upload className="h-4 w-4" /> {file ? file.name : 'Choose GSTR-2B file (.json / .xlsx)'}
              <input type="file" accept=".json,.xlsx,.csv,application/json" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} />
            </label>
            <Button busy={busy === 'run'} disabled={!file} onClick={() => send()}>Match with books</Button>
            {result && <Button tone="secondary" busy={busy === 'xlsx'} onClick={() => send('xlsx')}><Download className="h-4 w-4" /> Excel</Button>}
          </div>
        </div>
      </Card>
      {!result ? (
        <Empty>Upload the month’s GSTR-2B to start.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {result.summary.map((s) => <Kpi key={s.label} label={s.label} value={s.type === 'money' ? money(s.value) : String(s.value)} tone={/Only|differs/.test(s.label) && s.value ? 'red' : s.label === 'Matched' ? 'green' : 'slate'} />)}
          </div>
          <p className="text-xs text-slate-500">{result.uploaded} documents read from the file. {result.note}</p>
          <Tabs value={filter} onChange={setFilter} items={[['issues', 'Needs attention'], ['all', 'All']]} />
          <ReportTable rows={shown} columns={columns} rowKey={(_r, i) => String(i)} dense empty="Everything matches. 🎉" />
        </>
      )}
    </div>
  );
}
