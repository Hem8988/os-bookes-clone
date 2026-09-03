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
  pendingRequestsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingRequestsCount = 0,
}) => {
  const [openSection, setOpenSection] = useState<string>('orders');

  const toggleSection = (sec: string) => {
    setOpenSection(openSection === sec ? '' : sec);
  };

  const activeItemClass = 'bg-emerald-600 text-white font-bold shadow-md';
  const inactiveItemClass = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold';

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white text-slate-700 h-full flex flex-col justify-between p-3 select-none overflow-y-auto shadow-sm">
      <div className="space-y-1">
        
        {/* Logo Banner */}
        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-md">
            PI
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-sm tracking-wide flex items-center gap-1">
              PRAMUKH INDANE
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </h1>
            <p className="text-[11px] text-emerald-700 font-bold">B2B LPG Distribution ERP</p>
          </div>
        </div>

        {/* 1. DASHBOARD */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm transition-all cursor-pointer ${
            activeTab === 'dashboard' ? activeItemClass : inactiveItemClass
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        {/* 2. CUSTOMERS SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('customers')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <span>CUSTOMERS</span>
            </div>
            {openSection === 'customers' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'customers' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('customers')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'customers' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Customers</button>
              <button onClick={() => setActiveTab('vendors')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'vendors' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Vendors (Suppliers)</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'cylinder-inventory' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Cylinder Ledger</button>
            </div>
          )}
        </div>

        {/* 3. ORDERS SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('orders')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-600" />
              <span>ORDERS</span>
            </div>
            {openSection === 'orders' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'orders' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('inventory-hub', 'so')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'inventory-hub' ? 'bg-sky-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Orders</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'approval-queue' ? 'bg-sky-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Approval Queue</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'delivery-app' ? 'bg-sky-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Delivery Assignment</button>
            </div>
          )}
        </div>

        {/* 4. INVENTORY SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('inventory')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <span>INVENTORY</span>
            </div>
            {openSection === 'inventory' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'inventory' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('inventory-hub', 'stock')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Warehouse Inventory</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Delivery Boy Stock</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'cylinder-inventory' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Cylinder Inventory</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Stock Transfer</button>
              <button onClick={() => setActiveTab('cylinder-inventory')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Stock Adjustment</button>
            </div>
          )}
        </div>

        {/* 5. DELIVERY SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('delivery')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-600" />
              <span>DELIVERY</span>
            </div>
            {openSection === 'delivery' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'delivery' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'delivery-app' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Delivery Management</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Delivery Boy App</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Delivery History</button>
              <button
                onClick={() => setActiveTab('delivery-requests')}
                className={`w-full text-left px-3 py-1.5 rounded cursor-pointer flex items-center justify-between ${activeTab === 'delivery-requests' ? 'bg-rose-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                <span>📥 Delivery Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black min-w-[18px] text-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 6. FINANCE SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('finance')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span>FINANCE</span>
            </div>
            {openSection === 'finance' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'finance' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('account-hub', 'customer-ledger')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'account-hub' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Customer Ledger</button>
              <button onClick={() => setActiveTab('account-hub', 'payment-ledger')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Payments</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Payment Verification</button>
              <button onClick={() => setActiveTab('billing')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'billing' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Invoices</button>
              <button onClick={() => setActiveTab('delivery-app')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Cash Wallet</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Cash Submission</button>
              <button onClick={() => setActiveTab('approval-queue')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Day Closing</button>
            </div>
          )}
        </div>

        {/* 7. WHATSAPP SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('whatsapp')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>WHATSAPP</span>
            </div>
            {openSection === 'whatsapp' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'whatsapp' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('whatsapp-sender')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'whatsapp-sender' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Order Inbox</button>
              <button onClick={() => setActiveTab('whatsapp-sender')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• WhatsApp Bot</button>
              <button onClick={() => setActiveTab('whatsapp-sender')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Notifications</button>
            </div>
          )}
        </div>

        {/* 8. REPORTS SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('reports')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span>REPORTS</span>
            </div>
            {openSection === 'reports' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'reports' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('reports-hub', 'sales')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'reports-hub' ? 'bg-purple-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Sales Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'collection')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Collection Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'inventory')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Inventory Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'cylinder-balance')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Cylinder Balance Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'outstanding')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Outstanding Report</button>
              <button onClick={() => setActiveTab('reports-hub', 'delivery-performance')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Delivery Performance Report</button>
            </div>
          )}
        </div>

        {/* 9. MASTERS SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('masters')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
              <span>MASTERS</span>
            </div>
            {openSection === 'masters' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'masters' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('staff')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'staff' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Staff Management</button>
              <button onClick={() => setActiveTab('masters', 'customer')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Customers</button>
              <button onClick={() => setActiveTab('masters', 'product')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Products</button>
              <button onClick={() => setActiveTab('masters', 'company')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Areas</button>
              <button onClick={() => setActiveTab('masters', 'vendor')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Routes</button>
              <button onClick={() => setActiveTab('masters', 'employee')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Delivery Boys</button>
              <button onClick={() => setActiveTab('masters', 'payment')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Payment Modes</button>
            </div>
          )}
        </div>

        {/* 10. ADMIN SECTION */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
          <button
            onClick={() => toggleSection('admin')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              <span>ADMIN</span>
            </div>
            {openSection === 'admin' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {openSection === 'admin' && (
            <div className="bg-white px-2 py-1 space-y-0.5 border-t border-slate-200 text-xs">
              <button onClick={() => setActiveTab('staff')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'staff' ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Staff Management</button>
              <button onClick={() => setActiveTab('admin')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'admin' ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Users & Roles</button>
              <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer ${activeTab === 'settings' ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}>• Settings</button>
              <button onClick={() => setActiveTab('admin')} className={`w-full text-left px-3 py-1.5 rounded cursor-pointer hover:bg-slate-100 text-slate-700`}>• Audit Logs</button>
            </div>
          )}
        </div>

      </div>

      {/* Footer Branding */}
      <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-bold text-center">
        Pramukh Indane B2B ERP v2.0
      </div>
    </aside>
  );
};
