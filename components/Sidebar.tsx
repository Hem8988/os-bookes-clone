'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  Boxes,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  Database,
} from 'lucide-react';
import type { Permission } from '../lib/permissions';
import { initials, useCompany } from '../lib/useCompany';

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
      { tab: 'registers', sub: 'vehicles', label: 'Vehicles', permission: 'ops.view' },
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
      { tab: 'ledgers', label: 'Ledgers', permission: 'ledger.view' },
      { tab: 'cash', label: 'Cash wallets', permission: 'wallet.viewAll' },
      { tab: 'day-closing', label: 'Day closing', permission: 'dayclose.perform' },
      { tab: 'billing', label: 'New invoice', permission: 'invoices.manage' },
      { tab: 'documents', sub: 'sales', label: 'Invoices', permission: 'invoices.view' },
      { tab: 'gst', label: 'GST reports', permission: 'invoices.view' },
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
    ],
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
    items: [{ tab: 'whatsapp', label: 'Bot, templates & log', permission: 'whatsapp.manage' }],
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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, activeSub, can, onNavigate }) => {
  const company = useCompany();
  const sections = MENU.map((s) => ({ ...s, items: s.items.filter((i) => can(i.permission)) })).filter((s) => s.items.length);
  const current = sections.find((s) => s.items.some((i) => i.tab === activeTab))?.key;
  const [open, setOpen] = useState<string | undefined>(current || 'ops');

  const itemClass = (item: MenuItem) =>
    item.tab === activeTab && (!item.sub || item.sub === activeSub) ? 'bg-emerald-600 text-white font-bold shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold';

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

      {sections.map((section) => {
        const Icon = section.icon;
        const isOpen = open === section.key;
        return (
          <div key={section.key} className="mb-1">
            <button onClick={() => setOpen(isOpen ? undefined : section.key)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide text-slate-500 hover:bg-slate-50">
              <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {section.label}</span>
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {isOpen && (
              <div className="pl-3 mt-0.5 space-y-0.5">
                {section.items.map((item) => (
                  <button key={`${item.tab}:${item.sub || ''}`} onClick={() => onNavigate(item.tab, item.sub)} className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${itemClass(item)}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

    </aside>
  );
};
