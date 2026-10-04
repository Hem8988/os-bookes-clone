'use client';

import React, { useMemo, useState } from 'react';
import { Boxes, ChevronRight, LayoutDashboard, LogOut, Menu, Receipt, Search, Truck, Users, Wallet, X } from 'lucide-react';
import type { Permission } from '../lib/permissions';
import { initials, useCompany } from '../lib/useCompany';
import { MENU } from './Sidebar';
import { SoundToggle } from './pos';
import { cx } from './ui';

// Phone navigation for the back office, like a mobile app: a bottom tab bar
// with the most used screens and a full-screen "More" menu with everything else.

interface Tab { tab: string; sub?: string; label: string; icon: React.ElementType; permission: Permission }

/** Bottom-bar candidates in order of preference; the first four the role can open are shown. */
const TABS: Tab[] = [
  { tab: 'dashboard', label: 'Home', icon: LayoutDashboard, permission: 'dashboard.view' },
  { tab: 'orders', label: 'Orders', icon: Truck, permission: 'orders.view' },
  { tab: 'customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { tab: 'inventory', sub: 'overview', label: 'Stock', icon: Boxes, permission: 'inventory.view' },
  { tab: 'payments', label: 'Payments', icon: Wallet, permission: 'ledger.view' },
  { tab: 'billing', label: 'Bill', icon: Receipt, permission: 'invoices.manage' },
];

export function MobileTabBar({ activeTab, can, onNavigate, onMore, moreOpen }: { activeTab: string; can: (p: Permission) => boolean; onNavigate: (tab: string, sub?: string) => void; onMore: () => void; moreOpen: boolean }) {
  const tabs = TABS.filter((t) => can(t.permission)).slice(0, 4);
  const inBar = tabs.some((t) => t.tab === activeTab);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = !moreOpen && t.tab === activeTab;
          return (
            <button key={t.tab} onClick={() => onNavigate(t.tab, t.sub)} className={cx('relative py-2 flex flex-col items-center gap-0.5 text-[10px] font-black', on ? 'text-emerald-700' : 'text-slate-400')}>
              {on && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-emerald-600" />}
              <Icon className="h-5 w-5" />
              {t.label}
            </button>
          );
        })}
        <button onClick={onMore} className={cx('relative py-2 flex flex-col items-center gap-0.5 text-[10px] font-black', moreOpen || !inBar ? 'text-emerald-700' : 'text-slate-400')}>
          {(moreOpen || !inBar) && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-emerald-600" />}
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  );
}

/** Full-screen menu with every screen the role can open, searchable. */
export function MobileMenu({ open, activeTab, activeSub, can, userName, roleLabel, onNavigate, onClose, onLogout }: { open: boolean; activeTab: string; activeSub?: string; can: (p: Permission) => boolean; userName: string; roleLabel: string; onNavigate: (tab: string, sub?: string) => void; onClose: () => void; onLogout: () => void }) {
  const company = useCompany();
  const [query, setQuery] = useState('');
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MENU.map((s) => ({ ...s, items: s.items.filter((i) => can(i.permission) && (!q || i.label.toLowerCase().includes(q) || s.label.toLowerCase().includes(q))) })).filter((s) => s.items.length);
  }, [can, query]);
  if (!open) return null;
  const go = (tab: string, sub?: string) => {
    setQuery('');
    onNavigate(tab, sub);
  };
  return (
    <div className="md:hidden fixed inset-0 z-[35] bg-slate-100 flex flex-col">
      <div className="bg-slate-900 text-white px-4 pt-[max(env(safe-area-inset-top),12px)] pb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-sm">{initials(company.name)}</div>
            <div className="min-w-0">
              <div className="text-sm font-black truncate">{company.name}</div>
              <div className="text-[11px] text-emerald-300 font-semibold truncate">{userName} · {roleLabel}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a screen…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold placeholder-slate-400 focus:outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
        {can('dashboard.view') && !query && (
          <button onClick={() => go('dashboard')} className={cx('w-full flex items-center gap-3 rounded-2xl p-3 text-left font-black text-sm', activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-900 border border-slate-200')}>
            <LayoutDashboard className="h-5 w-5" /> Dashboard
          </button>
        )}
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <Icon className="h-4 w-4" /> {s.label}
              </div>
              {s.items.map((i) => {
                const on = i.tab === activeTab && (!i.sub || i.sub === activeSub);
                return (
                  <button key={`${i.tab}:${i.sub || ''}`} onClick={() => go(i.tab, i.sub)} className={cx('w-full flex items-center justify-between px-4 py-3 text-left text-sm border-b border-slate-50 last:border-b-0 active:bg-slate-100', on ? 'text-emerald-700 font-black bg-emerald-50' : 'text-slate-800 font-semibold')}>
                    {i.label}
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                );
              })}
            </div>
          );
        })}
        {sections.length === 0 && <div className="py-10 text-center text-xs font-semibold text-slate-400">No screen matches “{query}”.</div>}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center justify-between rounded-2xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Tap sounds <SoundToggle className="bg-slate-100 text-slate-700" />
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-black text-rose-700">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
