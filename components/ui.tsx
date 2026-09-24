'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

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

type ButtonTone = 'primary' | 'secondary' | 'danger' | 'ghost';
const TONES: Record<ButtonTone, string> = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  ghost: 'text-slate-600 hover:bg-slate-100',
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

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({ label, hint, children, className }) => (
  <label className={cx('block space-y-1', className)}>
    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{label}</span>
    {children}
    {hint && <span className="block text-[10px] text-slate-400">{hint}</span>}
  </label>
);

export const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';

export const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ open, title, onClose, children, footer, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className={cx('bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-sm">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
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

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => <Badge tone={STATUS_TONE[status] || 'slate'}>{status.replace(/_/g, ' ')}</Badge>;

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
    <div className={cx('fixed bottom-4 right-4 left-4 sm:left-auto z-[60] max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-bold', state.tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')}>
      {state.message}
    </div>
  ) : null;
  return [node, (message, tone = 'ok') => setState({ message, tone })];
}

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export const dateTime = (value: string | Date | null | undefined) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
