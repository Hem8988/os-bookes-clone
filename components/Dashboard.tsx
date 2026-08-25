'use client';

import React from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Receipt, 
  Users, 
  Package, 
  PlusCircle, 
  FileCheck2,
  DollarSign,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { Invoice, Product, Customer } from '../lib/types';

interface DashboardProps {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  setActiveTab: (tab: string) => void;
  onOpenInvoiceModal: (inv: Invoice) => void;
}

const salesChartData = [
  { day: 'Mon', Sales: 14200, Expenses: 4100 },
  { day: 'Tue', Sales: 22400, Expenses: 6300 },
  { day: 'Wed', Sales: 18900, Expenses: 5100 },
  { day: 'Thu', Sales: 31500, Expenses: 8900 },
  { day: 'Fri', Sales: 27800, Expenses: 7200 },
  { day: 'Sat', Sales: 39400, Expenses: 9400 },
  { day: 'Sun', Sales: 19751, Expenses: 3200 },
];

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  products,
  customers,
  setActiveTab,
  onOpenInvoiceModal,
}) => {
  const lowStockItems = products.filter((p) => p.stock <= p.minStockAlert);
  const totalReceivables = customers
    .filter((c) => c.balance > 0)
    .reduce((acc, c) => acc + c.balance, 0);
  const totalPayables = Math.abs(
    customers
      .filter((c) => c.balance < 0)
      .reduce((acc, c) => acc + c.balance, 0)
  );
  const todaySales = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-800 text-white shadow-md">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            GST ERP Business Executive Overview
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
              Real-time Sync
            </span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            Store: <strong className="text-emerald-400">PRAMUKH INDANE GAS AGENCY</strong> | Financial Year 2026-27
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('approval-queue')}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs md:text-sm shadow-md transition-all active:scale-95"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Approval Queue</span>
          </button>
          <button
            onClick={() => setActiveTab('cylinder-inventory')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Package className="h-3.5 w-3.5 text-indigo-400" />
            <span>Cylinder Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('delivery-app')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Users className="h-3.5 w-3.5 text-amber-400" />
            <span>Delivery Fleet</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              ₹{todaySales.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+18.4% vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Total Receivables */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Receivables
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              ₹{totalReceivables.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              From 3 Active Customers
            </div>
          </div>
        </div>

        {/* Total Payables */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vendor Payables
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              ₹{totalPayables.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
              Due within 15 Days
            </div>
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Stock Warnings
            </span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {lowStockItems.length} Items Low
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-[11px] text-rose-500 hover:underline font-semibold mt-1 block"
            >
              Reorder stock items →
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts & Stock Warnings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue Curve */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Weekly Sales & Operating Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily comparison of sales revenue vs expenses (₹)
              </p>
            </div>
            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
              July 2026
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '8px', 
                    color: '#fff', 
                    fontSize: '12px' 
                  }} 
                />
                <Area type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="Expenses" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alert Sidebar List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Low Stock Alerts
              </h3>
              <span className="text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded">
                Action Required
              </span>
            </div>

            <div className="space-y-2.5">
              {lowStockItems.map((prod) => (
                <div 
                  key={prod.id} 
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{prod.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      HSN: {prod.hsnCode} | Min Threshold: {prod.minStockAlert} {prod.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm block">
                      {prod.stock} {prod.unit}
                    </span>
                    <span className="text-[10px] text-slate-400">Remain</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('inventory')}
            className="w-full mt-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            Manage Product Inventory →
          </button>
        </div>
      </div>

      {/* Recent Tax Invoices Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recent GST Tax Invoices
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest sales receipts generated in firm
            </p>
          </div>

          <button
            onClick={() => setActiveTab('invoices')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            View All Invoices →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-3 py-2.5">Invoice #</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Party Name</th>
                <th className="px-3 py-2.5">Supply Type</th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-3 py-3">{inv.date}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-200">
                    {inv.customerName}
                  </td>
                  <td className="px-3 py-3">
                    {inv.isIgst ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        IGST (Interstate)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        CGST + SGST (Local)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                    ₹{inv.grandTotal.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {inv.status} ({inv.paymentMode})
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => onOpenInvoiceModal(inv)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all"
                    >
                      Print Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
