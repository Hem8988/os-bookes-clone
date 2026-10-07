'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, Cylinder, Delete, Minus, Plus, Search, Volume2, VolumeX, X } from 'lucide-react';
import { cue, useSound } from '../lib/feedback';
import { cx, Modal } from './ui';

// POS kit: quick, tap-friendly entry on phones and at the counter.
// Every tap gives a short sound + vibration (lib/feedback), switchable off.

const clampQty = (n: number, min: number, max?: number) => Math.max(min, max != null ? Math.min(max, n) : n);

/** Pill stepper: (−) n (+); the number can still be typed. */
export function Stepper({ value, onChange, min = 0, max, size = 'md', invalid, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; size?: 'sm' | 'md' | 'lg'; invalid?: boolean; label?: string }) {
  const step = (d: number) => {
    const next = clampQty(value + d, min, max);
    if (next === value) return cue('error');
    cue(d > 0 ? 'tap' : 'remove');
    onChange(next);
  };
  const btn = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  return (
    <div className="space-y-1">
      {label && <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>}
      <div className={cx('flex items-center gap-1 rounded-full p-1 transition', invalid ? 'bg-rose-50 ring-1 ring-rose-300' : value > 0 ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-100')}>
        <button type="button" onClick={() => step(-1)} disabled={value <= min} className={cx(btn, 'shrink-0 rounded-full bg-white text-slate-600 shadow-sm flex items-center justify-center active:scale-90 transition disabled:opacity-40')} aria-label="Less">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          inputMode="numeric"
          value={value ? String(value) : ''}
          placeholder="0"
          onChange={(e) => onChange(clampQty(Number(e.target.value.replace(/\D/g, '')) || 0, min, max))}
          onFocus={(e) => e.target.select()}
          className={cx('w-full min-w-0 bg-transparent text-center font-bold tabular-nums outline-none placeholder-slate-300', size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base', invalid ? 'text-rose-600' : 'text-slate-900')}
        />
        <button type="button" onClick={() => step(1)} className={cx(btn, 'shrink-0 rounded-full bg-emerald-600 text-white shadow-sm shadow-emerald-200 flex items-center justify-center active:scale-90 transition')} aria-label="More">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Product card: tap the card for +1, the stepper appears once it is in the cart. */
export function ProductTile({ name, sub, qty, onChange, max, note }: { name: string; sub?: React.ReactNode; qty: number; onChange: (n: number) => void; max?: number; note?: React.ReactNode }) {
  const add = () => {
    if (max != null && qty >= max) return cue('error');
    cue('tap');
    onChange(qty + 1);
  };
  return (
    <div className={cx('relative rounded-xl border bg-white transition select-none', qty > 0 ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-50/40' : 'border-slate-200 shadow-sm')}>
      <button type="button" onClick={add} className="w-full text-left p-3 pb-2 flex items-start gap-2.5 active:scale-[0.98] transition">
        <span className={cx('h-8 w-8 shrink-0 rounded-lg flex items-center justify-center', qty > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')}>
          <Cylinder className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 pr-6">
          <span className="block text-[13px] font-bold text-slate-900 leading-snug">{name}</span>
          {sub && <span className="block mt-0.5 text-[11px] font-medium text-slate-500">{sub}</span>}
          {note && <span className="block mt-0.5 text-[10px] font-bold">{note}</span>}
        </span>
      </button>
      {qty > 0 && <span className="absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">{qty}</span>}
      <div className="px-2.5 pb-2.5">
        {qty > 0 ? <Stepper value={qty} onChange={onChange} max={max} /> : <button type="button" onClick={add} className="w-full h-8 rounded-full border border-dashed border-slate-300 text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1 active:bg-slate-50"><Plus className="h-3 w-3" /> Add</button>}
      </div>
    </div>
  );
}

/** Full / empty counts for one product, with what the source holds. */
export function StockTile({ name, available, full, empty, onFull, onEmpty, showFull = true, showEmpty = true, labels = { full: 'Full', empty: 'Empty' }, onRemove }: { name: string; available?: { full: number; empty: number } | null; full: number; empty: number; onFull: (n: number) => void; onEmpty: (n: number) => void; showFull?: boolean; showEmpty?: boolean; labels?: { full: string; empty: string }; onRemove?: () => void }) {
  const overFull = !!available && full > available.full;
  const overEmpty = !!available && empty > available.empty;
  const active = full > 0 || empty > 0;
  return (
    <div className={cx('rounded-xl border bg-white p-3 space-y-2.5 transition', overFull || overEmpty ? 'border-rose-300 ring-1 ring-rose-300' : active ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-50/30' : 'border-slate-200 shadow-sm')}>
      <div className="flex items-center gap-2.5">
        <span className={cx('h-8 w-8 shrink-0 rounded-lg flex items-center justify-center', active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')}>
          <Cylinder className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-slate-900 leading-snug truncate">{name}</div>
          {available && <div className={cx('text-[10px] font-semibold', available.full + available.empty > 0 ? 'text-emerald-700' : 'text-slate-400')}>{available.full} {labels.full.toLowerCase()} · {available.empty} {labels.empty.toLowerCase()} available</div>}
        </div>
        {onRemove && (
          <button type="button" onClick={() => { cue('remove'); onRemove(); }} className="h-7 w-7 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600" aria-label="Remove">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className={cx('grid gap-3', showFull && showEmpty ? 'grid-cols-2' : 'grid-cols-1')}>
        {showFull && <Stepper label={labels.full} value={full} onChange={onFull} invalid={overFull} />}
        {showEmpty && <Stepper label={labels.empty} value={empty} onChange={onEmpty} invalid={overEmpty} />}
      </div>
    </div>
  );
}

export interface Choice<T extends string> { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; tone?: 'emerald' | 'rose' | 'sky' | 'amber' | 'slate' }
const CHOICE_ON: Record<NonNullable<Choice<string>['tone']>, string> = {
  emerald: 'bg-emerald-50 border-emerald-500 ring-emerald-500 text-emerald-800',
  rose: 'bg-rose-50 border-rose-500 ring-rose-500 text-rose-800',
  sky: 'bg-sky-50 border-sky-500 ring-sky-500 text-sky-800',
  amber: 'bg-amber-50 border-amber-500 ring-amber-500 text-amber-800',
  slate: 'bg-slate-50 border-slate-800 ring-slate-800 text-slate-900',
};
const CHECK_ON: Record<NonNullable<Choice<string>['tone']>, string> = { emerald: 'bg-emerald-600', rose: 'bg-rose-600', sky: 'bg-sky-600', amber: 'bg-amber-500', slate: 'bg-slate-800' };

/** One-tap choices (payment mode, priority, godown…). */
export function ChoiceTiles<T extends string>({ value, onChange, options, cols, compact }: { value: T; onChange: (v: T) => void; options: Choice<T>[]; cols?: number; compact?: boolean }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const Icon = o.icon;
        const on = o.value === value;
        const tone = o.tone || 'emerald';
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              cue('tap');
              onChange(o.value);
            }}
            className={cx('relative rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition', compact ? 'min-h-[36px] px-2 py-1.5' : 'min-h-[44px] px-2.5 py-2', Icon && !compact && 'flex-col gap-1', on ? cx('ring-1 font-bold', CHOICE_ON[tone]) : 'bg-white border-slate-200 text-slate-600 shadow-sm')}
          >
            {on && (
              <span className={cx('absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full text-white flex items-center justify-center', CHECK_ON[tone])}>
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
            {Icon && <Icon className="h-4 w-4" />}
            <span className="truncate max-w-full">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Amount entry: ₹ display, quick amounts and a numpad (`compact`: small, numpad behind "Other amount"). */
export function AmountPad({ value, onChange, quick = [], label, compact, otherLabel = "Other amount" }: { value: string; onChange: (v: string) => void; quick?: { label: string; value: number }[]; label?: string; compact?: boolean; otherLabel?: string }) {
  // No quick amounts (e.g. advance with nothing due) → no "Other amount" chip, so start with the pad open.
  const [padOpen, setPadOpen] = useState(!compact || quick.length === 0);
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
      <div className={cx('rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-between', compact ? 'px-3 py-2' : 'px-4 py-3')}>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={cx('font-bold tabular-nums', compact ? 'text-lg' : 'text-2xl')}>₹{shown.toLocaleString('en-IN')}</span>
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
              className={cx('px-3 py-1.5 rounded-full border text-[11px] font-semibold active:scale-95 transition', Number(value) === q.value ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700 shadow-sm')}
            >
              {q.label}
            </button>
          ))}
          {compact ? (
            <button type="button" onClick={() => { cue('tap'); if (!padOpen) onChange(''); setPadOpen(!padOpen); }} className={cx('px-3 py-1.5 rounded-full border text-[11px] font-semibold shadow-sm active:scale-95', padOpen ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700')}>{otherLabel}</button>
          ) : (
            <button type="button" onClick={() => { cue('remove'); onChange(''); }} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-rose-600 shadow-sm active:scale-95">Clear</button>
          )}
        </div>
      )}
      {padOpen && (
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)} className={cx(compact ? 'h-10' : 'h-11', 'rounded-lg bg-white text-lg font-semibold text-slate-800 shadow-sm flex items-center justify-center active:bg-slate-50 active:scale-95 transition')}>
            {k === 'del' ? <Delete className="h-5 w-5 text-slate-500" /> : k}
          </button>
        ))}
      </div>
      )}
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

/** Main action button for PosTotal. */
export function PosButton({ busy, disabled, onClick, children, tone = 'emerald' }: { busy?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; tone?: 'emerald' | 'slate' }) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={cx(
        'h-11 px-5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
        tone === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-300'
      )}
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
            className="shrink-0 max-w-[180px] text-left px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm active:bg-emerald-50"
          >
            <span className="block text-xs font-bold text-slate-900 truncate">{r.label}</span>
            {r.sub && <span className="block text-[10px] text-slate-500 truncate">{r.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface PickItem { id: string; label: string; sub?: string; icon?: React.ComponentType<{ className?: string }> }

/**
 * Search box with a short list of matches; tapping one picks it. Scales to
 * hundreds of entries: only `limit` rows are drawn (the first ones when empty).
 */
export function SearchPick({ items, onPick, placeholder = 'Search…', limit = 6, autoFocus }: { items: PickItem[]; onPick: (id: string) => void; placeholder?: string; limit?: number; autoFocus?: boolean }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (q ? items.filter((i) => i.label.toLowerCase().includes(q) || (i.sub || '').toLowerCase().includes(q)) : items).slice(0, limit);
  const more = (q ? items.filter((i) => i.label.toLowerCase().includes(q) || (i.sub || '').toLowerCase().includes(q)).length : items.length) - matches.length;
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input autoFocus={autoFocus} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
      {matches.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {matches.map((i) => {
            const Icon = i.icon || Cylinder;
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => {
                  cue('tap');
                  setQuery('');
                  onPick(i.id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left active:bg-emerald-50 hover:bg-slate-50"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-slate-900 truncate">{i.label}</span>
                  {i.sub && <span className="block text-[10px] text-slate-500 truncate">{i.sub}</span>}
                </span>
                <Plus className="h-4 w-4 shrink-0 text-emerald-600" />
              </button>
            );
          })}
        </div>
      )}
      {more > 0 && <div className="text-center text-[10px] text-slate-400">+{more} more — type to search</div>}
      {q && matches.length === 0 && <div className="text-center text-[11px] text-slate-400 py-2">No match for “{query}”.</div>}
    </div>
  );
}

/**
 * Choose one entry: tiles when there are only a few, otherwise a field that
 * opens a searchable list (for 100s of godowns, customers…).
 */
export function PickerField({ value, onChange, options, title = 'Select', placeholder = 'Select…', tiles = 4 }: { value: string; onChange: (id: string) => void; options: PickItem[]; title?: string; placeholder?: string; tiles?: number }) {
  const [open, setOpen] = useState(false);
  if (options.length <= tiles) return <ChoiceTiles value={value} onChange={onChange} cols={Math.min(options.length, 2) || 1} options={options.map((o) => ({ value: o.id, label: o.label, icon: o.icon }))} />;
  const current = options.find((o) => o.id === value);
  const Icon = current?.icon;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full h-11 flex items-center gap-2.5 px-3 rounded-xl border border-slate-200 bg-white shadow-sm text-left">
        {Icon && <Icon className="h-4 w-4 text-emerald-600" />}
        <span className={cx('flex-1 truncate text-sm', current ? 'font-semibold text-slate-900' : 'text-slate-400')}>{current?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <SearchPick
          autoFocus
          limit={30}
          items={options}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
