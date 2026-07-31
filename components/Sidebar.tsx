'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  Package, 
  Users, 
  PieChart, 
  Settings, 
  BookOpen,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Database,
  Plus,
  ShoppingCart,
  RotateCcw,
  Truck,
  FileCheck,
  Calculator,
  SlidersHorizontal,
  Landmark,
  Building2,
  UserCheck,
  DollarSign,
  TrendingUp,
  CalendarCheck,
  GitBranch,
  PackageCheck,
  BarChart3,
  Layers,
  Scale,
  Wrench,
  Tag,
  Barcode,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string, subTab?: string, cat?: string) => void;
  lowStockCount: number;
  unpaidCount: number;
  activeMastersSubTab?: string;
  activeInventorySubTab?: string;
  activeAccountSubTab?: string;
  reportsSubTab?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  unpaidCount,
  activeMastersSubTab,
  activeInventorySubTab,
  activeAccountSubTab,
  reportsSubTab,
}) => {
  const [openSection, setOpenSection] = useState<string>('inventory');

  const toggleSection = (sec: string) => {
    setOpenSection(openSection === sec ? '' : sec);
  };

  const activeItemClass = 'bg-emerald-600/90 text-white font-bold shadow-sm';

  // 1. Masters list (11 items)
  const mastersList = [
    { id: 'bank', label: 'Bank Master' },
    { id: 'company', label: 'Company Master' },
    { id: 'customer', label: 'Customer Master' },
    { id: 'vendor', label: 'Vendor Master' },
    { id: 'category', label: 'Category Master' },
    { id: 'employee', label: 'Employee Master' },
    { id: 'expense', label: 'Expense Master' },
    { id: 'income', label: 'Income Master' },
    { id: 'payment', label: 'Payment Master' },
    { id: 'product', label: 'Product Master' },
    { id: 'unit', label: 'Unit Catalog Master' },
    { id: 'bom', label: 'BOM Master' },
    { id: 'narration', label: 'Narration Master' },
  ];

  // 2. Inventory list (11 items)
  const inventoryList = [
    { id: 'po', label: 'Purchase Order', icon: ShoppingCart, hasPlus: true },
    { id: 'purchase', label: 'Purchase', shortcut: '( Ctrl + P )', icon: ShoppingCart, hasPlus: true },
    { id: 'preturn', label: 'Purchase Return', icon: RotateCcw, hasPlus: true },
    { id: 'so', label: 'Sale Order', icon: ShoppingCart, hasPlus: true },
    { id: 'sales', label: 'Sales', shortcut: '( Ctrl + S )', icon: FileText, hasPlus: true },
    { id: 'sreturn', label: 'Sales Return', icon: RotateCcw, hasPlus: true },
    { id: 'challan', label: 'Customer Challan', icon: Truck, hasPlus: true },
    { id: 'cinvoice', label: 'Customer Invoice', icon: FileCheck, hasPlus: true },
    { id: 'quotation', label: 'Quotation', icon: Calculator, hasPlus: true },
    { id: 'adjustment', label: 'Stock Adjustment', icon: SlidersHorizontal, hasPlus: true },
    { id: 'stock', label: 'Stock Inventory', icon: Package, hasPlus: false },
  ];

  // 3. Branch Management list (2 items)
  const branchList = [
    { id: 'stock-in', label: 'Stock In', icon: PackageCheck, hasPlus: false },
    { id: 'stock-out', label: 'Stock Out', icon: Truck, hasPlus: true },
  ];

  // 4. Account list (8 items)
  const accountList = [
    { id: 'customer-ledger', label: 'Customer Ledger', shortcut: '( Ctrl + Shift + C )', icon: Users },
    { id: 'company-ledger', label: 'Company Ledger', shortcut: '( Ctrl + Shift + M )', icon: Building2 },
    { id: 'bank-book', label: 'Bank Book', icon: Landmark },
    { id: 'employee-ledger', label: 'Employee Ledger', icon: UserCheck },
    { id: 'expenses-ledger', label: 'Expenses Ledger', shortcut: '( Ctrl + E )', icon: DollarSign },
    { id: 'incomes-ledger', label: 'Incomes Ledger', shortcut: '( Ctrl + I )', icon: TrendingUp },
    { id: 'payment-ledger', label: 'Payment Ledger', icon: Receipt },
    { id: 'employee-attendance', label: 'Employee Attendance', icon: CalendarCheck },
  ];

  // 5. Account Summary list (10 items - Screenshot 1)
  const accountSummaryList = [
    { id: 'cust-outstanding', label: 'Customer Outstanding' },
    { id: 'comp-outstanding', label: 'Company Outstanding' },
    { id: 'stock-summary', label: 'Stock summary', shortcut: '( F1 )' },
    { id: 'sale-summary', label: 'Sale summary' },
    { id: 'purchase-summary', label: 'Purchase summary' },
    { id: 'cash-bank-summary', label: 'Cash & Bank summary' },
    { id: 'exp-summary', label: 'Expenses summary' },
    { id: 'daybook-summary', label: 'Day Book Summary' },
    { id: 'expiry-report', label: 'Expiry Report' },
    { id: 'order-list', label: 'Order List' },
  ];

  // 6. Inventory Summary list (8 items - Screenshot 2)
  const inventorySummaryList = [
    { id: 'brand-sale', label: 'Brandwise Sale' },
    { id: 'brand-pur', label: 'Brandwise Purchase' },
    { id: 'cat-sale', label: 'Categorywise Sale' },
    { id: 'cat-pur', label: 'Categorywise Purchase' },
    { id: 'item-sale', label: 'Item wise Sale' },
    { id: 'item-pur', label: 'Item wise Purchase' },
    { id: 'emp-sale', label: 'Employeewise Sale' },
    { id: 'invoices-report', label: 'Invoices Report' },
  ];

  // 7. Final Accounts list (5 items - Screenshot 3)
  const finalAccountsList = [
    { id: 'trading-acc', label: 'Trading Account' },
    { id: 'pnl-acc', label: 'Profit and Loss Account' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'rojmel', label: 'Daily Cash / Rojmel' },
    { id: 'tcs-report', label: 'TCS Report' },
  ];

  // 8. GSTR's Summary list (9 items - Screenshot 4)
  const gstrList = [
    { id: 'gstr-1', label: 'GSTR-1' },
    { id: 'gstr-2', label: 'GSTR-2' },
    { id: 'gstr-3b', label: 'GSTR-3B' },
    { id: 'gstr-sale-sum', label: 'Sale Summary' },
    { id: 'gstr-sale-ret', label: 'Sale Return' },
    { id: 'gstr-pur-sum', label: 'Purchase Summary' },
    { id: 'gstr-pur-ret', label: 'Purchase Return' },
    { id: 'gst-wise', label: 'GST-WISE Summary' },
    { id: 'hsn-wise', label: 'HSN-WISE Summary' },
  ];

  // 9. Tools list (15 items - Screenshot 5)
  const toolsList = [
    { id: 'complaint', label: 'Complaint', shortcut: '( Alt + C )' },
    { id: 'service-reminder', label: 'Service Reminder' },
    { id: 'msg-template', label: 'Set Message Template' },
    { id: 'barcode-gen', label: 'BarCode' },
    { id: 'bank-import', label: 'Bank Statement Import' },
    { id: 'hsn-err', label: 'HSN & GST Error' },
    { id: 'uqc-merge', label: 'GST UQC Merge' },
    { id: 'stock-corr', label: 'Stock Correction' },
    { id: 'price-update', label: 'Stock Price Update' },
    { id: 'bal-corr', label: 'All Balance Correction' },
    { id: 'invalid-units', label: 'Invalid Units Correction' },
    { id: 'recycle-bin', label: 'Recycle Bin' },
    { id: 'merge-hist', label: 'Merge History' },
    { id: 'notification-perm', label: 'Notification Permission' },
    { id: 'hard-refresh', label: 'Hard Refresh Local Data' },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-300 h-full flex flex-col justify-between p-3 select-none overflow-y-auto">
      <div className="space-y-1">
        {/* Logo Banner */}
        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl bg-gradient-to-r from-emerald-900/60 to-slate-800/80 border border-emerald-700/40">
          <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-emerald-900/50">
            OS
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1">
              OS-BOOKS
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </h1>
            <p className="text-[11px] text-emerald-300 font-medium">GST ERP & Accounting</p>
          </div>
        </div>

        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'bg-emerald-600 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
        </button>

        {/* 1. MASTERS ACCORDION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('masters');
              setActiveTab('masters');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-teal-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-teal-400" />
              <span>Masters</span>
            </div>
            {openSection === 'masters' ? <ChevronDown className="h-4 w-4 text-teal-300" /> : <ChevronRight className="h-4 w-4 text-teal-300" />}
          </button>

          {openSection === 'masters' && (
            <div className="py-1 bg-slate-900/90 divide-y divide-slate-800/50">
              {mastersList.map((m) => {
                const isActive = activeTab === 'masters' && activeMastersSubTab === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveTab('masters', m.id)}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-all cursor-pointer ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-slate-500 flex items-center justify-center text-[8px]">○</span>
                      <span>{m.label}</span>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. INVENTORY ACCORDION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('inventory');
              setActiveTab('inventory-hub');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-emerald-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Package className="h-4 w-4 text-emerald-400" />
              <span>Inventory</span>
            </div>
            {openSection === 'inventory' ? <ChevronDown className="h-4 w-4 text-emerald-300" /> : <ChevronRight className="h-4 w-4 text-emerald-300" />}
          </button>

          {openSection === 'inventory' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {inventoryList.map((item) => {
                const Icon = item.icon;
                const isActive =
                  (activeTab === 'inventory-hub' || activeTab === 'inventory') &&
                  activeInventorySubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'cinvoice') {
                        setActiveTab('billing');
                      } else {
                        setActiveTab('inventory-hub', item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <div>
                        <span className={`font-semibold ${isActive ? 'text-white' : 'text-slate-200'}`}>{item.label}</span>
                        {item.shortcut && <div className="text-[10px] text-emerald-400 font-mono font-bold">{item.shortcut}</div>}
                      </div>
                    </div>
                    {item.hasPlus && <Plus className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. BRANCH MANAGEMENT ACCORDION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('branch');
              setActiveTab('account-hub', 'stock-in');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-cyan-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <GitBranch className="h-4 w-4 text-cyan-400" />
              <span>Branch Management</span>
            </div>
            {openSection === 'branch' ? <ChevronDown className="h-4 w-4 text-cyan-300" /> : <ChevronRight className="h-4 w-4 text-cyan-300" />}
          </button>

          {openSection === 'branch' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {branchList.map((b) => {
                const Icon = b.icon;
                const isActive = activeTab === 'account-hub' && activeAccountSubTab === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveTab('account-hub', b.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className={`font-semibold ${isActive ? 'text-white' : 'text-slate-200'}`}>{b.label}</span>
                    </div>
                    {b.hasPlus && <Plus className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. ACCOUNT ACCORDION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('account');
              setActiveTab('account-hub', 'customer-ledger');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-cyan-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Landmark className="h-4 w-4 text-cyan-400" />
              <span>Account</span>
            </div>
            {openSection === 'account' ? <ChevronDown className="h-4 w-4 text-cyan-300" /> : <ChevronRight className="h-4 w-4 text-cyan-300" />}
          </button>

          {openSection === 'account' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {accountList.map((acc) => {
                const Icon = acc.icon;
                const isActive = activeTab === 'account-hub' && activeAccountSubTab === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => setActiveTab('account-hub', acc.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <div>
                        <span className={`font-semibold ${isActive ? 'text-white' : 'text-slate-200'}`}>{acc.label}</span>
                        {acc.shortcut && <div className="text-[10px] text-cyan-300 font-mono font-bold">{acc.shortcut}</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. ACCOUNT SUMMARY ACCORDION (Screenshot 1) */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('account-summary');
              setActiveTab('reports-hub', 'cust-outstanding', 'account-summary');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-blue-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span>Account Summary</span>
            </div>
            {openSection === 'account-summary' ? <ChevronDown className="h-4 w-4 text-blue-300" /> : <ChevronRight className="h-4 w-4 text-blue-300" />}
          </button>

          {openSection === 'account-summary' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {accountSummaryList.map((item) => {
                const isActive = activeTab === 'reports-hub' && reportsSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab('reports-hub', item.id, 'account-summary')}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-slate-500 flex items-center justify-center text-[8px]">○</span>
                      <div>
                        <span className="font-semibold">{item.label}</span>
                        {item.shortcut && <div className="text-[10px] text-emerald-400 font-mono font-bold">{item.shortcut}</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. INVENTORY SUMMARY ACCORDION (Screenshot 2) */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('inventory-summary');
              setActiveTab('reports-hub', 'brand-sale', 'inventory-summary');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-teal-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-teal-400" />
              <span>Inventory Summary</span>
            </div>
            {openSection === 'inventory-summary' ? <ChevronDown className="h-4 w-4 text-teal-300" /> : <ChevronRight className="h-4 w-4 text-teal-300" />}
          </button>

          {openSection === 'inventory-summary' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {inventorySummaryList.map((item) => {
                const isActive = activeTab === 'reports-hub' && reportsSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab('reports-hub', item.id, 'inventory-summary')}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-slate-500 flex items-center justify-center text-[8px]">○</span>
                      <span className="font-semibold">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 7. FINAL ACCOUNTS ACCORDION (Screenshot 3) */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('final-accounts');
              setActiveTab('reports-hub', 'pnl-acc', 'final-accounts');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-purple-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Scale className="h-4 w-4 text-purple-400" />
              <span>Final Accounts</span>
            </div>
            {openSection === 'final-accounts' ? <ChevronDown className="h-4 w-4 text-purple-300" /> : <ChevronRight className="h-4 w-4 text-purple-300" />}
          </button>

          {openSection === 'final-accounts' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {finalAccountsList.map((item) => {
                const isActive = activeTab === 'reports-hub' && reportsSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab('reports-hub', item.id, 'final-accounts')}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-slate-500 flex items-center justify-center text-[8px]">○</span>
                      <span className="font-semibold">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 8. GSTR'S SUMMARY ACCORDION (Screenshot 4) */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('gstr-summary');
              setActiveTab('reports-hub', 'gstr-1', 'gstr-summary');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-indigo-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <PieChart className="h-4 w-4 text-indigo-400" />
              <span>GSTR's Summary</span>
            </div>
            {openSection === 'gstr-summary' ? <ChevronDown className="h-4 w-4 text-indigo-300" /> : <ChevronRight className="h-4 w-4 text-indigo-300" />}
          </button>

          {openSection === 'gstr-summary' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {gstrList.map((item) => {
                const isActive = activeTab === 'reports-hub' && reportsSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab('reports-hub', item.id, 'gstr-summary')}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-slate-500 flex items-center justify-center text-[8px]">○</span>
                      <span className="font-semibold">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 9. TOOLS ACCORDION (Screenshot 5) */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => {
              toggleSection('tools');
              setActiveTab('reports-hub', 'barcode-gen', 'tools-hub');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-extrabold text-amber-400 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Wrench className="h-4 w-4 text-amber-400" />
              <span>Tools</span>
            </div>
            {openSection === 'tools' ? <ChevronDown className="h-4 w-4 text-amber-300" /> : <ChevronRight className="h-4 w-4 text-amber-300" />}
          </button>

          {openSection === 'tools' && (
            <div className="py-1 bg-slate-900/95 divide-y divide-slate-800/40">
              {toolsList.map((item) => {
                const isActive = activeTab === 'reports-hub' && reportsSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab('reports-hub', item.id, 'tools-hub')}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-all ${
                      isActive ? activeItemClass : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-slate-500 flex items-center justify-center text-[8px]">○</span>
                      <div>
                        <span className="font-semibold">{item.label}</span>
                        {item.shortcut && <div className="text-[10px] text-amber-400 font-mono font-bold">{item.shortcut}</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Direct Links */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
            activeTab === 'customers'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4" />
            <span>Customers & Vendors</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('gst-reports')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
            activeTab === 'gst-reports'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <PieChart className="h-4 w-4" />
            <span>GST Reports</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('reports-hub', 'cust-outstanding', 'account-summary')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
            activeTab === 'reports-hub'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="h-4 w-4" />
            <span>Reports & Tools Hub</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500 text-slate-950">
            F1
          </span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
            activeTab === 'billing'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <Receipt className="h-4 w-4" />
            <span>POS & Fast Billing</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500 text-slate-950">
            F2
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4" />
            <span>Firm Settings</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
            activeTab === 'admin'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4" />
            <span>Admin Panel</span>
          </div>
        </button>
      </div>

      {/* Footer Info Box */}
      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs mt-3">
        <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            Version 2026.4
          </span>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-700 px-1.5 py-0.5 rounded">
            FULL CLONE
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          All 9 Accordions & 90+ Menu Items Configured.
        </p>
      </div>
    </aside>
  );
};
