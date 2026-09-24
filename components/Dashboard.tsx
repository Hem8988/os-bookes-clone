'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, RefreshCw, Truck } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { APPROVAL_TYPES, ApprovalType } from '../lib/permissions';
import { useCompany } from '../lib/useCompany';
import { Button, Card, Empty, Stat, StatusBadge, useToast } from './ui';

interface DashboardData {
  date: string;
  dayStatus: string;
  orders: Record<string, number>;
  pendingApprovals: Record<string, number>;
  deliveries: { count: number; cylinders: number; empties: number; pendingVerification: number; sales: number };
  collections: { cash: number; online: number; cheque: number; credit: number; latePayments: number };
  outstanding: { total: number; customers: number };
  stock: { location: string; productName: string; full: number; empty: number }[];
  cash: { withDeliveryBoys: number; company: number };
  lowStock: { name: string; stock: number; minStockAlert: number }[];
}

export const Dashboard: React.FC<{ onNavigate?: (tab: string, subTab?: string) => void }> = ({ onNavigate }) => {
  const company = useCompany();
  const [data, setData] = useState<DashboardData | null>(null);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      setData(await api<DashboardData>('/api/dashboard'));
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 120_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (!data) return <Empty>Loading dashboard…</Empty>;
  const orderCount = (keys: string[]) => keys.reduce((s, k) => s + (data.orders[k] || 0), 0);
  const approvalTotal = Object.values(data.pendingApprovals).reduce((s, n) => s + n, 0);
  const products = [...new Set(data.stock.map((s) => s.productName))];

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">{company.name}</h2>
          <p className="text-xs text-slate-500">
            Today {data.date} · Books <StatusBadge status={data.dayStatus === 'OPEN' ? 'ACTIVE' : data.dayStatus} />
          </p>
        </div>
        <Button tone="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {data.lowStock.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold flex gap-2">
          <AlertTriangle className="h-4 w-4" /> Low godown stock: {data.lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Today's orders" value={orderCount(Object.keys(data.orders))} sub={`${orderCount(['PENDING_APPROVAL', 'WHATSAPP_RECEIVED'])} need approval · ${orderCount(['APPROVED'])} to assign`} />
        <Stat label="Delivered today" value={`${data.deliveries.cylinders} cyl.`} sub={`${data.deliveries.count} deliveries · ${data.deliveries.empties} empties back`} />
        <Stat label="Sales today" value={inr(data.deliveries.sales)} sub={`Cash ${inr(data.collections.cash)} · Online ${inr(data.collections.online)}`} />
        <Stat label="Total outstanding" value={inr(data.outstanding.total)} tone="text-rose-600" sub={`${data.outstanding.customers} customers`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={<span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-600" /> Waiting for you ({approvalTotal})</span>} actions={<Button size="sm" tone="ghost" onClick={() => onNavigate?.('approval-queue')}>Open queue</Button>}>
          {approvalTotal === 0 ? (
            <p className="text-xs text-slate-400">Nothing pending.</p>
          ) : (
            Object.entries(data.pendingApprovals).map(([type, n]) => (
              <div key={type} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
                <span>{APPROVAL_TYPES[type as ApprovalType]?.label || type}</span>
                <strong>{n}</strong>
              </div>
            ))
          )}
        </Card>
        <Card title={<span className="flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-600" /> Today&apos;s orders by status</span>} actions={<Button size="sm" tone="ghost" onClick={() => onNavigate?.('orders')}>Open orders</Button>}>
          {Object.keys(data.orders).length === 0 ? (
            <p className="text-xs text-slate-400">No orders for today.</p>
          ) : (
            Object.entries(data.orders).map(([status, n]) => (
              <div key={status} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                <StatusBadge status={status} />
                <strong>{n}</strong>
              </div>
            ))
          )}
        </Card>
        <Card title="Cash">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span>With delivery boys</span><strong>{inr(data.cash.withDeliveryBoys)}</strong></div>
            <div className="flex justify-between"><span>Company cash</span><strong>{inr(data.cash.company)}</strong></div>
            <div className="flex justify-between"><span>Cheques today</span><strong>{inr(data.collections.cheque)}</strong></div>
            <div className="flex justify-between"><span>Credit given today</span><strong>{inr(data.collections.credit)}</strong></div>
            <div className="flex justify-between"><span>Late payments verified</span><strong>{inr(data.collections.latePayments)}</strong></div>
          </div>
        </Card>
      </div>

      <Card title="Stock position" actions={<Button size="sm" tone="ghost" onClick={() => onNavigate?.('inventory')}>Inventory</Button>}>
        <table className="w-full text-xs">
          <thead className="text-slate-500 text-left">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2 text-right">Godown full / empty</th>
              <th className="p-2 text-right">With delivery boys full / empty</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const g = data.stock.find((s) => s.productName === p && s.location === 'WAREHOUSE');
              const b = data.stock.find((s) => s.productName === p && s.location === 'DELIVERY_BOY');
              return (
                <tr key={p} className="border-t border-slate-100">
                  <td className="p-2 font-bold">{p}</td>
                  <td className="p-2 text-right">{g?.full ?? 0} / {g?.empty ?? 0}</td>
                  <td className="p-2 text-right">{b?.full ?? 0} / {b?.empty ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
