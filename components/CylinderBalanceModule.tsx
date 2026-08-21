'use client';
import React, { useState, useEffect } from 'react';
import { Package, Search, RefreshCw, AlertTriangle } from 'lucide-react';

export default function CylinderBalanceModule() {
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cylinder/inventory');
      const json = await res.json();
      if (json.success && json.data) {
        setBalances(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const filtered = balances.filter(b => 
    (b.customer?.name || b.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.productName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEmpty = balances.reduce((sum, b) => sum + (b.currentEmptyBalance || 0), 0);
  const totalFull = balances.reduce((sum, b) => sum + (b.currentFullBalance || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" /> Customer Cylinder Inventory Ledger (100% Dynamic DB)
          </h1>
          <p className="text-sm text-slate-500">Live Database records of empty and full cylinder balances</p>
        </div>
        <button 
          onClick={fetchBalances}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Live DB
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Empty Cylinders (At Customer Sites)</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{totalEmpty} Pcs</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Full Cylinders (Delivered / Unused)</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{totalFull} Pcs</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Active Tracked Customers</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{balances.length} Accounts</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Customer or Cylinder..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs text-slate-500 border-b">
              <tr>
                <th className="px-6 py-3">Customer Name</th>
                <th className="px-6 py-3">Cylinder Product</th>
                <th className="px-6 py-3 text-center">Empty Cylinders</th>
                <th className="px-6 py-3 text-center">Full Cylinders</th>
                <th className="px-6 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{b.customer?.name || 'Customer'}</td>
                  <td className="px-6 py-4">{b.productName}</td>
                  <td className="px-6 py-4 text-center font-bold text-amber-600">{b.currentEmptyBalance} Pcs</td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-600">{b.currentFullBalance} Pcs</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(b.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
