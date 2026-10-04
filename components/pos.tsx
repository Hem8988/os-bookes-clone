'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Delete, Minus, Plus, Volume2, VolumeX } from 'lucide-react';
import { cue, useSound } from '../lib/feedback';
import { cx } from './ui';

// POS kit: big tap targets for quick entry on phones and at the counter.
// Every tap gives a short sound + vibration (lib/feedback), switchable off.

const clampQty = (n: number, min: number, max?: number) => Math.max(min, max != null ? Math.min(max, n) : n);

/** − [n] + with big buttons; the number can still be typed. */
export function Stepper({ value, onChange, min = 0, max, size = 'md', invalid, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; size?: 'md' | 'lg'; invalid?: boolean; label?: string }) {
  const step = (d: number) => {
    const next = clampQty(value + d, min, max);
    if (next === value) return cue('error');
    cue(d > 0 ? 'tap' : 'remove');
    onChange(next);
  };
  const h = size === 'lg' ? 'h-12' : 'h-10';
  return (
    <div className="space-y-1">
      {label && <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>}
      <div className={cx('flex items-stretch rounded-xl border overflow-hidden bg-white', invalid ? 'border-rose-400' : 'border-slate-300')}>
        <button type="button" onClick={() => step(-1)} className={cx(h, 'w-11 shrink-0 flex items-center justify-center bg-slate-100 text-slate-700 active:bg-slate-200')} aria-label="Less">
          <Minus className="h-4 w-4" />
        </button>
        <input
          inputMode="numeric"
          value={value ? String(value) : ''}
          placeholder="0"
          onChange={(e) => onChange(clampQty(Number(e.target.value.replace(/\D/g, '')) || 0, min, max))}
          onFocus={(e) => e.target.select()}
          className={cx(h, 'w-full min-w-0 text-center font-black text-lg outline-none', invalid ? 'text-rose-600' : 'text-slate-900')}
        />
        <button type="button" onClick={() => step(1)} className={cx(h, 'w-11 shrink-0 flex items-center justify-center bg-emerald-600 text-white active:bg-emerald-700')} aria-label="More">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Product card: tap the card for +1, − / + appear once it is in the cart. */
export function ProductTile({ name, sub, qty, onChange, max, note }: { name: string; sub?: React.ReactNode; qty: number; onChange: (n: number) => void; max?: number; note?: React.ReactNode }) {
  const add = () => {
    if (max != null && qty >= max) return cue('error');
    cue('tap');
    onChange(qty + 1);
  };
  return (
    <div className={cx('relative rounded-2xl border-2 bg-white transition select-none', qty > 0 ? 'border-emerald-500 shadow-md shadow-emerald-100' : 'border-slate-200')}>
      <button type="button" onClick={add} className="w-full text-left p-3 pb-2 min-h-[84px] active:scale-[0.98] transition">
        <div className="pr-9 text-sm font-black text-slate-900 leading-tight">{name}</div>
        {sub && <div className="mt-1 text-[11px] font-semibold text-slate-500">{sub}</div>}
        {note && <div className="mt-1 text-[10px] font-bold">{note}</div>}
      </button>
      {qty > 0 && <span className="absolute top-2 right-2 min-w-8 h-8 px-2 rounded-full bg-emerald-600 text-white text-sm font-black flex items-center justify-center">{qty}</span>}
      {qty > 0 && (
        <div className="px-2 pb-2">
          <Stepper value={qty} onChange={onChange} max={max} />
        </div>
      )}
    </div>
  );
}

/** Full / empty counts for one product, with what the source holds. */
export function StockTile({ name, available, full, empty, onFull, onEmpty, showFull = true, showEmpty = true, labels = { full: 'Full', empty: 'Empty' } }: { name: string; available?: { full: number; empty: number } | null; full: number; empty: number; onFull: (n: number) => void; onEmpty: (n: number) => void; showFull?: boolean; showEmpty?: boolean; labels?: { full: string; empty: string } }) {
  const overFull = !!available && full > available.full;
  const overEmpty = !!available && empty > available.empty;
  return (
    <div className={cx('rounded-2xl border-2 bg-white p-3 space-y-2', overFull || overEmpty ? 'border-rose-400' : full || empty ? 'border-emerald-500' : 'border-slate-200')}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-black text-slate-900 leading-tight">{name}</div>
        {available && <span className={cx('shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold', available.full + available.empty > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')}>{available.full} {labels.full.toLowerCase()} · {available.empty} {labels.empty.toLowerCase()}</span>}
      </div>
      <div className={cx('grid gap-2', showFull && showEmpty ? 'grid-cols-2' : 'grid-cols-1')}>
        {showFull && <Stepper label={labels.full} value={full} onChange={onFull} invalid={overFull} />}
        {showEmpty && <Stepper label={labels.empty} value={empty} onChange={onEmpty} invalid={overEmpty} />}
      </div>
    </div>
  );
}

export interface Choice<T extends string> { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; tone?: 'emerald' | 'rose' | 'sky' | 'amber' | 'slate' }
const CHOICE_ON: Record<NonNullable<Choice<string>['tone']>, string> = {
  emerald: 'bg-emerald-600 border-emerald-600 text-white',
  rose: 'bg-rose-600 border-rose-600 text-white',
  sky: 'bg-sky-600 border-sky-600 text-white',
  amber: 'bg-amber-500 border-amber-500 text-white',
  slate: 'bg-slate-900 border-slate-900 text-white',
};

/** Big one-tap choices (payment mode, priority…). */
export function ChoiceTiles<T extends string>({ value, onChange, options, cols }: { value: T; onChange: (v: T) => void; options: Choice<T>[]; cols?: number }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const Icon = o.icon;
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              cue('tap');
              onChange(o.value);
            }}
            className={cx('min-h-[52px] rounded-xl border-2 px-2 py-2 text-xs font-black flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition', on ? CHOICE_ON[o.tone || 'emerald'] : 'bg-white border-slate-200 text-slate-700')}
          >
            {Icon && <Icon className="h-5 w-5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Amount entry: big ₹ display, quick amounts and a numpad. */
export function AmountPad({ value, onChange, quick = [], label }: { value: string; onChange: (v: string) => void; quick?: { label: string; value: number }[]; label?: string }) {
  const press = (k: string) => {
    cue(k === 'del' ? 'remove' : 'tap');
    if (k === 'del') return onChange(value.slice(0, -1));
    const next = (value === '0' ? '' : value) + k;
    if (next.replace(/\D/g, '').length > 9) return;
    onChange(next);
  };
  const shown = Number(value) || 0;
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 flex items-end justify-between">
        <span className="text-[10px] font-black uppercase opacity-70">{label}</span>
        <span className="text-3xl font-black font-mono">₹{shown.toLocaleString('en-IN')}</span>
      </div>
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                cue('tap');
                onChange(String(q.value));
              }}
              className={cx('px-3 py-2 rounded-xl border text-xs font-black active:scale-95', Number(value) === q.value ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-700')}
            >
              {q.label}
            </button>
          ))}
          <button type="button" onClick={() => { cue('remove'); onChange(''); }} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-rose-600 active:scale-95">C</button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)} className="h-12 rounded-xl bg-white border border-slate-200 text-lg font-black text-slate-900 flex items-center justify-center active:bg-slate-100 active:scale-95">
            {k === 'del' ? <Delete className="h-5 w-5" /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Footer of a POS sheet: running totals on the left, the main action on the right. */
export function PosTotal({ lines, action }: { lines: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="w-full flex items-center gap-3">
      <div className="flex-1 min-w-0 text-xs">{lines}</div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** Big main action button for PosTotal. */
export function PosButton({ busy, disabled, onClick, children, tone = 'emerald' }: { busy?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; tone?: 'emerald' | 'slate' }) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={cx('min-h-[52px] px-5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition disabled:opacity-40 disabled:shadow-none', tone === 'emerald' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-900 shadow-slate-300')}
    >
      {busy ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : null}
      {children}
    </button>
  );
}

/** Speaker icon that switches tap sounds on / off for this device. */
export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        setOn(!on);
        if (!on) window.setTimeout(() => cue('success'), 0);
      }}
      title={on ? 'Sound on — tap to mute' : 'Sound off — tap to turn on'}
      className={cx('p-2 rounded-full', className)}
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}

export interface RecentItem { id: string; label: string; sub?: string }

/** Recently used entries (customers…) remembered on this device, newest first. */
export function useRecent(key: string, limit = 8): [RecentItem[], (item: RecentItem) => void] {
  const storageKey = `deskshark.recent.${key}`;
  const [items, setItems] = useState<RecentItem[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from device storage after mount
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* storage blocked or corrupt — start empty */
    }
  }, [storageKey]);
  const push = useCallback(
    (item: RecentItem) =>
      setItems((cur) => {
        const next = [item, ...cur.filter((x) => x.id !== item.id)].slice(0, limit);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* storage full */
        }
        return next;
      }),
    [storageKey, limit]
  );
  return [items, push];
}

/** One-tap chips for recent customers above a search box. */
export function RecentChips({ items, onPick, title }: { items: RecentItem[]; onPick: (item: RecentItem) => void; title?: string }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      {title && <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</div>}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              cue('tap');
              onPick(r);
            }}
            className="shrink-0 max-w-[180px] text-left px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 active:bg-emerald-100"
          >
            <span className="block text-xs font-black text-emerald-900 truncate">{r.label}</span>
            {r.sub && <span className="block text-[10px] text-emerald-700 truncate">{r.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
