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
  UserCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  Receipt,
  Scale,
  Lock,
  Check,
  Truck,
  Package
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
  const [rojmelDate, setRojmelDate] = useState('2026-08-26');
  const [rojmelShowDetails, setRojmelShowDetails] = useState(true);

  // 1. Account Summary sub-items
  const accountSummaryTabs = [
    { id: 'cust-outstanding', label: 'Customer Outstanding' },
    { id: 'collection-report', label: 'Collection Report' },
    { id: 'cylinder-balance-report', label: 'Cylinder Holding Report' },
    { id: 'stock-summary', label: 'Cylinder Stock Summary' },
    { id: 'sale-summary', label: 'Sales Summary' },
    { id: 'delivery-performance', label: 'Delivery Performance' },
    { id: 'cash-bank-summary', label: 'Cash & Bank Summary' },
    { id: 'daybook-summary', label: 'Day Book Summary' },
  ];

  // 2. Inventory Summary sub-items
  const inventorySummaryTabs = [
    { id: 'brand-sale', label: 'Categorywise Sale' },
    { id: 'item-sale', label: 'Itemwise Sale' },
    { id: 'invoices-report', label: 'Invoices Report' },
  ];

  // 3. Final Accounts sub-items
  const finalAccountsTabs = [
    { id: 'pnl-acc', label: 'Profit & Loss Account' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'rojmel', label: 'Daily Cash / Rojmel' },
  ];

  // 4. GSTR's Summary sub-items
  const gstrTabs = [
    { id: 'gstr-1', label: 'GSTR-1 (Outward Supplies)' },
    { id: 'gstr-3b', label: 'GSTR-3B Summary' },
    { id: 'hsn-wise', label: 'HSN-WISE Summary' },
  ];

  // 5. Tools sub-items
  const toolsTabs = [
    { id: 'price-update', label: 'Stock Price Update' },
    { id: 'stock-corr', label: 'Stock Correction' },
    { id: 'hard-refresh', label: 'Hard Refresh Local Data' },
  ];

  const totalReceivables = customers.filter(c => c.balance > 0).reduce((acc, c) => acc + c.balance, 0);

  const handleExportSummary = () => {
    let filename = `Report_${activeSubTab}_${new Date().toISOString().split('T')[0]}.csv`;
    let csv = `OS-BOOKS B2B ERP - Report: ${activeSubTab.toUpperCase()}\n`;
    csv += `Generated On: ${new Date().toLocaleString()}\n\n`;

    if (activeSubTab === 'cust-outstanding') {
      csv += 'Customer Name,GSTIN,Phone,Credit Limit,Outstanding Balance\n';
      customers.filter(c => c.balance > 0).forEach(c => {
        csv += `"${c.name}","${c.gstin || 'URP'}","${c.phone}",${c.creditLimit},${c.balance}\n`;
      });
    } else if (activeSubTab === 'cylinder-balance-report') {
      csv += 'Customer Site,Commercial 19KG Holding,Industrial 47.5KG Holding,Domestic 14.2KG Holding,Total Holding\n';
      customers.forEach(c => {
        csv += `"${c.name}",10,4,0,14\n`;
      });
    } else {
      csv += 'Item Name,Category,HSN Code,Selling Rate,Stock Balance\n';
      products.forEach(p => {
        csv += `"${p.name}","${p.category}","${p.hsnCode}",${p.salePrice},${p.stock}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    alert(`🎉 EXPORT SUCCESSFUL!\nReport "${activeSubTab}" saved to Excel CSV.`);
  };

  if (activeSubTab === 'price-update') {
    return (
      <StockPriceUpdateModule 
        products={products} 
        onUpdateProduct={onUpdateProduct}
        onClose={() => setActiveSubTab('cust-outstanding')} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            Financial Reports, Cylinder Inventories & Analytics Suite
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account Summaries, Collection Reports, Cylinder Holding Balances, P&L, Balance Sheet & GST Reports
          </p>
        </div>

        <button 
          onClick={handleExportSummary}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export Summary (Excel / CSV)</span>
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
                else if (c.id === 'tools-hub') setActiveSubTab('price-update');
              }}
              className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer transition ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'inventory-summary' && inventorySummaryTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer transition ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'final-accounts' && finalAccountsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer transition ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'gstr-summary' && gstrTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer transition ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}

        {activeCat === 'tools-hub' && toolsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer transition ${
              activeSubTab === t.id ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* VIEW RENDERING FOR SUB-TABS */}

      {/* 1. CUSTOMER OUTSTANDING REPORT */}
      {activeSubTab === 'cust-outstanding' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Customer Outstanding Balance Report</h3>
            <div className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">Total Outstanding: ₹{totalReceivables.toLocaleString('en-IN')}</div>
          </div>
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase">
              <tr>
                <th className="px-3.5 py-2.5">Customer Name</th>
                <th className="px-3.5 py-2.5">GSTIN</th>
                <th className="px-3.5 py-2.5">Phone</th>
                <th className="px-3.5 py-2.5">Credit Limit</th>
                <th className="px-3.5 py-2.5">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {customers.filter(c => c.balance > 0).map(c => (
                <tr key={c.id}>
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-slate-400">{c.gstin || 'URP'}</td>
                  <td className="px-3.5 py-2.5">{c.phone}</td>
                  <td className="px-3.5 py-2.5 font-mono">₹{c.creditLimit.toLocaleString('en-IN')}</td>
                  <td className="px-3.5 py-2.5 font-mono font-black text-rose-600 dark:text-rose-400">₹{c.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. COLLECTION REPORT */}
      {activeSubTab === 'collection-report' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Daily Driver & Counter Cash Collection Report</h3>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">Today Collections: ₹49,000</div>
          </div>
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase">
              <tr>
                <th className="px-3.5 py-2.5">Collector Name</th>
                <th className="px-3.5 py-2.5">Date</th>
                <th className="px-3.5 py-2.5">Payment Mode</th>
                <th className="px-3.5 py-2.5">Ref / Voucher #</th>
                <th className="px-3.5 py-2.5">Amount Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100">Ramesh Kumar (Delivery Boy)</td>
                <td className="px-3.5 py-2.5 font-mono">2026-08-26</td>
                <td className="px-3.5 py-2.5 font-bold text-emerald-600">UPI Online</td>
                <td className="px-3.5 py-2.5 font-mono font-bold">UPI-2026-981240</td>
                <td className="px-3.5 py-2.5 font-mono font-black text-emerald-600">₹18,500</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100">Ramesh Kumar (Delivery Boy)</td>
                <td className="px-3.5 py-2.5 font-mono">2026-08-26</td>
                <td className="px-3.5 py-2.5 font-bold text-blue-600">Cash Deposit</td>
                <td className="px-3.5 py-2.5 font-mono font-bold">CS-881924</td>
                <td className="px-3.5 py-2.5 font-mono font-black text-slate-900 dark:text-white">₹12,000</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100">Counter Office Accountant</td>
                <td className="px-3.5 py-2.5 font-mono">2026-08-26</td>
                <td className="px-3.5 py-2.5 font-bold text-purple-600">Cheque HDFC</td>
                <td className="px-3.5 py-2.5 font-mono font-bold">CHQ-000412</td>
                <td className="px-3.5 py-2.5 font-mono font-black text-purple-600">₹18,500</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 3. CYLINDER HOLDING REPORT */}
      {activeSubTab === 'cylinder-balance-report' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Customer Site Cylinder Holding & Balance Report</h3>
            <div className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">Active Site Holding: 82 Cylinders</div>
          </div>
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase">
              <tr>
                <th className="px-3.5 py-2.5">Customer Site</th>
                <th className="px-3.5 py-2.5">19 KG Full Holding</th>
                <th className="px-3.5 py-2.5">19 KG Empty Due</th>
                <th className="px-3.5 py-2.5">47.5 KG Industrial Holding</th>
                <th className="px-3.5 py-2.5">Total Holding Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono font-bold">
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="px-3.5 py-2.5 font-sans font-extrabold text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="px-3.5 py-2.5 text-emerald-600">10 Pcs</td>
                  <td className="px-3.5 py-2.5 text-amber-600">10 Pcs</td>
                  <td className="px-3.5 py-2.5 text-purple-600">4 Pcs</td>
                  <td className="px-3.5 py-2.5 font-black text-slate-900 dark:text-white">14 Pcs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. STOCK SUMMARY */}
      {activeSubTab === 'stock-summary' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Live LPG Cylinder Stock Summary</h3>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">Catalog Items: {products.length}</div>
          </div>
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase">
              <tr>
                <th className="px-3.5 py-2.5">Cylinder Item</th>
                <th className="px-3.5 py-2.5">Category</th>
                <th className="px-3.5 py-2.5">HSN Code</th>
                <th className="px-3.5 py-2.5">Selling Price</th>
                <th className="px-3.5 py-2.5">Available Stock Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {products.map(p => (
                <tr key={p.id}>
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-3.5 py-2.5 font-semibold">{p.category}</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-slate-400">{p.hsnCode}</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-600">₹{p.salePrice.toLocaleString('en-IN')}</td>
                  <td className="px-3.5 py-2.5 font-mono font-black text-slate-900 dark:text-white text-sm">{p.stock} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. DELIVERY PERFORMANCE */}
      {activeSubTab === 'delivery-performance' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Delivery Boy Fleet Performance Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 font-bold uppercase">Active Driver</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">Ramesh Kumar</div>
              <div className="text-xs text-emerald-500 font-bold mt-2">100% On-Time Delivery Rate</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 font-bold uppercase">Completed Dispatches Today</div>
              <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">12 Orders</div>
              <div className="text-xs text-slate-400 mt-1">120 Full Cylinders Delivered</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 font-bold uppercase">Cash Collected & Submitted</div>
              <div className="text-2xl font-mono font-black text-blue-600 dark:text-blue-400 mt-1">₹30,500</div>
              <div className="text-xs text-emerald-500 font-bold mt-1">Verified by Accountant</div>
            </div>
          </div>
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

    </div>
  );
};
