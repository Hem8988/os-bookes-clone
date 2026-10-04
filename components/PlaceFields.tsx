'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { GST_STATES } from '../lib/gst';
import { useApiData } from '../lib/useApiData';
import { Combobox } from './Combobox';

export interface PinInfo { pincode: string; stateCode: string | null; state: string | null; city: string | null; district: string | null; areas: string[] }

const base = 'w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400';

/** City box: type to search the list (cities already in your data first); a city not in the list is simply typed in and kept. */
export function CityInput({ value, onChange, placeholder = 'Type or search city…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const q = useApiData<{ used: string[]; all: string[] }>('/api/places');
  const used = q.data?.used ?? [];
  // Cities already in your data first, then the rest.
  const options = [...used.map((c) => ({ value: c, hint: 'used before' })), ...(q.data?.all ?? []).filter((c) => !used.includes(c)).map((c) => ({ value: c }))];
  return <Combobox value={value} onChange={onChange} options={options} placeholder={placeholder} className={className || base} />;
}

/** PIN code box: a full 6-digit PIN looks up its state and city and hands them back. */
export function PinInput({ value, onChange, onFound, className }: { value: string; onChange: (v: string) => void; onFound: (info: PinInfo) => void; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  useEffect(() => {
    const pin = value.trim();
    if (!/^[1-9]\d{5}$/.test(pin)) return;
    let live = true;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const info = await api<PinInfo>(`/api/places?pin=${pin}`);
        if (!live) return;
        onFound(info);
        setHint([info.city, info.state].filter(Boolean).join(', ') || 'PIN not found — fill city and state yourself');
      } catch {
        if (live) setHint('');
      } finally {
        if (live) setBusy(false);
      }
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // onFound is a fresh closure every render; only a new PIN should trigger a lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div>
      <div className="relative">
        <input inputMode="numeric" maxLength={6} value={value} onChange={(e) => { onChange(e.target.value.replace(/\D/g, '').slice(0, 6)); setHint(''); }} placeholder="6-digit PIN — fills city & state" className={className || base} />
        {busy && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
      </div>
      {hint && <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-teal-700"><MapPin className="h-3 w-3" /> {hint}</div>}
    </div>
  );
}

/** All GST states, by name. */
export function StateSelect({ value, onChange, className }: { value: string; onChange: (name: string, code: string) => void; className?: string }) {
  const entries = Object.entries(GST_STATES).sort((a, b) => a[1].localeCompare(b[1]));
  const known = entries.some(([, n]) => n === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value, entries.find(([, n]) => n === e.target.value)?.[0] || '')} className={className || base}>
      <option value="">Select state…</option>
      {!known && value && <option value={value}>{value}</option>}
      {entries.map(([code, name]) => <option key={code} value={name}>{name} ({code})</option>)}
    </select>
  );
}

/** GST state code for a state name ('' if unknown). */
export const stateCodeOf = (name: string) => Object.entries(GST_STATES).find(([, n]) => n.toLowerCase() === name.trim().toLowerCase())?.[0] || '';
