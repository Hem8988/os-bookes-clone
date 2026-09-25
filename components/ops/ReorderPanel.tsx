'use client';

import React, { useState } from 'react';
import { Repeat } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, cx, inputClass, useToast } from '../ui';
import { BooksHeader, Column, Kpi, ReportTable, Tabs } from '../books/shared';

interface Row { customerId: string; customer: string; phone: string; area: string; mode: 'OFF' | 'SUGGEST' | 'REMIND' | 'ORDER'; learnt: boolean; orders: number; cycleDays: number; lastOrder: string | null; dueOn: string; daysLeft: number; openOrder: boolean; items: { productId: string; productName: string; qty: number }[]; lastActionOn: string | null; due: boolean }

const MODES: [Row['mode'], string][] = [['SUGGEST', 'Suggest only'], ['REMIND', 'WhatsApp reminder'], ['ORDER', 'Auto-create order'], ['OFF', 'Off']];

export default function ReorderPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [days, setDays] = useState<'3' | '7' | '30'>('7');
  const q = useApiData<Row[]>(`/api/ops/reorder?days=${days}`, onError);
  const rows = q.data ?? [];
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    try {
      await fn();
      showToast(msg);
      q.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<Row>[] = [
    { label: 'Customer', render: (r) => <div><div className="font-bold">{r.customer}</div><div className="text-[10px] text-slate-400">{r.phone}{r.area ? ` · ${r.area}` : ''}</div></div> },
    { label: 'Usual order', render: (r) => r.items.map((i) => `${i.qty} × ${i.productName}`).join(', ') },
    { label: 'Every', render: (r) => <span>{r.cycleDays} days{r.learnt && <span className="text-[10px] text-slate-400"> (from {r.orders} orders)</span>}</span> },
    { label: 'Last order', render: (r) => r.lastOrder || '—' },
    { label: 'Due', render: (r) => <div><Badge tone={r.openOrder ? 'blue' : r.daysLeft < 0 ? 'red' : r.daysLeft <= 1 ? 'amber' : 'slate'}>{r.openOrder ? 'Order open' : r.daysLeft < 0 ? `${-r.daysLeft} days late` : r.daysLeft === 0 ? 'Today' : `in ${r.daysLeft} days`}</Badge><div className="text-[10px] text-slate-400">{r.dueOn}{r.lastActionOn ? ` · acted ${r.lastActionOn}` : ''}</div></div> },
    {
      label: 'Automatic',
      render: (r) => (
        <select value={r.mode} disabled={busy === `m${r.customerId}`} onChange={(e) => run(`m${r.customerId}`, () => api('/api/ops/reorder', { method: 'PATCH', body: { customerId: r.customerId, mode: e.target.value } }), 'Saved.')} className={cx(inputClass, 'py-1 text-xs w-40')}>
          {MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      ),
    },
    { label: '', render: (r) => (!r.openOrder ? <Button size="sm" busy={busy === `o${r.customerId}`} onClick={() => run(`o${r.customerId}`, () => api('/api/ops/reorder', { body: { customerId: r.customerId } }), 'Order created.')}>Create order</Button> : null) },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={Repeat} title="Refill due (auto-reorder)" subtitle="Each customer’s usual refill cycle is learnt from their orders. Choose per customer: just suggest, send a WhatsApp reminder on the due day, or create the order automatically (it still goes through approval)." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Due now" value={String(rows.filter((r) => r.due).length)} tone="amber" />
        <Kpi label="Late" value={String(rows.filter((r) => r.daysLeft < 0 && !r.openOrder).length)} tone="red" />
        <Kpi label="Auto-order customers" value={String(rows.filter((r) => r.mode === 'ORDER').length)} tone="green" />
        <Kpi label="Cylinders due" value={String(rows.filter((r) => r.due).reduce((s, r) => s + r.items.reduce((x, i) => x + i.qty, 0), 0))} />
      </div>
      <Tabs value={days} onChange={setDays} items={[['3', 'Next 3 days'], ['7', 'Next 7 days'], ['30', 'Next 30 days']]} />
      <ReportTable rows={rows.filter((r) => r.daysLeft <= Number(days))} columns={columns} rowKey={(r) => r.customerId} dense empty="Nobody is due. Customers need at least 3 orders for their cycle to be learnt." />
    </div>
  );
}
