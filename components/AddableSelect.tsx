'use client';

import React, { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

/**
 * Dropdown with a "+ Add new…" choice: picking it shows a small name box, and
 * `onAdd` saves the new entry (it returns the value to select, or throws).
 */
export function AddableSelect({ value, onChange, options, onAdd, addLabel = 'Add new', className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; onAdd: (name: string) => Promise<string>; addLabel?: string; className?: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      onChange(await onAdd(name.trim()));
      setAdding(false);
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };
  if (adding) {
    return (
      <div>
        <div className="flex gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                e.preventDefault();
                void save();
              }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder={`${addLabel} name`}
            className={className}
          />
          <button type="button" disabled={!name.trim() || busy} onClick={save} title="Save" className="shrink-0 rounded-xl bg-teal-600 px-3 text-white disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => { setAdding(false); setError(''); }} title="Cancel" className="shrink-0 rounded-xl border border-slate-300 px-3 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
      </div>
    );
  }
  return (
    <select value={value} onChange={(e) => (e.target.value === '__add' ? setAdding(true) : onChange(e.target.value))} className={className}>
      <option value="">—</option>
      {value && !options.some((o) => o.value === value) && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      <option value="__add">+ {addLabel}…</option>
    </select>
  );
}
