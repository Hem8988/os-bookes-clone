'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ComboOption { value: string; hint?: string }

/**
 * Text box with its own suggestion list: opens on click showing every option,
 * filters as you type, and anything not in the list can simply be typed in.
 * (The browser's datalist hides everything that doesn't match what's already typed.)
 */
export function Combobox({ value, onChange, options, placeholder, className }: { value: string; onChange: (v: string) => void; options: ComboOption[]; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const q = typed ? value.trim().toLowerCase() : '';
  const shown = (q ? options.filter((o) => o.value.toLowerCase().includes(q) || (o.hint || '').toLowerCase().includes(q)) : options).slice(0, 200);
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setTyped(false);
  };
  return (
    <div ref={box} className="relative">
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => { setOpen(true); setTyped(false); setActive(0); }}
        onClick={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setTyped(true); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (!open || !shown.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(shown[active].value); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        className={`${className || ''} pr-8`}
      />
      <ChevronDown onMouseDown={(e) => { e.preventDefault(); setTyped(false); setOpen(!open); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 cursor-pointer text-slate-400" />
      {open && shown.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {shown.map((o, i) => (
            <button
              type="button"
              key={o.value}
              onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${i === active ? 'bg-teal-50 text-teal-900' : 'text-slate-800'} ${o.value === value ? 'font-bold' : ''}`}
            >
              <span className="truncate">{o.value}</span>
              {o.hint && <span className="shrink-0 text-[11px] text-slate-400">{o.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
