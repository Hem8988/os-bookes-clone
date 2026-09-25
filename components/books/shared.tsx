'use client';

import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { fyStart, monthRange } from '../../lib/books';
import { useApiData } from '../../lib/useApiData';
import { cx, today } from '../ui';

// Building blocks shared by the Books of accounts screens.

/** ₹1,23,456.00 — always two decimals, Indian grouping. */
export const money = (n: number | null | undefined) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const plain = (n: number | null | undefined) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Dr / Cr style balance: 1,200.00 Dr */
export const drCr = (n: number) => (n === 0 ? '0.00' : `${plain(Math.abs(n))} ${n > 0 ? 'Dr' : 'Cr'}`);

export interface Period {
  from: string;
  to: string;
}

const thisMonth = () => today().slice(0, 7);

export function usePeriod(initial: 'month' | 'fy' = 'month'): [Period, (p: Period) => void] {
  const [period, setPeriod] = useState<Period>(() => (initial === 'fy' ? { from: fyStart(today()), to: today() } : monthRange(thisMonth())));
  return [period, setPeriod];
}

/** From / to dates with quick picks (this month, last month, quarter, FY). */
export function PeriodBar({ value, onChange, single }: { value: Period; onChange: (p: Period) => void; single?: boolean }) {
  const now = today();
  const [y, m] = now.split('-').map(Number);
  const last = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const qStartMonth = [4, 7, 10, 1][Math.floor(((m + 8) % 12) / 3)];
  const qYear = qStartMonth > m ? y - 1 : y;
  const quick: [string, Period][] = [
    ['This month', monthRange(thisMonth())],
    ['Last month', monthRange(last)],
    ['This quarter', { from: `${qYear}-${String(qStartMonth).padStart(2, '0')}-01`, to: now }],
    ['This FY', { from: fyStart(now), to: now }],
  ];
  const dateClass = 'w-36 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="h-4 w-4 text-slate-400" />
      {!single && <input type="date" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} className={dateClass} />}
      {!single && <span className="text-xs text-slate-400">to</span>}
      <input type="date" value={value.to} min={single ? undefined : value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} className={dateClass} />
      {!single && (
        <div className="flex flex-wrap gap-1">
          {quick.map(([label, p]) => (
            <button
              key={label}
              onClick={() => onChange(p)}
              className={cx('px-2.5 py-1 rounded-lg text-[11px] font-bold border', p.from === value.from && p.to === value.to ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Fetch a Books report for a period. */
export function useBooksReport<T>(report: string | null, period: Period, extra = '', onError?: (m: string) => void) {
  const url = report ? `/api/books?report=${report}&from=${period.from}&to=${period.to}${extra}` : null;
  return useApiData<T>(url, onError);
}

/** Page header used by every Books screen. */
export function BooksHeader({ title, subtitle, icon: Icon, actions }: { title: string; subtitle?: string; icon: React.ElementType; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Tabs row inside a Books screen. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 w-fit">
      {items.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold transition', value === key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-800')}>
          {label}
        </button>
      ))}
    </div>
  );
}

export interface Column<R> {
  label: React.ReactNode;
  render: (row: R) => React.ReactNode;
  align?: 'right' | 'center';
  total?: (rows: R[]) => React.ReactNode;
  className?: string;
}

/** Report table with sticky header and optional totals row. */
export function ReportTable<R>({ rows, columns, empty = 'No entries for this period.', rowKey, onRowClick, dense }: { rows: R[]; columns: Column<R>[]; empty?: string; rowKey: (r: R, i: number) => string; onRowClick?: (r: R) => void; dense?: boolean }) {
  const hasTotals = columns.some((c) => c.total);
  const pad = dense ? 'px-2 py-1.5' : 'px-3 py-2';
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-900 text-white">
          <tr>
            {columns.map((c, ci) => (
              <th key={ci} className={cx(pad, 'font-bold whitespace-nowrap', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-slate-400 font-semibold">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cx('hover:bg-emerald-50/40', onRowClick && 'cursor-pointer')}>
              {columns.map((c, ci) => (
                <td key={ci} className={cx(pad, c.align === 'right' ? 'text-right font-mono tabular-nums' : c.align === 'center' ? 'text-center' : '', c.className)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasTotals && rows.length > 0 && (
          <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
            <tr>
              {columns.map((c, i) => (
                <td key={i} className={cx(pad, c.align === 'right' ? 'text-right font-mono tabular-nums' : '')}>
                  {c.total ? c.total(rows) : i === 0 ? 'Total' : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export const sum = <R,>(rows: R[], pick: (r: R) => number) => rows.reduce((s, r) => s + (Number(pick(r)) || 0), 0);

/** Headline number tile. */
export function Kpi({ label, value, hint, tone = 'slate', onClick }: { label: string; value: string; hint?: string; tone?: 'slate' | 'green' | 'red' | 'blue' | 'amber'; onClick?: () => void }) {
  const tones = { slate: 'text-slate-900', green: 'text-emerald-700', red: 'text-rose-600', blue: 'text-sky-700', amber: 'text-amber-700' };
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={cx('text-left p-4 rounded-2xl border border-slate-200 bg-white shadow-sm transition', onClick && 'hover:border-emerald-400 hover:shadow')}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cx('mt-1 text-xl font-black font-mono tabular-nums', tones[tone])}>{value}</div>
      {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
    </button>
  );
}

export const VOUCHER_BADGE: Record<string, string> = {
  SALES: 'bg-emerald-100 text-emerald-800',
  PURCHASE: 'bg-sky-100 text-sky-800',
  RECEIPT: 'bg-teal-100 text-teal-800',
  PAYMENT: 'bg-rose-100 text-rose-800',
  CONTRA: 'bg-violet-100 text-violet-800',
  JOURNAL: 'bg-amber-100 text-amber-800',
  CREDIT_NOTE: 'bg-orange-100 text-orange-800',
  DEBIT_NOTE: 'bg-fuchsia-100 text-fuchsia-800',
};

export const VoucherBadge = ({ type, label }: { type: string; label: string }) => <span className={cx('px-2 py-0.5 rounded-md text-[10px] font-black uppercase whitespace-nowrap', VOUCHER_BADGE[type] || 'bg-slate-100 text-slate-700')}>{label}</span>;

export interface LedgerOption {
  id: string;
  name: string;
  groupName: string;
  partyId: string | null;
  closing: number;
}
