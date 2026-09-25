'use client';

import React, { useState } from 'react';
import { Crosshair, Map, Navigation } from 'lucide-react';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Empty, inputClass, today, useToast } from '../ui';
import { BooksHeader, Column, Kpi, ReportTable } from '../books/shared';

interface Stop { seq: number; orderId: string; orderNumber: string; customer: string; phone: string; address: string; area: string; priority: string; cylinders: number; items: string; deliveryBoy: string; lat: number; lng: number; legKm: number; cumulativeKm: number }
interface Plan { date: string; stops: Stop[]; unlocated: { orderId: string; orderNumber: string; customer: string; phone: string; address: string; area: string; cylinders: number; deliveryBoy: string }[]; totalKm: number; savedKm: number; mapLinks: string[]; deliveryBoys: { id: string; name: string }[] }

export default function RoutePanel() {
  const [toast, showToast] = useToast();
  const [date, setDate] = useState(today());
  const [boy, setBoy] = useState('');
  const [start, setStart] = useState('');
  const q = useApiData<Plan>(`/api/ops/route-plan?date=${date}${boy ? `&deliveryBoyId=${boy}` : ''}${start ? `&start=${start}` : ''}`, (m) => showToast(m, 'error'));
  const d = q.data;

  const here = () => {
    if (!navigator.geolocation) return showToast('Location is not available on this device.', 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => setStart(`${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`),
      () => showToast('Allow location access to start from here.', 'error'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const columns: Column<Stop>[] = [
    { label: '#', render: (s) => <span className="font-black">{s.seq}</span> },
    { label: 'Customer', render: (s) => <div><div className="font-bold">{s.customer} {s.priority === 'URGENT' && <Badge tone="red">urgent</Badge>}</div><div className="text-[10px] text-slate-400">{s.orderNumber} · {s.phone}</div></div> },
    { label: 'Address', render: (s) => <div className="max-w-xs"><div className="truncate">{s.address}</div><div className="text-[10px] text-slate-400">{s.area}</div></div> },
    { label: 'Load', render: (s) => s.items },
    { label: 'Boy', render: (s) => s.deliveryBoy || '—' },
    { label: 'Km', align: 'right', render: (s) => <div>{s.legKm}<div className="text-[10px] text-slate-400">{s.cumulativeKm} total</div></div> },
    { label: '', render: (s) => <a className="text-emerald-700 font-bold text-xs" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">Navigate</a> },
  ];

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={Map} title="Route plan" subtitle="Open orders in the shortest driving order, using each customer’s location from past deliveries. Open it in Google Maps for turn-by-turn directions." />
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block w-40 text-xs font-bold text-slate-600">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-1`} /></label>
          <label className="block w-48 text-xs font-bold text-slate-600">Delivery boy
            <select value={boy} onChange={(e) => setBoy(e.target.value)} className={`${inputClass} mt-1`}>
              <option value="">All open orders</option>
              {(d?.deliveryBoys ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="block w-52 text-xs font-bold text-slate-600">Start from (lat,lng)<input value={start} onChange={(e) => setStart(e.target.value)} placeholder="Godown location" className={`${inputClass} mt-1`} /></label>
          <Button tone="secondary" onClick={here}><Crosshair className="h-4 w-4" /> My location</Button>
        </div>
      </Card>
      {!d ? (
        <Empty>Loading…</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Stops" value={String(d.stops.length)} />
            <Kpi label="Route length" value={`${d.totalKm} km`} tone="blue" />
            <Kpi label="Saved vs. order list" value={`${d.savedKm} km`} tone="green" />
            <Kpi label="No location yet" value={String(d.unlocated.length)} tone={d.unlocated.length ? 'amber' : 'slate'} />
          </div>
          {d.mapLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {d.mapLinks.map((l, i) => (
                <a key={l} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500">
                  <Navigation className="h-4 w-4" /> Open in Google Maps{d.mapLinks.length > 1 ? ` (part ${i + 1})` : ''}
                </a>
              ))}
            </div>
          )}
          <ReportTable rows={d.stops} columns={columns} rowKey={(s) => s.orderId} dense empty="No open orders with a known location." />
          {d.unlocated.length > 0 && (
            <Card title="Not on the map yet">
              <p className="text-[11px] text-slate-500 mb-2">These customers have no GPS point yet — it is saved automatically on their first delivery from the delivery app.</p>
              {d.unlocated.map((u) => <div key={u.orderId} className="text-xs py-1 border-b border-slate-50"><strong>{u.customer}</strong> · {u.orderNumber} · {u.address} {u.area && <span className="text-slate-400">({u.area})</span>}</div>)}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
