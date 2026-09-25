'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Gauge, RefreshCw } from 'lucide-react';
import { useApiData } from '../../lib/useApiData';
import { Button, Empty, cx, today, useToast } from '../ui';
import { money } from '../books/shared';

interface Summary {
  date: string;
  figures: { bills: number; sales: number; received: number; credit: number; newOrders: number; delivered: number; pending: number; expenses: number; approvals: number; overdueCustomers: number };
  alerts: string[];
  detail: { byProduct: { product: string; qty: number }[]; byMode: { mode: string; amount: number }[]; wallets: { name: string; balance: number }[]; stock: { product: string; full: number; empty: number }[]; topDues: { name: string; balance: number }[]; returns: number; emptiesOverdue: number };
}

const shift = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const short = (s: string) => s.replace(/ LPG Cylinder| Cylinder/g, '');

/** Phone-first owner view: today's money, deliveries, cash with staff, stock and what needs attention. */
export default function OwnerDashboard() {
  const [toast, showToast] = useToast();
  const [date, setDate] = useState(today());
  const q = useApiData<Summary>(`/api/books/owner-report?date=${date}`, (m) => showToast(m, 'error'));
  const s = q.data;
  const f = s?.figures;
  const tile = (label: string, value: string, tone = 'text-slate-900', sub?: string) => (
    <div className="rounded-2xl bg-white border border-slate-200 p-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cx('text-lg font-black leading-tight mt-0.5', tone)}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
  const list = (title: string, rows: [string, string][], empty = 'None') => (
    <div className="rounded-2xl bg-white border border-slate-200 p-3">
      <div className="text-[11px] font-black text-slate-700 mb-1">{title}</div>
      {rows.length ? rows.map(([a, b]) => <div key={a} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0"><span className="truncate pr-2">{a}</span><span className="font-mono font-bold">{b}</span></div>) : <div className="text-xs text-slate-400">{empty}</div>}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-3">
      {toast}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><Gauge className="h-5 w-5 text-emerald-600" /> Owner dashboard</h2>
        <div className="flex items-center gap-1">
          <Button size="sm" tone="ghost" onClick={() => setDate(shift(date, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs font-bold w-24 text-center">{date === today() ? 'Today' : date}</span>
          <Button size="sm" tone="ghost" disabled={date >= today()} onClick={() => setDate(shift(date, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" tone="ghost" onClick={() => q.reload()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      {!s || !f ? (
        <Empty>Loading…</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {tile('Sales', money(f.sales), 'text-slate-900', `${f.bills} bills · ${s.detail.byProduct.map((p) => `${short(p.product)} ${p.qty}`).join(' · ') || '—'}`)}
            {tile('Received', money(f.received), 'text-emerald-600', s.detail.byMode.map((m) => `${m.mode} ${money(m.amount)}`).join(' · ') || '—')}
            {tile('Credit given', money(f.credit), f.credit > 0 ? 'text-rose-600' : 'text-slate-900')}
            {tile('Expenses', money(f.expenses))}
            {tile('Deliveries', `${f.delivered} done`, 'text-slate-900', `${f.pending} pending · ${f.newOrders} new orders`)}
            {tile('Approvals waiting', String(f.approvals), f.approvals ? 'text-amber-600' : 'text-slate-900')}
          </div>
          {s.alerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-1">
              <div className="text-[11px] font-black text-amber-900 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Needs attention</div>
              {s.alerts.map((a) => <div key={a} className="text-xs text-amber-900">• {a}</div>)}
            </div>
          )}
          {list('Cash with staff', s.detail.wallets.map((w) => [w.name, money(w.balance)]), 'Nil')}
          {list('Godown stock (full / empty)', s.detail.stock.map((x) => [short(x.product), `${x.full} / ${x.empty}`]))}
          {list('Top dues', s.detail.topDues.map((c) => [c.name, money(c.balance)]))}
          {s.detail.emptiesOverdue > 0 && <div className="text-xs text-slate-600 px-1">🛢️ {s.detail.emptiesOverdue} empty cylinders overdue with {f.overdueCustomers} customers.</div>}
          <p className="text-[10px] text-slate-400 px-1">Add this page to your phone’s home screen for one-tap access. The same summary can come on WhatsApp every evening (Settings → Owner daily report).</p>
        </>
      )}
    </div>
  );
}
