'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Button, cx, inputClass } from '../ui';

export interface SupplierOption { id: string; name: string; shortName?: string | null; type: string; gstin?: string | null; status?: string }

/**
 * Supplier / plant dropdown with an inline "+ New supplier" form, so a missing
 * supplier can be added without leaving the bill, expense or return being entered.
 */
export function SupplierSelect({ value, onChange, placeholder = 'Choose supplier…', showGstin, onError }: { value: string; onChange: (id: string, supplier: SupplierOption | null) => void; placeholder?: string; showGstin?: boolean; onError?: (m: string) => void }) {
  const q = useApiData<SupplierOption[]>('/api/customers?type=Vendor', onError);
  const suppliers = (q.data ?? []).filter((p) => p.type === 'Vendor' && p.status !== 'INACTIVE');
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState({ name: '', phone: '', gstin: '', address: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const created = await api<SupplierOption>('/api/customers', { body: { type: 'Vendor', name: v.name.trim(), phone: v.phone.trim(), gstin: v.gstin.trim().toUpperCase() || null, address: v.address.trim(), city: v.city.trim() || null } });
      q.reload();
      onChange(created.id, { ...created, type: 'Vendor' });
      setAdding(false);
      setV({ name: '', phone: '', gstin: '', address: '', city: '' });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const f = (k: keyof typeof v, placeholder: string, extra = '') => <input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder={placeholder} className={cx(inputClass, 'py-1.5 text-xs', extra)} />;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__new') return setAdding(true);
            onChange(e.target.value, suppliers.find((s) => s.id === e.target.value) || null);
          }}
          className={inputClass}
        >
          <option value="">{suppliers.length || q.data === undefined ? placeholder : 'No supplier yet — add one →'}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{showGstin && s.gstin ? ` · ${s.gstin}` : ''}</option>
          ))}
          <option value="__new">+ New supplier…</option>
        </select>
        <button type="button" onClick={() => setAdding(!adding)} title="Add a new supplier" className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-emerald-700 hover:bg-emerald-100">
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
      {adding && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
          <div className="text-[11px] font-black text-emerald-900">New supplier / plant</div>
          <div className="grid gap-2">
            {f('name', 'Name *')}
            {f('phone', 'Mobile * (10 digits)')}
            {f('gstin', 'GSTIN (for input credit)')}
            {f('city', 'City')}
            {f('address', 'Address *')}
          </div>
          {error && <div className="text-[11px] font-semibold text-rose-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button size="sm" tone="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" busy={busy} disabled={!v.name.trim() || !v.phone.trim() || !v.address.trim()} onClick={save}>Add supplier</Button>
          </div>
        </div>
      )}
    </div>
  );
}
