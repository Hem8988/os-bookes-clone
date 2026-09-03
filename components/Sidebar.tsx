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
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Truck,
  DollarSign,
  Clock,
  MessageSquare,
  BarChart3,
  SlidersHorizontal,
  ArrowRightLeft,
  Lock,
  UserCheck,
  CheckCircle2,
  FileCheck,
  Bell,
  MapPin,
  Route
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
}) => {
  const [openSection, setOpenSection] = useState<string>('orders');

  const toggleSection = (sec: string) => {
    setOpenSection(openSection === sec ? '' : sec);
  };

  const activeItemClass = 'bg-emerald-600/90 text-white font-bold shadow-sm';
  const inactiveItemClass = 'text-slate-400 hover:text-white hover:bg-slate-800/80';

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-300 h-full flex flex-col justify-between p-3 select-none overflow-y-auto">
      <div className="space-y-1">
        
        {/* Logo Banner */}
        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-700/40">
          <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-emerald-900/50">
            PI
          </div>
          <div>
            <h1 className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1">
              PRAMUKH INDANE
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </h1>
            <p className="text-[11px] text-emerald-300 font-medium">B2B LPG Distribution ERP</p>
          </div>
        </div>

        {/* 1. DASHBOARD */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === 'dashboard' ? activeItemClass : inactiveItemClass
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        {/* 2. CUSTOMERS SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('customers')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>CUSTOMERS</span>
            </div>
            {openSection === 'customers' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'customers' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('customers')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'customers' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Customers</button>
              <button onClick={() => setActiveTab('vendors')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'vendors' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Vendors (Suppliers)</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'cylinder-inventory' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Cylinder Ledger</button>
            </div>
          )}
        </div>

        {/* 3. ORDERS SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('orders')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" />
              <span>ORDERS</span>
            </div>
            {openSection === 'orders' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'orders' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('inventory-hub', 'so')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'inventory-hub' ? 'bg-sky-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Orders</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'approval-queue' ? 'bg-sky-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Approval Queue</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'delivery-app' ? 'bg-sky-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Delivery Assignment</button>
            </div>
          )}
        </div>

        {/* 4. INVENTORY SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('inventory')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-400" />
              <span>INVENTORY</span>
            </div>
            {openSection === 'inventory' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'inventory' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('inventory-hub', 'stock')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Warehouse Inventory</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Delivery Boy Stock</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'cylinder-inventory' ? 'bg-indigo-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Cylinder Inventory</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Stock Transfer</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Stock Adjustment</button>
            </div>
          )}
        </div>

        {/* 5. DELIVERY SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('delivery')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-400" />
              <span>DELIVERY</span>
            </div>
            {openSection === 'delivery' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'delivery' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'delivery-app' ? 'bg-amber-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Delivery Management</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Delivery Boy App</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Delivery History</button>
            </div>
          )}
        </div>

        {/* 6. FINANCE SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('finance')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span>FINANCE</span>
            </div>
            {openSection === 'finance' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'finance' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('account-hub', 'customer-ledger')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'account-hub' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Customer Ledger</button>
              <button onClick={() => setActiveTab('account-hub', 'payment-ledger')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Payments</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Payment Verification</button>
              <button onClick={() => setActiveTab('billing')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'billing' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Invoices</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Cash Wallet</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Cash Submission</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Day Closing</button>
            </div>
          )}
        </div>

        {/* 7. WHATSAPP SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('whatsapp')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span>WHATSAPP</span>
            </div>
            {openSection === 'whatsapp' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'whatsapp' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('whatsapp-sender')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'whatsapp-sender' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Order Inbox</button>
              <button onClick={() => setActiveTab('whatsapp-sender')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• WhatsApp Bot</button>
              <button onClick={() => setActiveTab('whatsapp-sender')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Notifications</button>
            </div>
          )}
        </div>

        {/* 8. REPORTS SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('reports')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              <span>REPORTS</span>
            </div>
            {openSection === 'reports' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'reports' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('reports-hub', 'sales')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'reports-hub' ? 'bg-purple-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Sales Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'collection')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Collection Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'inventory')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Inventory Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'cylinder-balance')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Cylinder Balance Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'outstanding')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Outstanding Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'delivery-performance')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Delivery Performance Report</button>
            </div>
          )}
        </div>

        {/* 9. MASTERS SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('masters')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
              <span>MASTERS</span>
            </div>
            {openSection === 'masters' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'masters' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('staff')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'staff' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Staff Management</button>
              <button onClick={() => setActiveTab('masters', 'customer')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Customers</button>
              <button onClick={() => setActiveTab('masters', 'product')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Products</button>
              <button onClick={() => setActiveTab('masters', 'company')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Areas</button>
              <button onClick={() => setActiveTab('masters', 'vendor')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Routes</button>
              <button onClick={() => setActiveTab('masters', 'employee')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Delivery Boys</button>
              <button onClick={() => setActiveTab('masters', 'payment')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Payment Modes</button>
            </div>
          )}
        </div>

        {/* 10. ADMIN SECTION */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            onClick={() => toggleSection('admin')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              <span>ADMIN</span>
            </div>
            {openSection === 'admin' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'admin' && (
            <div className="bg-slate-950/80 px-2 py-1 space-y-0.5 border-t border-slate-800/60 text-xs">
              <button onClick={() => setActiveTab('staff')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'staff' ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Staff Management</button>
              <button onClick={() => setActiveTab('admin')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'admin' ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Users & Roles</button>
              <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-3 py-1.5 rounded ${activeTab === 'settings' ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-800'}`}>• Settings</button>
              <button onClick={() => setActiveTab('admin')} className={`w-full text-left px-3 py-1.5 rounded hover:bg-slate-800`}>• Audit Logs</button>
            </div>
          )}
        </div>

      </div>

      {/* Footer Branding */}
      <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
        Pramukh Indane B2B ERP v2.0
      </div>
    </aside>
  );
};
