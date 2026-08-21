'use client';
import React, { useState, useEffect } from 'react';
import { Package, Search, RefreshCw, Plus, X, Check } from 'lucide-react';

export default function CylinderBalanceModule() {
  const [balances, setBalances] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [productName, setProductName] = useState('19 KG Commercial LPG Cylinder');
  const [emptyBalance, setEmptyBalance] = useState('10');
  const [fullBalance, setFullBalance] = useState('5');
  const [saving, setSaving] = useState(false);

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

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/cylinder/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || 'cust_demo_1',
          productName,
          currentEmptyBalance: Number(emptyBalance),
          currentFullBalance: Number(fullBalance),
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ Cylinder Stock Added / Updated Successfully!');
        setIsModalOpen(false);
        fetchBalances();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Failed to save stock: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

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
            <Package className="w-7 h-7 text-indigo-600" /> Customer Cylinder Inventory Ledger
          </h1>
          <p className="text-sm text-slate-500">Track & Add live empty and full cylinder balances</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold shadow-md"
          >
            <Plus className="w-5 h-5" /> + Add / Set Cylinder Stock
          </button>
          <button 
            onClick={fetchBalances}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
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
          <div className="text-sm font-medium text-slate-500">Active Tracked Accounts</div>
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
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{b.customer?.name || b.customerName || 'Hotel Rajdhani'}</td>
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

      {/* Modal for Adding / Setting Cylinder Stock */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" /> Add / Set Customer Cylinder Stock
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cust_demo_1">Hotel Rajdhani (Connaught Place)</option>
                  <option value="cust_demo_2">Apex Industrial Fabrics (Okhla)</option>
                  <option value="cust_demo_3">Standard Bakers (Karol Bagh)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Cylinder Product</label>
                <select
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="19 KG Commercial LPG Cylinder">19 KG Commercial LPG Cylinder</option>
                  <option value="47.5 KG Industrial LPG Cylinder">47.5 KG Industrial LPG Cylinder</option>
                  <option value="Medical Oxygen Cylinder">Medical Oxygen Cylinder</option>
                  <option value="Nitrogen Gas Cylinder">Nitrogen Gas Cylinder</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Empty Cylinders (At Site)</label>
                  <input
                    type="number"
                    value={emptyBalance}
                    onChange={e => setEmptyBalance(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-amber-600 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Cylinders (In Hand)</label>
                  <input
                    type="number"
                    value={fullBalance}
                    onChange={e => setFullBalance(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
