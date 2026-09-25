'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, BellRing, Download, FileBarChart, Printer, Search } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Button, Card, Empty, cx, useToast } from '../ui';
import { BooksHeader, Column, Kpi, money, PeriodBar, plain, ReportTable, usePeriod } from './shared';

type ColType = 'text' | 'date' | 'money' | 'number' | 'percent';
interface Meta { key: string; title: string; group: string; description: string; asOf: boolean }
interface Report {
  key: string;
  title: string;
  description: string;
  columns: { key: string; label: string; type?: ColType; total?: boolean }[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: number | string; type?: ColType }[];
  note?: string;
  from: string;
  to: string;
}

const GROUP_ORDER = ['Sales', 'Purchases', 'GST', 'Returns', 'Accounts', 'Analysis', 'Stock', 'Staff', 'Operations'];

const fmt = (v: unknown, type?: ColType) => {
  if (v === null || v === undefined || v === '') return '';
  if (type === 'money') return plain(Number(v));
  if (type === 'number') return Number(v).toLocaleString('en-IN');
  if (type === 'percent') return `${Number(v).toFixed(1)}%`;
  return String(v);
};

export default function ReportsHub({ initial }: { initial?: string }) {
  const [toast, showToast] = useToast();
  const [period, setPeriod] = usePeriod('month');
  const [key, setKey] = useState(initial || 'sales-payments-summary');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [reminding, setReminding] = useState(false);
  const remind = async () => {
    setReminding(true);
    try {
      const r = await api<{ sent: number }>('/api/books/empty-reminders', { body: {} });
      showToast(`Reminder sent to ${r.sent} customer(s).`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setReminding(false);
    }
  };
  const onError = (m: string) => showToast(m, 'error');
  const listData = useApiData<Meta[]>('/api/books/reports', onError).data;
  const list = useMemo(() => listData ?? [], [listData]);
  const reportQ = useApiData<Report>(`/api/books/reports?key=${key}&from=${period.from}&to=${period.to}`, onError);
  const report = reportQ.data;
  const current = list.find((r) => r.key === key);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const shown = list.filter((r) => !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    return GROUP_ORDER.map((g) => ({ group: g, items: shown.filter((r) => r.group === g) })).filter((g) => g.items.length);
  }, [list, search]);

  const columns: Column<Record<string, unknown>>[] = (report?.columns ?? []).map((c) => ({
    label: c.label,
    align: c.type === 'money' || c.type === 'number' || c.type === 'percent' ? 'right' : undefined,
    render: (r) => {
      const v = r[c.key];
      if (c.type === 'money' && Number(v) < 0) return <span className="text-rose-600">{fmt(v, c.type)}</span>;
      return fmt(v, c.type);
    },
    total: (c.type === 'money' || c.type === 'number') && c.total !== false ? (rows) => fmt(rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0), c.type) : undefined,
  }));

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/books/reports?key=${key}&from=${period.from}&to=${period.to}&format=xlsx`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Download failed.');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || `${key}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={BarChart3} title="Reports" subtitle="Every sales, purchase, GST, return and accounts report — pick one, choose the period, download it as Excel." />
      <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
        <div className="rounded-2xl bg-slate-900 text-slate-200 p-2 lg:sticky lg:top-4 print:hidden">
          <div className="relative p-1">
            <Search className="h-3.5 w-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a report" className="w-full rounded-lg bg-slate-800 border border-slate-700 pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          {groups.map((g) => (
            <div key={g.group} className="mt-2">
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{g.group}</div>
              {g.items.map((r) => (
                <button key={r.key} onClick={() => setKey(r.key)} title={r.description} className={cx('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition', key === r.key ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300')}>
                  <FileBarChart className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-3 min-w-0">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{current?.title || report?.title || 'Report'}</h3>
                <p className="text-xs text-slate-500">{current?.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                {key === 'empty-cylinders' && <Button tone="secondary" size="sm" busy={reminding} onClick={remind}><BellRing className="h-3.5 w-3.5" /> Remind overdue</Button>}
                <Button tone="secondary" size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</Button>
                <Button size="sm" busy={downloading} onClick={download}><Download className="h-3.5 w-3.5" /> Excel</Button>
              </div>
            </div>
            <div className="mt-3 print:hidden">
              <PeriodBar value={period} onChange={setPeriod} single={current?.asOf} />
            </div>
            <div className="hidden print:block text-xs text-slate-500">{current?.asOf ? `As on ${period.to}` : `${period.from} to ${period.to}`}</div>
          </Card>

          {!report || report.key !== key ? (
            <Empty>Loading report…</Empty>
          ) : (
            <>
              {!!report.summary?.length && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {report.summary.map((s) => (
                    <Kpi key={s.label} label={s.label} value={s.type === 'money' ? money(Number(s.value)) : s.type === 'percent' ? `${Number(s.value).toFixed(1)}%` : String(s.value)} />
                  ))}
                </div>
              )}
              <ReportTable rows={report.rows} columns={columns} rowKey={(_, i) => String(i)} dense />
              <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400">
                <span>{report.rows.length} rows{report.note ? ` · ${report.note}` : ''}</span>
                {reportQ.loading && <span>Refreshing…</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
