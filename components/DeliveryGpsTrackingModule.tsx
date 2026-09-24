'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { inr } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Badge, Button, Card, Empty, PartyName, StatusBadge, cx, dateTime, inputClass, today, useToast } from './ui';

// Delivery operations board: who is on duty, their last known location and
// every delivery of the selected day with its verification status.

interface Location { id: string; deliveryBoyId: string; deliveryBoyName: string; latitude: number; longitude: number; accuracy: number | null; recordedAt: string }
interface Day { id: string; deliveryBoyId: string; deliveryBoyName: string; status: string; startedAt: string; closedAt: string | null; openingCash: number; closingCash: number | null }
interface DeliveryRow { id: string; deliveryNumber: string; customerName: string; customerShortName: string | null; deliveryBoyName: string; deliveredQtyTotal: number; emptyReceivedTotal: number; paymentMode: string; paymentAmount: number; invoiceAmount: number; hasVariance: boolean; status: string; submittedAt: string; latitude: number | null; longitude: number | null }

export default function DeliveryGpsTrackingModule() {
  const [date, setDate] = useState(today());
  const [toast, showToast] = useToast();
  const locationsQ = useApiData<Location[]>('/api/delivery/gps', (m) => showToast(m, 'error'));
  const daysQ = useApiData<Day[]>(`/api/delivery/day-log?date=${date}`, (m) => showToast(m, 'error'));
  const deliveriesQ = useApiData<DeliveryRow[]>(`/api/cylinder/deliveries?date=${date}`, (m) => showToast(m, 'error'));
  const locations = locationsQ.data ?? [];
  const days = daysQ.data ?? [];
  const deliveries = deliveriesQ.data ?? [];
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const load = () => {
    locationsQ.reload();
    daysQ.reload();
    deliveriesQ.reload();
    setLoadedAt(Date.now());
  };
  const reloadAll = useRef(load);
  useEffect(() => {
    reloadAll.current = load;
  });
  useEffect(() => {
    const t = window.setInterval(() => reloadAll.current(), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // "Live" = location reported within 15 minutes of the last refresh.
  const fresh = (at: string) => loadedAt - new Date(at).getTime() < 15 * 60_000;

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Delivery Board</h2>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cx(inputClass, 'w-44')} />
          <Button tone="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Delivery boys on duty">
          {days.length === 0 ? (
            <Empty>Nobody has started a day.</Empty>
          ) : (
            days.map((d) => {
              const loc = locations.find((l) => l.deliveryBoyId === d.deliveryBoyId);
              return (
                <div key={d.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                  <div>
                    <strong>{d.deliveryBoyName}</strong>
                    <div className="text-[10px] text-slate-500">Started {dateTime(d.startedAt)}{d.closedAt ? ` · closed ${dateTime(d.closedAt)}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {loc && (
                      <a href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer" className={cx('flex items-center gap-1 font-bold', fresh(loc.recordedAt) ? 'text-emerald-700' : 'text-slate-400')}>
                        <MapPin className="h-3.5 w-3.5" /> {fresh(loc.recordedAt) ? 'Live' : dateTime(loc.recordedAt)}
                      </a>
                    )}
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              );
            })
          )}
        </Card>
        <Card title="Summary">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Deliveries: <strong>{deliveries.length}</strong></div>
            <div>Cylinders: <strong>{deliveries.reduce((s, d) => s + d.deliveredQtyTotal, 0)}</strong></div>
            <div>Empties: <strong>{deliveries.reduce((s, d) => s + d.emptyReceivedTotal, 0)}</strong></div>
            <div>Sales: <strong>{inr(deliveries.reduce((s, d) => s + d.invoiceAmount, 0))}</strong></div>
            <div>Waiting verification: <strong>{deliveries.filter((d) => d.status === 'PENDING_VERIFICATION').length}</strong></div>
            <div>With variance: <strong>{deliveries.filter((d) => d.hasVariance).length}</strong></div>
          </div>
        </Card>
      </div>
      <Card title="Deliveries">
        {deliveries.length === 0 ? (
          <Empty>No deliveries on this date.</Empty>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-2">Delivery</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Delivery boy</th>
                <th className="p-2 text-right">Full / Empty</th>
                <th className="p-2">Payment</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono font-bold">{d.deliveryNumber}<div className="text-[10px] text-slate-400">{dateTime(d.submittedAt)}</div></td>
                  <td className="p-2"><PartyName short={d.customerShortName} legal={d.customerName} /></td>
                  <td className="p-2">{d.deliveryBoyName}</td>
                  <td className="p-2 text-right">{d.deliveredQtyTotal} / {d.emptyReceivedTotal}</td>
                  <td className="p-2">{d.paymentMode} {inr(d.paymentAmount)}</td>
                  <td className="p-2 space-x-1"><StatusBadge status={d.status} />{d.hasVariance && <Badge tone="amber">Variance</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
