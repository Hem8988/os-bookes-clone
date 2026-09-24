'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useSession } from '../lib/auth';
import { Button, Card, Field, inputClass, Modal, StatusBadge, useToast } from './ui';

// Areas and delivery routes (drive default delivery-boy assignment).

interface RouteRow { id: string; code: string; name: string; defaultDeliveryBoyId: string | null; active: boolean; areas: { id: string; name: string }[] }
interface AreaRow { id: string; code: string; name: string; routeId: string | null; active: boolean; route: { name: string } | null }

export default function RoutesModule() {
  const { can } = useSession();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [boys, setBoys] = useState<{ id: string; name: string }[]>([]);
  const [routeForm, setRouteForm] = useState<Partial<RouteRow> | null>(null);
  const [areaForm, setAreaForm] = useState<Partial<AreaRow> | null>(null);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      const [r, a, b] = await Promise.all([api<RouteRow[]>('/api/routes'), api<AreaRow[]>('/api/areas'), api<{ id: string; name: string }[]>('/api/users/roles?role=DELIVERY_BOY')]);
      setRoutes(r);
      setAreas(a);
      setBoys(b);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (path: string, body: unknown) => {
    try {
      await api(path, { body });
      setRouteForm(null);
      setAreaForm(null);
      showToast('Saved.');
      await load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };
  const editable = can('masters.manage');

  return (
    <div className="space-y-4">
      {toast}
      <h2 className="text-lg font-black text-slate-900">Routes & Areas</h2>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Routes" actions={editable && <Button size="sm" onClick={() => setRouteForm({ active: true })}><Plus className="h-3.5 w-3.5" /> Route</Button>}>
          {routes.map((r) => (
            <div key={r.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
              <div>
                <strong>{r.name}</strong> <span className="font-mono text-slate-400">{r.code}</span>
                <div className="text-[10px] text-slate-500">
                  Default: {boys.find((b) => b.id === r.defaultDeliveryBoyId)?.name || '—'} · {r.areas.map((a) => a.name).join(', ') || 'no areas'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!r.active && <StatusBadge status="INACTIVE" />}
                {editable && <Button size="sm" tone="ghost" onClick={() => setRouteForm(r)}>Edit</Button>}
              </div>
            </div>
          ))}
        </Card>
        <Card title="Areas" actions={editable && <Button size="sm" onClick={() => setAreaForm({ active: true })}><Plus className="h-3.5 w-3.5" /> Area</Button>}>
          {areas.map((a) => (
            <div key={a.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
              <div>
                <strong>{a.name}</strong> <span className="font-mono text-slate-400">{a.code}</span>
                <div className="text-[10px] text-slate-500">Route: {a.route?.name || '—'}</div>
              </div>
              {editable && <Button size="sm" tone="ghost" onClick={() => setAreaForm(a)}>Edit</Button>}
            </div>
          ))}
        </Card>
      </div>

      <Modal open={!!routeForm} title={routeForm?.id ? 'Edit route' : 'New route'} onClose={() => setRouteForm(null)} footer={<Button onClick={() => save('/api/routes', routeForm)}>Save</Button>}>
        {routeForm && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Code"><input value={routeForm.code || ''} onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })} className={inputClass} /></Field>
              <Field label="Name"><input value={routeForm.name || ''} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} className={inputClass} /></Field>
            </div>
            <Field label="Default delivery boy">
              <select value={routeForm.defaultDeliveryBoyId || ''} onChange={(e) => setRouteForm({ ...routeForm, defaultDeliveryBoyId: e.target.value || null })} className={inputClass}>
                <option value="">—</option>
                {boys.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={routeForm.active !== false} onChange={(e) => setRouteForm({ ...routeForm, active: e.target.checked })} /> Active</label>
          </>
        )}
      </Modal>
      <Modal open={!!areaForm} title={areaForm?.id ? 'Edit area' : 'New area'} onClose={() => setAreaForm(null)} footer={<Button onClick={() => save('/api/areas', areaForm)}>Save</Button>}>
        {areaForm && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Code"><input value={areaForm.code || ''} onChange={(e) => setAreaForm({ ...areaForm, code: e.target.value })} className={inputClass} /></Field>
              <Field label="Name"><input value={areaForm.name || ''} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} className={inputClass} /></Field>
            </div>
            <Field label="Route">
              <select value={areaForm.routeId || ''} onChange={(e) => setAreaForm({ ...areaForm, routeId: e.target.value || null })} className={inputClass}>
                <option value="">—</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          </>
        )}
      </Modal>
    </div>
  );
}
