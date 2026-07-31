'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  FileSpreadsheet, 
  Wrench, 
  Search, 
  Calendar, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  DollarSign, 
  Layers, 
  Tag, 
  UserCheck, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Barcode, 
  Trash2, 
  CheckCircle2,
  TrendingUp,
  Receipt,
  Scale,
  Lock,
  Check
} from 'lucide-react';
import { Product, Customer, Invoice } from '../lib/types';
import { StockPriceUpdateModule } from './StockPriceUpdateModule';

interface ReportsAndToolsModuleProps {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  initialCategory?: string;
  initialSubTab?: string;
  onUpdateProduct?: (product: Product) => void;
}

export const ReportsAndToolsModule: React.FC<ReportsAndToolsModuleProps> = ({
  products,
  customers,
  invoices,
  initialCategory = 'account-summary',
  initialSubTab = 'cust-outstanding',
  onUpdateProduct
}) => {
  const [activeCat, setActiveCat] = useState<string>(initialCategory);
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);

  React.useEffect(() => {
    setActiveCat(initialCategory);
    setActiveSubTab(initialSubTab);
  }, [initialCategory, initialSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [rojmelDate, setRojmelDate] = useState('2026-01-20');
  const [rojmelShowDetails, setRojmelShowDetails] = useState(true);

  // 1. Account Summary sub-items (Screenshot 1)
  const accountSummaryTabs = [
    { id: 'cust-outstanding', label: 'Customer Outstanding' },
    { id: 'comp-outstanding', label: 'Company Outstanding' },
    { id: 'stock-summary', label: 'Stock summary (F1)' },
    { id: 'sale-summary', label: 'Sale summary' },
    { id: 'purchase-summary', label: 'Purchase summary' },
    { id: 'cash-bank-summary', label: 'Cash & Bank summary' },
    { id: 'exp-summary', label: 'Expenses summary' },
    { id: 'daybook-summary', label: 'Day Book Summary' },
    { id: 'expiry-report', label: 'Expiry Report' },
    { id: 'order-list', label: 'Order List' },
  ];

  // 2. Inventory Summary sub-items (Screenshot 2)
  const inventorySummaryTabs = [
    { id: 'brand-sale', label: 'Brandwise Sale' },
    { id: 'brand-pur', label: 'Brandwise Purchase' },
    { id: 'cat-sale', label: 'Categorywise Sale' },
    { id: 'cat-pur', label: 'Categorywise Purchase' },
    { id: 'item-sale', label: 'Item wise Sale' },
    { id: 'item-pur', label: 'Item wise Purchase' },
    { id: 'emp-sale', label: 'Employeewise Sale' },
    { id: 'invoices-report', label: 'Invoices Report' },
  ];

  // 3. Final Accounts sub-items (Screenshot 3)
  const finalAccountsTabs = [
    { id: 'trading-acc', label: 'Trading Account' },
    { id: 'pnl-acc', label: 'Profit and Loss Account' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'rojmel', label: 'Daily Cash / Rojmel' },
    { id: 'tcs-report', label: 'TCS Report' },
  ];

  // 4. GSTR's Summary sub-items (Screenshot 4)
  const gstrTabs = [
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

  // 5. Tools sub-items (Screenshot 5)
  const toolsTabs = [
    { id: 'complaint', label: 'Complaint (Alt + C)' },
    { id: 'service-reminder', label: 'Service Reminder' },
    { id: 'msg-template', label: 'Set Message Template' },
    { id: 'barcode-gen', label: 'BarCode Generator' },
    { id: 'bank-import', label: 'Bank Statement Import' },
    { id: 'hsn-err', label: 'HSN & GST Error Check' },
    { id: 'uqc-merge', label: 'GST UQC Merge' },
    { id: 'stock-corr', label: 'Stock Correction' },
    { id: 'price-update', label: 'Stock Price Update' },
    { id: 'bal-corr', label: 'All Balance Correction' },
    { id: 'recycle-bin', label: 'Recycle Bin' },
    { id: 'hard-refresh', label: 'Hard Refresh Local Data' },
  ];

  const totalReceivables = customers.filter(c => c.balance > 0).reduce((acc, c) => acc + c.balance, 0);
  const totalPayables = Math.abs(customers.filter(c => c.balance < 0).reduce((acc, c) => acc + c.balance, 0));

  if (activeSubTab === 'price-update') {
    return (
      <StockPriceUpdateModule 
        products={products} 
        onUpdateProduct={onUpdateProduct}
        onClose={() => setActiveSubTab('barcode-gen')} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            OS-BOOKS Reports, Final Accounts & Tools
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account Summaries, Inventory Summaries, P&L, Balance Sheet, GSTR Reports & Utilities
          </p>
        </div>

        <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all">
          <Download className="h-4 w-4" />
          <span>Export Summary (Excel / PDF)</span>
        </button>
      </div>

      {/* Main Categories Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { id: 'account-summary', label: 'Account Summary', icon: BarChart3 },
          { id: 'inventory-summary', label: 'Inventory Summary', icon: Layers },
          { id: 'final-accounts', label: 'Final Accounts', icon: Scale },
          { id: 'gstr-summary', label: "GSTR's Summary", icon: PieChart },
          { id: 'tools-hub', label: 'System Tools', icon: Wrench },
        ].map((c) => {
          const Icon = c.icon;
          const isActive = activeCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setActiveCat(c.id);
                if (c.id === 'account-summary') setActiveSubTab('cust-outstanding');
                else if (c.id === 'inventory-summary') setActiveSubTab('brand-sale');
                else if (c.id === 'final-accounts') setActiveSubTab('pnl-acc');
                else if (c.id === 'gstr-summary') setActiveSubTab('gstr-1');
                else if (c.id === 'tools-hub') setActiveSubTab('barcode-gen');
              }}
              className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tabs List depending on Category */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-thin">
        {activeCat === 'account-summary' && accountSummaryTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'inventory-summary' && inventorySummaryTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'final-accounts' && finalAccountsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'gstr-summary' && gstrTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'tools-hub' && toolsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* VIEW RENDERING */}

      {/* ACCOUNT SUMMARY - Customer Outstanding */}
      {activeSubTab === 'cust-outstanding' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Customer Outstanding Balance Report</h3>
            <div className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">Total Outstanding: ₹{totalReceivables.toLocaleString('en-IN')}</div>
          </div>
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2">Customer Name</th>
                <th className="px-3 py-2">GSTIN</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Credit Limit</th>
                <th className="px-3 py-2">Outstanding Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {customers.filter(c => c.balance > 0).map(c => (
                <tr key={c.id}>
                  <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="px-3 py-2.5 font-mono">{c.gstin || 'URP'}</td>
                  <td className="px-3 py-2.5">{c.phone}</td>
                  <td className="px-3 py-2.5 font-mono">₹{c.creditLimit.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2.5 font-mono font-black text-rose-600 dark:text-rose-400">₹{c.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FINAL ACCOUNTS - P&L */}
      {activeSubTab === 'pnl-acc' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-slate-100">Profit & Loss Account (Financial Year 2026-27)</h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1">INCOME / REVENUE (Cr)</div>
              <div className="flex justify-between"><span>Gross Sales Revenue:</span><span>₹8,94,500</span></div>
              <div className="flex justify-between"><span>Service & AMC Income:</span><span>₹2,85,000</span></div>
              <div className="flex justify-between font-bold text-emerald-600 pt-2 border-t border-slate-300 dark:border-slate-600"><span>TOTAL INCOME:</span><span>₹11,79,500</span></div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1">EXPENSES & COST OF GOODS (Dr)</div>
              <div className="flex justify-between"><span>Cost of Goods Sold (COGS):</span><span>₹5,12,000</span></div>
              <div className="flex justify-between"><span>Commercial Rent & Electricity:</span><span>₹43,400</span></div>
              <div className="flex justify-between"><span>Staff Salaries & Commissions:</span><span>₹1,85,000</span></div>
              <div className="flex justify-between font-bold text-rose-600 pt-2 border-t border-slate-300 dark:border-slate-600"><span>TOTAL EXPENSES:</span><span>₹7,40,400</span></div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 flex justify-between font-extrabold text-sm">
            <span>NET PROFIT BEFORE TAX:</span>
            <span className="font-mono text-base text-emerald-400">₹4,39,100</span>
          </div>
        </div>
      )}

      {/* FINAL ACCOUNTS - Balance Sheet */}
      {activeSubTab === 'balance-sheet' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-slate-100">Balance Sheet as on July 27, 2026</h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1">LIABILITIES & EQUITY</div>
              <div className="flex justify-between"><span>Capital Reserve Account:</span><span>₹50,000,00</span></div>
              <div className="flex justify-between"><span>Sundry Creditors (Vendors):</span><span>₹64,200</span></div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-300 dark:border-slate-600"><span>TOTAL LIABILITIES:</span><span>₹50,64,200</span></div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1">ASSETS & CASH</div>
              <div className="flex justify-between"><span>Current Stock Inventory Valuation:</span><span>₹4,32,150</span></div>
              <div className="flex justify-between"><span>Sundry Debtors (Receivables):</span><span>₹1,46,250</span></div>
              <div className="flex justify-between"><span>Bank Balances (SBI + HDFC):</span><span>₹5,32,290</span></div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-300 dark:border-slate-600"><span>TOTAL ASSETS:</span><span>₹50,64,200</span></div>
            </div>
          </div>
        </div>
      )}

      {/* FINAL ACCOUNTS - Daily Cash Summary (ROJ MEL) */}
      {activeSubTab === 'rojmel' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-slate-900 text-white">
            <h3 className="text-sm font-bold">Daily Cash Summary (ROJ MEL) - Final Perfect Architecture with External Voucher Sync</h3>
          </div>

          {/* Toolbar Row */}
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <span>Date :</span>
              <input
                type="date"
                value={rojmelDate}
                onChange={(e) => setRojmelDate(e.target.value)}
                className="py-1 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              className="px-4 py-1.5 rounded border border-sky-400 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 text-xs font-bold hover:bg-sky-100"
            >
              Load
            </button>
            <button
              type="button"
              onClick={() => setRojmelShowDetails(!rojmelShowDetails)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <span className={`h-4 w-4 rounded-sm border flex items-center justify-center ${rojmelShowDetails ? 'bg-teal-600 border-teal-600' : 'border-slate-400 bg-white dark:bg-slate-800'}`}>
                {rojmelShowDetails && <Check className="h-3 w-3 text-white" />}
              </span>
              Show Item Details
            </button>
            <div className="flex-1" />
            <span className="px-4 py-1.5 rounded bg-rose-500 text-white text-xs font-black">Daily Cash Summary</span>
            <span className="px-4 py-1.5 rounded bg-rose-300 text-rose-900 text-xs font-black flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> ENTRY BLOCKED
            </span>
          </div>

          {/* Two Column Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
            {/* Credit Side */}
            <div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="px-3 py-2 w-28">Bill No.</th>
                    <th className="px-3 py-2">Credit Side (Inflow / Receipts)</th>
                    <th className="px-3 py-2 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                    <td className="px-3 py-2 text-[10px] text-slate-500">[Closing Date: 19-01-2026]</td>
                    <td className="px-3 py-2 font-black text-emerald-700 dark:text-emerald-400">OPENING CASH</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-100">9,810.00</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-sky-700 dark:text-sky-400">SSTM/4572</td>
                    <td className="px-3 py-2 text-sky-700 dark:text-sky-400">Cash Sale - Tyre MOGRIP 1 Qty</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">1,350.00</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-sky-700 dark:text-sky-400">SSTM/5012</td>
                    <td className="px-3 py-2 text-sky-700 dark:text-sky-400">Rajkumar (Split Bill: Cash Component Synced)</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">200.00</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/50 font-black text-emerald-800 dark:text-emerald-300 text-[11px]">
                      EXTERNAL RECEIPT VOUCHER AUTO SYNC
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-sky-700 dark:text-sky-400">RCPT/981</td>
                    <td className="px-3 py-2 text-sky-700 dark:text-sky-400">Synced Cash Receipt (Pop-up Confirmed Yes)</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">35,340.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center justify-between px-3 py-2.5 bg-sky-50 dark:bg-sky-950/30 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100">
                <span>Total Inflow (Credit)</span>
                <span>46,800.00</span>
              </div>
              <div className="m-3 p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
                <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">DIFFRENCE</span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-xl">0.00</span>
              </div>
            </div>

            {/* Debit Side */}
            <div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="px-3 py-2 w-28">Bill No</th>
                    <th className="px-3 py-2">Debit Side (Categorized Outflow)</th>
                    <th className="px-3 py-2 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 bg-orange-100 dark:bg-orange-950/50 font-black text-orange-800 dark:text-orange-300 text-[11px]">
                      1. ENTRIES MADE BY US - EXPENSES
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">PYMT</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Auto Entry-DRAWING EXPENSES</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">2,500.00</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 bg-sky-100 dark:bg-sky-950/50 font-black text-sky-800 dark:text-sky-300 text-[11px]">
                      2. AUTO SYNC BY BANK (Card / QR)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-sky-700 dark:text-sky-400">SSTM/4574</td>
                    <td className="px-3 py-2 text-sky-700 dark:text-sky-400">HDFC Cr A/c (Ref: Card Settlement)</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">420.00</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/50 font-black text-rose-800 dark:text-rose-300 text-[11px]">
                      3. DEBIT AUTO SYNC CREDIT BILLS (Split Track)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-rose-600 dark:text-rose-400">SSTM/5012</td>
                    <td className="px-3 py-2 text-rose-600 dark:text-rose-400">Rajkumar Ledger Trace (Remaining Credit Comp.)</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">800.00</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-950/50 font-black text-purple-800 dark:text-purple-300 text-[11px]">
                      4. EXTERNAL PAYMENT VOUCHER AUTO SYNC
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-purple-600 dark:text-purple-400">PMNT/302</td>
                    <td className="px-3 py-2 text-purple-600 dark:text-purple-400">External Cash Expense (Pop-up Confirmed Yes)</td>
                    <td className="px-3 py-2 text-right font-semibold text-purple-600 dark:text-purple-400">50.00</td>
                  </tr>
                </tbody>
              </table>

              {rojmelShowDetails && (
                <div className="m-3 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-700 text-white text-[11px] font-black">
                    <span>F5 - NOTE DENOMINATIONS (User Limit: 5 Times/Day)</span>
                    <span>Amount</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-slate-700 dark:text-slate-300">500 X 28</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">14,000.00</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-slate-700 dark:text-slate-300">100 X 67</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">6,700.00</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-slate-700 dark:text-slate-300">50 X 8</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">400.00</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs">CASH IN COUNTER</span>
                    <span className="px-4 py-1 rounded bg-emerald-500 text-white font-black text-sm">22,290.00</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-3 py-2.5 bg-sky-50 dark:bg-sky-950/30 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100">
                <span>Total Outflow + Cash Track</span>
                <span>34,320.00</span>
              </div>
              <div className="m-3 p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
                <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">CLOSING CASH</span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-2xl">22,290.00</span>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-900 text-slate-300 text-center text-[11px] font-bold tracking-wide">
            [ F2 - Save ] &nbsp; [ Esc - Quit ] &nbsp; [ F3 - Credit ] &nbsp; [ F4 - Debit ] &nbsp; [ F5 - Denomination ] &nbsp; [ Enter - Open Voucher ]
          </div>
        </div>
      )}

      {/* GSTR-1 SUMMARY */}
      {activeSubTab === 'gstr-1' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-slate-100">GSTR-1 Return Filing Computation Summary</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="font-bold">B2B Sales Invoices</div>
              <div className="text-base font-mono font-black text-emerald-600 mt-1">₹47,618</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="font-bold">B2C Retail Sales</div>
              <div className="text-base font-mono font-black text-teal-600 mt-1">₹8,556</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="font-bold">HSN Code Summary</div>
              <div className="text-base font-mono font-black text-purple-600 mt-1">6 Codes</div>
            </div>
          </div>
        </div>
      )}

      {/* TOOLS - BarCode Generator */}
      {activeSubTab === 'barcode-gen' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-w-lg">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Barcode className="h-5 w-5 text-emerald-500" />
            Barcode Sticker Generator Tool
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold mb-1">Select Item to Print Barcode</label>
              <select className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold">
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Barcode: {p.barcode})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold mb-1">Sticker Width (mm)</label>
                <input type="number" defaultValue={50} className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Copies</label>
                <input type="number" defaultValue={100} className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </div>
            </div>
            <button className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow">
              Generate & Print Barcode Roll
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
