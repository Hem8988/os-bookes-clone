'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { amountInWords } from '../lib/gst';

// Small shared building blocks for the operations screens.

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

export const Card: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, actions, children, className }) => (
  <section className={cx('bg-white border border-slate-200 rounded-2xl shadow-sm', className)}>
    {(title || actions) && (
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <div className="flex items-center gap-2">{actions}</div>
      </header>
    )}
    <div className="p-4">{children}</div>
  </section>
);

type ButtonTone = 'primary' | 'secondary' | 'danger' | 'ghost' | 'plain';
const TONES: Record<ButtonTone, string> = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  ghost: 'text-slate-600 hover:bg-slate-100',
  // No colours of its own — the caller's className decides (e.g. on coloured cards).
  plain: '',
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; busy?: boolean; size?: 'sm' | 'md' }> = ({
  tone = 'primary',
  busy,
  size = 'md',
  className,
  children,
  disabled,
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || busy}
    className={cx(
      'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
      size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs',
      TONES[tone],
      className
    )}
  >
    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
    {children}
  </button>
);

/** "Rs. Twelve Thousand Nine Hundred Fifty only" under an amount box (nothing for empty / zero). */
export const AmountWords: React.FC<{ value: unknown; className?: string }> = ({ value, className }) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n) || n === 0) return null;
  return <span className={cx('block text-[11px] font-semibold leading-snug text-emerald-700', className)}>{n < 0 ? 'Minus ' : ''}{amountInWords(n)}</span>;
};

// Labels of money boxes: ₹ or a sure money word always; a looser word (rate, value…) only when
// the label is not about a percentage, a quantity or a count.
const SURE_MONEY = /₹|\b(amount|price|limit|balance|deposit|salary|paid|total|charges?|wages?|fee|fees|bonus|advance|collected|mrp)\b/i;
const MAYBE_MONEY = /\b(cash|value|basic|due|fine|rent|opening|expense|income|cost|rate)\b/i;
const NOT_MONEY = /%|\b(qty|quantity|gst|tax|interest|days?|cylinders?|count|no\.?|number|percent|hsn|kg|litres?)\b/i;
const isMoneyLabel = (label: string) => SURE_MONEY.test(label) || (MAYBE_MONEY.test(label) && !NOT_MONEY.test(label));

/** Number box inside a Field, if that is all it holds. */
function numberChildValue(children: React.ReactNode): { found: boolean; value: unknown } {
  const kids = React.Children.toArray(children);
  if (kids.length !== 1 || !React.isValidElement(kids[0])) return { found: false, value: null };
  const el = kids[0] as React.ReactElement<{ type?: string; value?: unknown }>;
  return el.type === 'input' && el.props.type === 'number' ? { found: true, value: el.props.value } : { found: false, value: null };
}

/** Words for a labelled number box when the label is about money — for form wrappers other than Field. */
export const MoneyWords: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const num = numberChildValue(children);
  return num.found && isMoneyLabel(label) ? <AmountWords value={num.value} /> : null;
};

/** Labelled form field. A money box (₹ / amount / price … in the label) also shows the amount in words under it. */
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string; words?: boolean }> = ({ label, hint, children, className, words }) => {
  const num = numberChildValue(children);
  const showWords = words ?? (num.found && isMoneyLabel(label));
  return (
    <label className={cx('block space-y-1', className)}>
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{label}</span>
      {children}
      {showWords && <AmountWords value={num.value} />}
      {hint && <span className="block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
};

export const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';

/** Big modals (`wide` / `full`: tables, ledgers, long forms) open full screen; small dialogs (confirm, note, short form) stay a compact box. */
export const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; full?: boolean }> = ({ open, title, onClose, children, footer, wide, full }) => {
  if (!open) return null;
  const big = wide || full;
  return (
    <div className={cx('fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-center', big ? 'items-stretch p-0' : 'items-end sm:items-center p-0 sm:p-4')} onClick={onClose}>
      <div className={cx('bg-white w-full shadow-2xl flex flex-col', big ? 'h-full' : 'rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <h3 className="min-w-0 truncate font-black text-slate-900 text-sm" title={title}>{title}</h3>
          <button onClick={onClose} aria-label="Close" className="shrink-0 p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 p-5 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:pb-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

const BADGE_TONES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-rose-100 text-rose-800',
  blue: 'bg-sky-100 text-sky-800',
  slate: 'bg-slate-100 text-slate-700',
  violet: 'bg-violet-100 text-violet-800',
};

export const Badge: React.FC<{ tone?: keyof typeof BADGE_TONES; children: React.ReactNode }> = ({ tone = 'slate', children }) => (
  <span className={cx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide', BADGE_TONES[tone])}>{children}</span>
);

const STATUS_TONE: Record<string, keyof typeof BADGE_TONES> = {
  PENDING_APPROVAL: 'amber',
  RECEIVED: 'amber',
  OPEN: 'blue',
  PARTIAL: 'violet',
  FULFILLED: 'green',
  EXPIRED: 'red',
  WHATSAPP_RECEIVED: 'amber',
  APPROVED: 'blue',
  ASSIGNED: 'blue',
  ACCEPTED: 'blue',
  OUT_FOR_DELIVERY: 'violet',
  DELIVERED: 'violet',
  PENDING_VERIFICATION: 'amber',
  SENT_BACK: 'red',
  VERIFIED: 'green',
  INVOICED: 'green',
  LEDGER_POSTED: 'green',
  COMPLETED: 'green',
  REJECTED: 'red',
  CANCELLED: 'slate',
  PENDING: 'amber',
  LOCKED: 'slate',
  STARTED: 'blue',
  CLOSED: 'slate',
  ACTIVE: 'green',
  INACTIVE: 'slate',
  BLOCKED: 'red',
  REVOKED: 'red',
  Paid: 'green',
  Partial: 'amber',
  Unpaid: 'red',
  Cancelled: 'slate',
};

export const StatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => <Badge tone={STATUS_TONE[status] || 'slate'}>{label ?? status.replace(/_/g, ' ')}</Badge>;

/** Name staff know the party by: shop / short name, falling back to the legal name. */
export const partyLabel = (short: string | null | undefined, legal: string) => short?.trim() || legal;

/** Short name in bold with the legal name underneath when they differ. */
export const PartyName: React.FC<{ short?: string | null; legal: string; className?: string }> = ({ short, legal, className }) => {
  const main = partyLabel(short, legal);
  return (
    <span className={cx('min-w-0', className)}>
      <span className="block font-bold truncate">{main}</span>
      {main !== legal && <span className="block text-[10px] font-normal text-slate-400 truncate">{legal}</span>}
    </span>
  );
};

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="py-10 text-center text-xs text-slate-400 font-semibold">{children}</div>;

export const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string; sub?: React.ReactNode }> = ({ label, value, tone = 'text-slate-900', sub }) => (
  <div className="p-3 rounded-xl border border-slate-200 bg-white">
    <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">{label}</div>
    <div className={cx('text-lg font-black', tone)}>{value}</div>
    {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
  </div>
);

/** Lightweight toast: const [toast, show] = useToast(); … {toast} */
export function useToast(): [React.ReactNode, (message: string, tone?: 'ok' | 'error') => void] {
  const [state, setState] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);
  useEffect(() => {
    if (!state) return;
    const t = window.setTimeout(() => setState(null), 4000);
    return () => window.clearTimeout(t);
  }, [state]);
  const node = state ? (
    <div className={cx('fixed bottom-20 md:bottom-4 right-4 left-4 sm:left-auto z-[60] max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-bold', state.tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')}>
      {state.message}
    </div>
  ) : null;
  // Stable identity so screens can safely list it in hook dependencies.
  const show = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => setState({ message, tone }), []);
  return [node, show];
}

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export const dateTime = (value: string | Date | null | undefined) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const shortWhen = (value: string | Date) => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });

/** "Created by … / Updated by …" cell for list tables; the update line shows only after a real change. */
export const WhoStamp: React.FC<{ createdBy?: string | null; createdAt?: string | Date | null; updatedBy?: string | null; updatedAt?: string | Date | null }> = ({ createdBy, createdAt, updatedBy, updatedAt }) => {
  const edited = !!updatedBy && !!updatedAt && (!createdAt || new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000);
  return (
    <div className="space-y-0.5 text-[11px] leading-tight whitespace-nowrap">
      <div title={createdAt ? `Created ${dateTime(createdAt)}` : undefined}>
        <span className="text-slate-400">Created</span> <b className="text-slate-700">{createdBy || '—'}</b>
        {createdAt && <div className="text-[10px] text-slate-400">{shortWhen(createdAt)}</div>}
      </div>
      {edited && (
        <div title={`Updated ${dateTime(updatedAt)}`}>
          <span className="text-slate-400">Updated</span> <b className="text-indigo-700">{updatedBy}</b>
          <div className="text-[10px] text-slate-400">{shortWhen(updatedAt!)}</div>
        </div>
      )}
    </div>
  );
};

// ───────────── Pagination ─────────────

const PAGE_SIZES = [25, 50, 100, 0] as const; // 0 = all rows (e.g. before printing)

/**
 * Pages a list for a table: `<Paged rows={list}>{(rows, offset) => <table>…{rows.map(…)}</table>}</Paged>`.
 * Goes back to page 1 when the list changes size (new search / filter); the pager hides for short lists.
 */
export function Paged<T>({ rows, size: initialSize = 25, children }: { rows: T[]; size?: number; children: (rows: T[], offset: number) => React.ReactNode }) {
  const [size, setSize] = useState<number>(initialSize);
  const [page, setPage] = useState(1);
  const [seenTotal, setSeenTotal] = useState(rows.length);
  const total = rows.length;
  if (seenTotal !== total) {
    setSeenTotal(total);
    setPage(1);
  }
  const pages = size ? Math.max(1, Math.ceil(total / size)) : 1;
  const current = Math.min(page, pages);
  const offset = size ? (current - 1) * size : 0;
  const slice = size ? rows.slice(offset, offset + size) : rows;
  return (
    <>
      {children(slice, offset)}
      {total > PAGE_SIZES[0] && <Pager total={total} page={current} pages={pages} size={size} offset={offset} shown={slice.length} onPage={setPage} onSize={(n) => { setSize(n); setPage(1); }} />}
    </>
  );
}

/** "26–50 of 340 · rows [25] · ‹ 1 2 3 … 14 ›" */
export function Pager({ total, page, pages, size, offset, shown, onPage, onSize }: { total: number; page: number; pages: number; size: number; offset: number; shown: number; onPage: (p: number) => void; onSize: (n: number) => void }) {
  // Page numbers around the current one, with the first and last always there.
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const btn = 'min-w-8 h-8 px-2 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-t border-slate-100 text-xs text-slate-600">
      <div className="flex items-center gap-3">
        <span>
          <b className="text-slate-900">{total ? offset + 1 : 0}–{offset + shown}</b> of <b className="text-slate-900">{total.toLocaleString('en-IN')}</b>
        </span>
        <label className="flex items-center gap-1.5">
          Rows
          <select value={size} onChange={(e) => onSize(Number(e.target.value))} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n || 'All'}</option>)}
          </select>
        </label>
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4 mx-auto" /></button>
          {nums.map((n, i) =>
            n === '…' ? (
              <span key={`gap${i}`} className="px-1 text-slate-400">…</span>
            ) : (
              <button key={n} type="button" onClick={() => onPage(n)} className={cx(btn, n === page && 'bg-slate-900! text-white! border-slate-900!')} aria-current={n === page ? 'page' : undefined}>{n}</button>
            )
          )}
          <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4 mx-auto" /></button>
        </div>
      )}
    </div>
  );
}
