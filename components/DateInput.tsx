'use client';

import React, { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../lib/i18n';
import { cx, today } from './ui';

// Touch-friendly date picker (YYYY-MM-DD in, YYYY-MM-DD out). The calendar
// opens in the page flow under the field so it never gets clipped by a modal.

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
};
const plusDays = (s: string, n: number) => {
  const { y, m, d } = parse(s);
  const dt = new Date(Date.UTC(y, m, d + n));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
};

export const DateInput: React.FC<{ value: string; onChange: (value: string) => void; min?: string; max?: string }> = ({ value, onChange, min, max }) => {
  const { t, locale } = useT();
  const now = today();
  const tomorrow = plusDays(now, 1);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const { y, m } = parse(value || now);
    return { y, m };
  });

  const allowed = (s: string) => (!min || s >= min) && (!max || s <= max);
  const choose = (s: string) => {
    if (!allowed(s)) return;
    onChange(s);
    setOpen(false);
  };
  const shift = (delta: number) => setView(({ y, m }) => ({ y: m + delta < 0 ? y - 1 : m + delta > 11 ? y + 1 : y, m: (m + delta + 12) % 12 }));

  const label = value
    ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
    : t('Select…');
  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(view.y, view.m, 1)));
  // Week starts on Monday; 2024-01-01 was a Monday.
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i))));
  const lead = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => iso(view.y, view.m, i + 1))];
  const prevDisabled = !!min && iso(view.y, view.m, 1) <= min;
  const nextDisabled = !!max && iso(view.y, view.m, days) >= max;

  const quick = [
    { value: now, text: t('Today') },
    { value: tomorrow, text: t('Tomorrow') },
  ].filter((q) => allowed(q.value));

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!open) setView(parse(value || now));
          setOpen(!open);
        }}
        className={cx(
          'w-full rounded-xl border bg-white px-3 py-2 text-sm text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500',
          open ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-300'
        )}
      >
        <CalendarDays className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className={cx('flex-1 truncate font-semibold', value ? 'text-slate-900' : 'text-slate-400')}>{label}</span>
        <ChevronDown className={cx('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          {quick.length > 0 && (
            <div className="flex gap-2 mb-3">
              {quick.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => choose(q.value)}
                  className={cx('flex-1 py-1.5 rounded-full text-xs font-black border', value === q.value ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 text-slate-700 hover:border-emerald-500')}
                >
                  {q.text}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <button type="button" disabled={prevDisabled} onClick={() => shift(-1)} className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-25" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-black text-slate-900">{monthTitle}</div>
            <button type="button" disabled={nextDisabled} onClick={() => shift(1)} className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-25" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((w, i) => (
              <div key={i} className={cx('text-[10px] font-black uppercase py-1', i === 6 ? 'text-rose-400' : 'text-slate-400')}>
                {w}
              </div>
            ))}
            {cells.map((s, i) =>
              s ? (
                <button
                  key={s}
                  type="button"
                  disabled={!allowed(s)}
                  onClick={() => choose(s)}
                  className={cx(
                    'h-9 rounded-xl text-sm font-bold transition-colors',
                    s === value
                      ? 'bg-emerald-600 text-white shadow'
                      : s === now
                        ? 'text-emerald-700 ring-1 ring-emerald-500 hover:bg-emerald-50'
                        : 'text-slate-800 hover:bg-slate-100',
                    'disabled:text-slate-300 disabled:ring-0 disabled:hover:bg-transparent disabled:cursor-not-allowed'
                  )}
                >
                  {parse(s).d}
                </button>
              ) : (
                <div key={`e${i}`} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
