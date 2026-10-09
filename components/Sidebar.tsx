'use client';

import React from 'react';
import {
  BarChart3,
  BookOpenCheck,
  Boxes,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Star,
  MessageSquare,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  Database,
} from 'lucide-react';
import type { Permission } from '../lib/permissions';
import { initials, useCompany } from '../lib/useCompany';
import { menuKey, type MenuUsage } from '../lib/useMenuUsage';

export interface MenuItem {
  tab: string;
  sub?: string;
  label: string;
  permission: Permission;
}

interface MenuSection {
  key: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
}

// Single source of truth for navigation. Each entry is shown only when the
// logged-in role has the permission the API will enforce for that screen.
export const MENU: MenuSection[] = [
  {
    key: 'ops',
    label: 'Operations',
    icon: Truck,
    items: [
      { tab: 'orders', label: 'Orders', permission: 'orders.view' },
      { tab: 'approval-queue', label: 'Approval queue', permission: 'approvals.view' },
      { tab: 'delivery-board', label: 'Delivery board & tracking', permission: 'tracking.view' },
      { tab: 'registers', sub: 'owner', label: 'Owner dashboard (mobile)', permission: 'books.view' },
      { tab: 'registers', sub: 'reorder', label: 'Refill due (auto-reorder)', permission: 'ops.view' },
      { tab: 'registers', sub: 'route', label: 'Route plan', permission: 'ops.view' },
      { tab: 'registers', sub: 'complaints', label: 'Complaints', permission: 'ops.view' },
      { tab: 'registers', sub: 'cylinders', label: 'Cylinder register & testing', permission: 'ops.view' },
    ],
  },
  {
    key: 'stock',
    label: 'Inventory',
    icon: Boxes,
    items: [
      { tab: 'inventory', sub: 'overview', label: 'Stock (godown / boys)', permission: 'inventory.view' },
      { tab: 'inventory', sub: 'transfers', label: 'Stock transfers', permission: 'inventory.view' },
      { tab: 'inventory', sub: 'movements', label: 'Stock movements', permission: 'inventory.view' },
      { tab: 'inventory', sub: 'inward', label: 'Inward register (truck-wise)', permission: 'inventory.view' },
      { tab: 'cylinders', sub: 'customer', label: 'Customer cylinders', permission: 'customers.view' },
      { tab: 'cylinders', sub: 'voucher', label: 'SV / TV vouchers', permission: 'customers.view' },
    ],
  },
  {
    key: 'parties',
    label: 'Customers',
    icon: Users,
    items: [
      { tab: 'customers', label: 'Customers', permission: 'customers.view' },
      { tab: 'vendors', label: 'Plants / suppliers', permission: 'customers.view' },
      { tab: 'routes', label: 'Routes & areas', permission: 'masters.view' },
    ],
  },
  {
    key: 'accounts',
    label: 'Accounts',
    icon: Wallet,
    items: [
      { tab: 'payments', label: 'Payments', permission: 'ledger.view' },
      { tab: 'cash', label: 'Cash wallets', permission: 'wallet.viewAll' },
      { tab: 'day-closing', label: 'Day closing', permission: 'dayclose.perform' },
      { tab: 'billing', label: 'New invoice', permission: 'invoices.manage' },
      { tab: 'documents', sub: 'sales', label: 'Invoices', permission: 'invoices.view' },
    ],
  },
  {
    key: 'books',
    label: 'Books (Tally)',
    icon: BookOpenCheck,
    items: [
      { tab: 'books', sub: 'overview', label: 'Books dashboard', permission: 'books.view' },
      { tab: 'books', sub: 'vouchers', label: 'Day book & vouchers', permission: 'books.view' },
      { tab: 'books', sub: 'purchases', label: 'Purchase bills', permission: 'books.view' },
      { tab: 'books', sub: 'expenses', label: 'Expenses', permission: 'books.view' },
      { tab: 'books', sub: 'returns', label: 'Returns (credit / debit notes)', permission: 'books.view' },
      { tab: 'books', sub: 'ledgers', label: 'Ledgers', permission: 'books.view' },
      { tab: 'books', sub: 'cash-bank', label: 'Cash & bank book', permission: 'books.view' },
      { tab: 'books', sub: 'bank-rec', label: 'Bank reconciliation', permission: 'books.view' },
      { tab: 'books', sub: 'cheques', label: 'Cheque register (PDC / bounce)', permission: 'books.view' },
      { tab: 'books', sub: 'payroll', label: 'Salary & payroll', permission: 'books.view' },
      { tab: 'books', sub: 'gst', label: 'GSTR-1 & GSTR-3B', permission: 'books.view' },
      { tab: 'books', sub: 'gstr2b', label: 'GSTR-2B match', permission: 'books.view' },
      { tab: 'books', sub: 'einvoice', label: 'E-invoice & e-way bill', permission: 'books.view' },
      { tab: 'books', sub: 'tds', label: 'TDS', permission: 'books.view' },
      { tab: 'books', sub: 'final', label: 'P&L · Balance sheet', permission: 'books.view' },
      { tab: 'books', sub: 'reports', label: 'All reports', permission: 'books.view' },
      { tab: 'books', sub: 'ca-pack', label: 'CA pack (monthly)', permission: 'books.view' },
    ],
  },
  {
    key: 'docs',
    label: 'Purchases & documents',
    icon: FileText,
    items: [
      { tab: 'documents', sub: 'po', label: 'Plant refill orders', permission: 'masters.view' },
      { tab: 'documents', sub: 'challan', label: 'Delivery challans', permission: 'masters.view' },
      { tab: 'documents', sub: 'quotation', label: 'Quotations', permission: 'masters.view' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: BarChart3,
    items: [
      { tab: 'reports', sub: 'sales', label: 'Sales', permission: 'reports.view' },
      { tab: 'reports', sub: 'collection', label: 'Collection', permission: 'reports.view' },
      { tab: 'reports', sub: 'outstanding', label: 'Outstanding', permission: 'reports.view' },
      { tab: 'reports', sub: 'delivery-performance', label: 'Delivery performance', permission: 'reports.view' },
    ],
  },
  {
    key: 'masters',
    label: 'Masters',
    icon: Database,
    items: [
      { tab: 'masters', sub: 'product', label: 'Products', permission: 'masters.view' },
      { tab: 'masters', sub: 'category', label: 'Categories', permission: 'masters.view' },
      { tab: 'masters', sub: 'unit', label: 'Units', permission: 'masters.view' },
      { tab: 'masters', sub: 'bank', label: 'Banks', permission: 'masters.view' },
      { tab: 'masters', sub: 'payment', label: 'Payment modes', permission: 'masters.view' },
      { tab: 'masters', sub: 'employee', label: 'Employees', permission: 'masters.view' },
      { tab: 'masters', sub: 'expense', label: 'Expense heads', permission: 'masters.view' },
      { tab: 'masters', sub: 'company', label: 'Branches', permission: 'masters.view' },
      // Trucks / tempos (fuel, service, documents) and the delivery boy who drives each.
      { tab: 'registers', sub: 'vehicles', label: 'Vehicles / trucks', permission: 'ops.view' },
    ],
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
    items: [
      { tab: 'whatsapp', sub: 'chats', label: 'Chats', permission: 'whatsapp.chat' },
      { tab: 'whatsapp', label: 'Bot, templates & log', permission: 'whatsapp.manage' },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    items: [
      { tab: 'admin', sub: 'users', label: 'Users & roles', permission: 'users.manage' },
      { tab: 'admin', sub: 'devices', label: 'Devices', permission: 'devices.approve' },
      { tab: 'admin', sub: 'audit', label: 'Audit log', permission: 'audit.view' },
      { tab: 'settings', label: 'Settings', permission: 'settings.manage' },
    ],
  },
];

interface SidebarProps {
  activeTab: string;
  activeSub?: string;
  can: (permission: Permission) => boolean;
  onNavigate: (tab: string, sub?: string) => void;
  /** Visit counts and pinned pages (see useMenuUsage). */
  usage: MenuUsage;
  onTogglePin: (key: string) => void;
  onOpenMenu: () => void;
}

const MAX_FREQUENT = 8;

/**
 * Only the everyday pages: pinned ones, then the ones this person opens most
 * (a starter set until there is a history). Everything else is in the top Menu.
 */
export const Sidebar: React.FC<SidebarProps> = ({ activeTab, activeSub, can, onNavigate, usage, onTogglePin, onOpenMenu }) => {
  const company = useCompany();
  const all = MENU.flatMap((sec) => sec.items.filter((i) => can(i.permission)).map((i) => ({ ...i, key: menuKey(i.tab, i.sub), section: sec.label })));
  const byKey = new Map(all.map((i) => [i.key, i]));
  const pinned = usage.pinned.map((k) => byKey.get(k)).filter((i): i is (typeof all)[number] => !!i);
  const used = Object.entries(usage.counts)
    .filter(([k]) => byKey.has(k) && !usage.pinned.includes(k))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => byKey.get(k)!);
  // Starter set: the first two pages of every section this role can open.
  const starter = MENU.flatMap((sec) => sec.items.filter((i) => can(i.permission)).slice(0, 2)).map((i) => byKey.get(menuKey(i.tab, i.sub))!).filter((i) => !usage.pinned.includes(i.key));
  const frequent = (used.length >= 3 ? used : [...used, ...starter.filter((i) => !used.includes(i))]).slice(0, MAX_FREQUENT);
  const isActive = (i: MenuItem) => i.tab === activeTab && (!i.sub || i.sub === activeSub);
  const current = all.find((i) => isActive(i) && !pinned.includes(i) && !frequent.includes(i));

  const row = (i: (typeof all)[number], pin: boolean) => (
    <div key={i.key} className={`group flex items-center rounded-lg transition ${isActive(i) ? 'bg-emerald-600 text-white shadow' : 'hover:bg-slate-100'}`}>
      <button onClick={() => onNavigate(i.tab, i.sub)} title={`${i.section} → ${i.label}`} className={`flex-1 min-w-0 text-left px-3 py-1.5 text-xs truncate ${isActive(i) ? 'font-bold text-white' : 'font-semibold text-slate-700'}`}>
        {i.label}
      </button>
      <button onClick={() => onTogglePin(i.key)} title={pin ? 'Unpin' : 'Pin'} className={`p-1.5 ${pin ? (isActive(i) ? 'text-amber-200' : 'text-amber-400') : 'opacity-0 group-hover:opacity-100 ' + (isActive(i) ? 'text-white/70' : 'text-slate-300')}`}>
        <Star className={`h-3.5 w-3.5 ${pin ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
  const heading = (text: string) => <div className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{text}</div>;

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white text-slate-700 h-full flex flex-col p-3 select-none overflow-y-auto">
      <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
        <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">{initials(company.name)}</div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-slate-900 text-sm truncate">{company.name}</h1>
          <p className="text-[11px] text-emerald-700 font-bold">DeskShark ERP</p>
        </div>
      </div>

      {can('dashboard.view') && (
        <button onClick={() => onNavigate('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition mb-1 ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 font-semibold'}`}>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </button>
      )}
      <button onClick={onOpenMenu} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 mb-1">
        <LayoutGrid className="h-4 w-4" /> All menus
      </button>

      {pinned.length > 0 && (
        <>
          {heading('Pinned')}
          <div className="space-y-0.5">{pinned.map((i) => row(i, true))}</div>
        </>
      )}
      {heading(used.length >= 3 ? 'Most used' : 'Quick access')}
      <div className="space-y-0.5">{frequent.map((i) => row(i, false))}</div>
      {current && (
        <>
          {heading('Open now')}
          <div className="space-y-0.5">{row(current, false)}</div>
        </>
      )}
      <p className="mt-auto px-3 pt-4 text-[10px] leading-snug text-slate-400">Pages you use most show here. Everything else: <button onClick={onOpenMenu} className="font-bold text-emerald-700">All menus</button> (top bar). ☆ pins a page.</p>
    </aside>
  );
};
