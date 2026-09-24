'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- each report returns a different JSON shape */

import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useSession } from '../lib/auth';
import { Button, Card, Empty, Stat, cx, inputClass, today, useToast } from './ui';

// Reports (SRS Phase 8), each scoped server-side to the user's role.

const REPORTS: { key: string; label: string; roles: string[] }[] = [
  { key: 'sales', label: 'Sales', roles: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { key: 'collection', label: 'Collection', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
  { key: 'outstanding', label: 'Outstanding & ageing', roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'MANAGER'] },
  { key: 'inventory', label: 'Inventory', roles: ['SUPER_ADMIN', 'MANAGER'] },
  { key: 'cylinder-balance', label: 'Cylinder balance', roles: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { key: 'delivery-performance', label: 'Delivery performance', roles: ['SUPER_ADMIN', 'MANAGER'] },
  { key: 'accountant', label: 'Accounts closing', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
];

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object');
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsModule({ initialReport = 'sales' }: { initialReport?: string }) {
  const { session } = useSession();
  const [report, setReport] = useState(initialReport);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(today());
  const [data, setData] = useState<any>(null);
  const [toast, showToast] = useToast();
  const allowed = REPORTS.filter((r) => session && r.roles.includes(session.user.role));

  useEffect(() => setReport(initialReport), [initialReport]);

  const load = useCallback(async () => {
    setData(null);
    try {
      setData(await api(`/api/reports?type=${report}&from=${from}&to=${to}`));
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [report, from, to, showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const rows: Record<string, unknown>[] =
    report === 'sales' ? data?.byDay || [] : report === 'collection' ? data?.payments || [] : report === 'outstanding' ? data?.rows || [] : report === 'inventory' ? data?.balances || [] : report === 'cylinder-balance' ? data || [] : report === 'delivery-performance' ? data?.rows || [] : data?.closings || [];

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Reports</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={cx(inputClass, 'w-40')} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cx(inputClass, 'w-40')} />
          <Button tone="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
          <Button tone="secondary" onClick={() => downloadCsv(report, Array.isArray(rows) ? rows.map((r) => ({ ...r, ...((r as { customer?: object }).customer || {}) })) : [])}><Download className="h-4 w-4" /> CSV</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {allowed.map((r) => (
          <button key={r.key} onClick={() => setReport(r.key)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', report === r.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {r.label}
          </button>
        ))}
      </div>
      {!data ? <Empty>Loading…</Empty> : <ReportBody report={report} data={data} />}
    </div>
  );
}

const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="text-slate-500 text-left">
        <tr>{head.map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={head.length} className="p-6 text-center text-slate-400">No data.</td></tr>}
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-slate-100">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);

function ReportBody({ report, data }: { report: string; data: any }) {
  switch (report) {
    case 'sales':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><Stat label="Total sales" value={inr(data.total)} /><Stat label="Invoices" value={data.count} /></div>
          <Card title="By product"><Table head={['Product', 'Qty', 'Amount']} rows={data.byProduct.map((p: any) => [p.productName, p.qty, inr(p.amount)])} /></Card>
          <Card title="By day"><Table head={['Date', 'Invoices', 'Amount', 'GST']} rows={data.byDay.map((d: any) => [d.date, d.invoices, inr(d.amount), inr(d.tax)])} /></Card>
        </div>
      );
    case 'collection':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="Total collected" value={inr(data.total)} />
            {Object.entries(data.byMode as Record<string, number>).map(([m, v]) => <Stat key={m} label={m} value={inr(v)} />)}
            <Stat label="Credit given" value={inr(data.creditGiven)} tone="text-rose-600" />
          </div>
          <Card title="Receipts"><Table head={['Receipt', 'Date', 'Customer', 'Mode', 'Amount', 'Source']} rows={data.payments.map((p: any) => [p.paymentNumber, p.paymentDate, p.customerName, p.mode, inr(p.amount), p.source])} /></Card>
        </div>
      );
    case 'outstanding':
      return (
        <div className="space-y-4">
          <Stat label={`Total outstanding as of ${data.asOf}`} value={inr(data.total)} tone="text-rose-600" />
          <Card>
            <Table
              head={['Customer', 'Outstanding', 'Not due', '1-30 days', '31-60', '60+', 'Last payment']}
              rows={data.rows.map((r: any) => [
                <span key="n"><strong>{r.name}</strong>{r.overLimit && <span className="text-rose-600 font-bold"> · over limit</span>}<div className="text-[10px] text-slate-400">{r.customerCode} · {r.phone}</div></span>,
                <strong key="o">{inr(r.outstanding)}</strong>,
                inr(r.current),
                inr(r.d30),
                inr(r.d60),
                inr(r.d90),
                r.lastPayment || '—',
              ])}
            />
          </Card>
        </div>
      );
    case 'inventory':
      return (
        <div className="space-y-4">
          <Card title="Current stock"><Table head={['Location', 'Product', 'Full', 'Empty', 'Defective']} rows={data.balances.map((b: any) => [`${b.locationName} (${b.locationType === 'WAREHOUSE' ? 'godown' : 'delivery boy'})`, b.productName, b.fullQty, b.emptyQty, b.defectiveQty])} /></Card>
          <Card title="Movements in period"><Table head={['Type', 'Product', 'Full', 'Empty']} rows={data.movements.map((m: any) => [m.type.replace(/_/g, ' '), m.productName, m.full, m.empty])} /></Card>
        </div>
      );
    case 'cylinder-balance':
      return <Card><Table head={['Customer', 'Area', 'Product', 'Holding']} rows={data.map((r: any) => [r.customer.name, r.customer.area || '—', r.productName, <strong key="h">{r.currentBalance}</strong>])} /></Card>;
    case 'delivery-performance':
      return (
        <Card>
          <Table head={['Delivery boy', 'Deliveries', 'Cylinders', 'Empties', 'Variances', 'Corrections', 'Cash', 'Avg verify (h)']} rows={data.rows.map((r: any) => [r.name, r.deliveries, r.cylinders, r.empties, r.variances, r.corrections, inr(r.cash), r.avgVerifyHours ?? '—'])} />
        </Card>
      );
    default:
      return (
        <div className="space-y-4">
          <Card title="Day closings"><Table head={['Date', 'Status', 'Locked by', 'Re-opened by']} rows={data.closings.map((c: any) => [c.date, c.status, c.lockedBy, c.reopenedBy ? `${c.reopenedBy}: ${c.reopenReason}` : '—'])} /></Card>
          <Card title="Verification work"><Table head={['Queue', 'Status', 'Count']} rows={data.verifications.map((v: any) => [v.type.replace(/_/g, ' '), v.status, v._count])} /></Card>
        </div>
      );
  }
}
