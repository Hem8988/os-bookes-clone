'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutDashboard, Search, Star, X } from 'lucide-react';
import type { Permission } from '../lib/permissions';
import { menuKey } from '../lib/useMenuUsage';
import { MENU } from './Sidebar';
import { cx } from './ui';

/** Every page in one big panel: sections side by side, a search box, and ☆ to pin a page to the sidebar. */
export function MegaMenu({ open, can, activeTab, activeSub, pinned, onTogglePin, onNavigate, onClose }: { open: boolean; can: (p: Permission) => boolean; activeTab: string; activeSub?: string; pinned: string[]; onTogglePin: (key: string) => void; onNavigate: (tab: string, sub?: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => input.current?.focus(), 30);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);
  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    return MENU.map((s) => ({ ...s, items: s.items.filter((i) => can(i.permission) && (!term || i.label.toLowerCase().includes(term) || s.label.toLowerCase().includes(term))) })).filter((s) => s.items.length);
  }, [q, can]);
  if (!open) return null;
  const go = (tab: string, sub?: string) => {
    onNavigate(tab, sub);
    setQ('');
    onClose();
  };
  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-slate-900/40 p-2 pt-16 md:pt-20" onMouseDown={onClose}>
      <div className="w-full max-w-6xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a page… (e.g. payroll, GST, stock)" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {can('dashboard.view') && (
            <button onClick={() => go('dashboard')} className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Close (Esc)"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key}>
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Icon className="h-4 w-4 text-emerald-600" /> {s.label}</div>
                <div className="space-y-0.5">
                  {s.items.map((i) => {
                    const key = menuKey(i.tab, i.sub);
                    const isPinned = pinned.includes(key);
                    const active = i.tab === activeTab && (!i.sub || i.sub === activeSub);
                    return (
                      <div key={key} className={cx('group flex items-center rounded-lg', active ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100')}>
                        <button onClick={() => go(i.tab, i.sub)} className={cx('flex-1 px-2 py-1.5 text-left text-xs font-semibold', active ? 'text-white' : 'text-slate-700')}>{i.label}</button>
                        <button onClick={() => onTogglePin(key)} title={isPinned ? 'Remove from sidebar' : 'Pin to sidebar'} className={cx('p-1.5', isPinned ? 'text-amber-400' : 'text-slate-300 opacity-0 group-hover:opacity-100', active && !isPinned && 'text-white/60')}>
                          <Star className={cx('h-3.5 w-3.5', isPinned && 'fill-current')} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!sections.length && <div className="col-span-full py-8 text-center text-sm text-slate-400">No page matches “{q}”.</div>}
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">☆ Pin a page to keep it in the sidebar. The sidebar also shows the pages you open most.</div>
      </div>
    </div>
  );
}
