'use client';

import React, { useState, useEffect } from 'react';
import { Package, Search, RefreshCw, Plus, X, Check, FileText, ArrowRightLeft, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

export default function CylinderBalanceModule() {
  const [activeSubTab, setActiveSubTab] = useState<'customer' | 'plant' | 'defective' | 'voucher'>('customer');
  const [balances, setBalances] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([
    { id: 'v_1', voucherNumber: 'SV-2026-0089', voucherType: 'SV', customerName: 'Hotel Rajdhani (Connaught Place)', cylinderQty: 10, regulatorQty: 2, depositAmount: 25000, issueDate: '2026-06-15', status: 'ACTIVE' },
    { id: 'v_2', voucherNumber: 'SV-2026-0104', voucherType: 'SV', customerName: 'Apex Industrial Fabrics (Okhla)', cylinderQty: 20, regulatorQty: 4, depositAmount: 50000, issueDate: '2026-07-01', status: 'ACTIVE' },
    { id: 'v_3', voucherNumber: 'TV-2026-0012', voucherType: 'TV', customerName: 'Standard Bakers (Karol Bagh)', cylinderQty: 5, regulatorQty: 1, depositAmount: 12500, issueDate: '2026-08-10', status: 'ACTIVE' },
  ]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for Entry / Adjust
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [productName, setProductName] = useState('19 KG Commercial LPG Cylinder');
  const [emptyBalance, setEmptyBalance] = useState('10');
  const [fullBalance, setFullBalance] = useState('5');
  const [defectiveQty, setDefectiveQty] = useState('0');
  const [inTransitRefillQty, setInTransitRefillQty] = useState('0');
  const [saving, setSaving] = useState(false);

  // Customer Ledger Detail Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Manual Stock Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjCustomerId, setAdjCustomerId] = useState('');
  const [adjCustomerName, setAdjCustomerName] = useState('');
  const [adjFullQty, setAdjFullQty] = useState('0');
  const [adjEmptyQty, setAdjEmptyQty] = useState('0');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Stock Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<'WAREHOUSE_TO_DRIVER' | 'DRIVER_TO_DRIVER' | 'DRIVER_TO_WAREHOUSE'>('WAREHOUSE_TO_DRIVER');
  const [fromLocation, setFromLocation] = useState('Godown 1 (Central Warehouse)');
  const [toLocation, setToLocation] = useState('Ramesh Kumar (Delivery Boy)');
  const [transferFullQty, setTransferFullQty] = useState('10');
  const [transferEmptyQty, setTransferEmptyQty] = useState('0');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

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

  const handleOpenLedger = async (cust: any) => {
    setIsLedgerModalOpen(true);
    setLedgerLoading(true);
    const targetCustId = cust.customerId || cust.id || 'cust_demo_1';
    try {
      const res = await fetch(`/api/cylinder/ledger?customerId=${targetCustId}`);
      const json = await res.json();
      if (json.success) {
        setLedgerData(json.data);
      } else {
        // Fallback demo ledger data
        setLedgerData({
          customerName: cust.customer?.name || cust.customerName || 'Hotel Rajdhani',
          kpis: {
            openingBalance: cust.openingQty || 10,
            deliveredFull: cust.currentFullBalance || 15,
            emptyReceived: cust.currentEmptyBalance || 10,
            adjustments: cust.adjustmentQty || 0,
            currentBalance: (cust.openingQty || 10) + (cust.currentFullBalance || 15) - (cust.currentEmptyBalance || 10),
          },
          transactions: [
            {
              id: 'tx_1',
              date: '2026-08-20',
              reference: 'CYL-DEL-00001',
              transactionType: 'DRIVER_TO_CUSTOMER',
              productName: cust.productName || '19 KG Commercial LPG Cylinder',
              fullQty: 10,
              emptyQty: 0,
              adjustmentQty: 0,
              runningBalance: 20,
              performedBy: 'Ramesh Kumar (Fleet)',
              reason: 'Scheduled refill delivery',
            },
            {
              id: 'tx_2',
              date: '2026-08-21',
              reference: 'CYL-DEL-00001',
              transactionType: 'CUSTOMER_EMPTY_RETURN',
              productName: cust.productName || '19 KG Commercial LPG Cylinder',
              fullQty: 0,
              emptyQty: 10,
              adjustmentQty: 0,
              runningBalance: 10,
              performedBy: 'Ramesh Kumar (Fleet)',
              reason: 'Empty cylinder pickup',
            },
          ],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleOpenAdjustment = (cust: any) => {
    setAdjCustomerId(cust.customerId || cust.id || 'cust_demo_1');
    setAdjCustomerName(cust.customer?.name || cust.customerName || 'Hotel Rajdhani');
    setAdjFullQty(String(cust.currentFullBalance || 0));
    setAdjEmptyQty(String(cust.currentEmptyBalance || 0));
    setAdjReason('');
    setIsAdjustmentModalOpen(true);
  };

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
          defectiveQty: Number(defectiveQty),
          inTransitRefillQty: Number(inTransitRefillQty),
          actionType: activeSubTab === 'plant' ? 'PLANT_REFILL' : activeSubTab === 'defective' ? 'DEFECTIVE_RETURN' : 'SET_STOCK',
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ Cylinder Inventory Record Saved Successfully!');
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

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      alert('⚠️ Mandatory Reason is required for audit adjustment.');
      return;
    }
    setAdjSubmitting(true);
    try {
      const res = await fetch('/api/cylinder/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'STOCK_ADJUSTMENT',
          referenceId: `ADJ-${Date.now()}`,
          requestedBy: 'Store Manager',
          assignedTo: 'MANAGER',
          payload: {
            customerId: adjCustomerId,
            customerName: adjCustomerName,
            productId: 'prod_19kg',
            productName,
            currentFullBalance: Number(adjFullQty),
            currentEmptyBalance: Number(adjEmptyQty),
            adjustmentQty: Number(adjFullQty) - Number(adjEmptyQty),
            reason: adjReason,
          },
          notes: `Stock Adjustment Request for ${adjCustomerName}: Reason: ${adjReason}`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ Stock Adjustment Request submitted to Manager Approval Queue!');
        setIsAdjustmentModalOpen(false);
        fetchBalances();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Failed to submit adjustment: ' + err.message);
    } finally {
      setAdjSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSubmitting(true);
    try {
      const res = await fetch('/api/cylinder/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferType,
          fromLocationType: transferType === 'WAREHOUSE_TO_DRIVER' ? 'WAREHOUSE' : 'DELIVERY_BOY',
          fromLocationId: fromLocation,
          toLocationType: transferType === 'DRIVER_TO_WAREHOUSE' ? 'WAREHOUSE' : 'DELIVERY_BOY',
          toLocationId: toLocation,
          notes: transferNotes,
          performedBy: 'Store Manager',
          items: [
            {
              productId: 'prod_19kg',
              productName,
              fullQty: Number(transferFullQty),
              emptyQty: Number(transferEmptyQty),
            },
          ],
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ Stock Transfer submitted to Manager Approval Queue!');
        setIsTransferModalOpen(false);
        fetchBalances();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Failed to submit transfer: ' + err.message);
    } finally {
      setTransferSubmitting(false);
    }
  };

  const filtered = balances.filter(b =>
    (b.customer?.name || b.customerName || b.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.productName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEmpty = balances.reduce((sum, b) => sum + (b.currentEmptyBalance || 0), 0);
  const totalFull = balances.reduce((sum, b) => sum + (b.currentFullBalance || 0), 0);
  const totalDefective = balances.reduce((sum, b) => sum + (b.defectiveQty || 0), 0);
  const totalInTransit = balances.reduce((sum, b) => sum + (b.inTransitRefillQty || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Sub-tab Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-emerald-600" /> Three-Tier Cylinder Inventory ERP
          </h1>
          <p className="text-sm text-slate-500">Warehouse Godown → Delivery Boy Fleet → Customer Site Inventory Ledger</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-bold shadow-md text-xs md:text-sm"
          >
            <ArrowRightLeft className="w-4 h-4" /> Stock Transfer
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold shadow-md text-xs md:text-sm"
          >
            <Plus className="w-4 h-4" /> Entry / Stock Adjust
          </button>
          <button
            onClick={fetchBalances}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition font-semibold text-xs md:text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-900 p-1.5 rounded-xl text-xs md:text-sm font-bold">
        <button
          onClick={() => setActiveSubTab('customer')}
          className={`flex-1 py-2 rounded-lg transition ${activeSubTab === 'customer' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📦 Customer Stock ({balances.length})
        </button>
        <button
          onClick={() => setActiveSubTab('plant')}
          className={`flex-1 py-2 rounded-lg transition ${activeSubTab === 'plant' ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          🏭 Bottling Plant Refill ({totalInTransit} Pcs)
        </button>
        <button
          onClick={() => setActiveSubTab('defective')}
          className={`flex-1 py-2 rounded-lg transition ${activeSubTab === 'defective' ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          ⚠️ Defective / Testing ({totalDefective} Pcs)
        </button>
        <button
          onClick={() => setActiveSubTab('voucher')}
          className={`flex-1 py-2 rounded-lg transition ${activeSubTab === 'voucher' ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📜 SV / TV Deposit Vouchers ({vouchers.length})
        </button>
      </div>

      {/* Three-Tier KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Tier 1: Central Warehouse Stock</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">150 Pcs</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Tier 2: Delivery Boy Fleet Stock</div>
          <div className="text-3xl font-bold text-sky-600 mt-2">35 Pcs</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Tier 3: Customer Site Full Stock</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{totalFull} Pcs</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Customer Site Empty Returned</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{totalEmpty} Pcs</div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Customer or Cylinder..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeSubTab === 'voucher' ? (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs text-slate-500 border-b">
                <tr>
                  <th className="px-6 py-3">Voucher #</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Customer Name</th>
                  <th className="px-6 py-3 text-center">Cylinders (SV/TV)</th>
                  <th className="px-6 py-3 text-center">Regulators</th>
                  <th className="px-6 py-3 text-right">Security Deposit</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white font-mono">{v.voucherNumber}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-xs font-extrabold rounded ${v.voucherType === 'SV' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{v.customerName}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-100">{v.cylinderQty} Pcs</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-100">{v.regulatorQty} Pcs</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">₹{v.depositAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-slate-500">{v.issueDate}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs text-slate-500 border-b">
                <tr>
                  <th className="px-6 py-3">Customer Name</th>
                  <th className="px-6 py-3">Cylinder Product</th>
                  <th className="px-6 py-3 text-center">Opening Stock</th>
                  <th className="px-6 py-3 text-center">Empty Cylinders</th>
                  <th className="px-6 py-3 text-center">Full Cylinders</th>
                  <th className="px-6 py-3 text-center">Current Balance</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map(b => {
                  const opening = b.openingQty || 10;
                  const full = b.currentFullBalance || 0;
                  const empty = b.currentEmptyBalance || 0;
                  const adj = b.adjustmentQty || 0;
                  const currentBalance = opening + full - empty + adj;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {b.customer?.name || b.customerName || 'Hotel Rajdhani'}
                      </td>
                      <td className="px-6 py-4">{b.productName}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500">{opening} Pcs</td>
                      <td className="px-6 py-4 text-center font-bold text-amber-600">{empty} Pcs</td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-600">{full} Pcs</td>
                      <td className="px-6 py-4 text-center font-extrabold text-indigo-600">{currentBalance} Pcs</td>
                      <td className="px-6 py-4 text-center space-x-2">
                        <button
                          onClick={() => handleOpenLedger(b)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded border border-indigo-200 transition inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> Ledger
                        </button>
                        <button
                          onClick={() => handleOpenAdjustment(b)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded border border-amber-200 transition inline-flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CUSTOMER CYLINDER LEDGER DETAIL MODAL */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" /> Customer Cylinder Ledger History
                </h3>
                <p className="text-xs text-slate-500">{ledgerData?.customerName || 'Account Ledger'}</p>
              </div>
              <button onClick={() => setIsLedgerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="p-8 text-center text-slate-400">Loading Customer Cylinder Ledger...</div>
            ) : ledgerData ? (
              <div className="space-y-4">
                {/* Summary KPI Bar */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Opening</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-200">{ledgerData.kpis.openingBalance} Pcs</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Delivered Full</div>
                    <div className="font-extrabold text-emerald-600">+{ledgerData.kpis.deliveredFull} Pcs</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Empty Recd</div>
                    <div className="font-extrabold text-amber-600">-{ledgerData.kpis.emptyReceived} Pcs</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Adjustments</div>
                    <div className="font-extrabold text-purple-600">{ledgerData.kpis.adjustments} Pcs</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Current Balance</div>
                    <div className="font-black text-indigo-600">{ledgerData.kpis.currentBalance} Pcs</div>
                  </div>
                </div>

                {/* Chronological Transaction Table */}
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-900 uppercase font-bold text-slate-500 border-b">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-center">Full Qty</th>
                        <th className="px-3 py-2 text-center">Empty Qty</th>
                        <th className="px-3 py-2 text-center">Running Balance</th>
                        <th className="px-3 py-2">Performed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ledgerData.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-3 py-2.5 font-semibold">{t.date}</td>
                          <td className="px-3 py-2.5 font-mono text-indigo-600 font-bold">{t.reference}</td>
                          <td className="px-3 py-2.5 font-bold uppercase">{t.transactionType}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">+{t.fullQty}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-amber-600">-{t.emptyQty}</td>
                          <td className="px-3 py-2.5 text-center font-black text-indigo-600">{t.runningBalance} Pcs</td>
                          <td className="px-3 py-2.5 text-slate-400">{t.performedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MANUAL ADJUSTMENT MODAL */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" /> Request Manual Stock Adjustment
              </h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Customer Account</label>
                <input type="text" value={adjCustomerName} disabled className="w-full px-3 py-2 border rounded-lg bg-slate-100 font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Adjusted Full Stock</label>
                  <input
                    type="number"
                    value={adjFullQty}
                    onChange={e => setAdjFullQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Adjusted Empty Stock</label>
                  <input
                    type="number"
                    value={adjEmptyQty}
                    onChange={e => setAdjEmptyQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-amber-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Mandatory Reason / Audit Note *</label>
                <textarea
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  placeholder="e.g. Physical stock count audit correction after damaged seal inspection..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsAdjustmentModalOpen(false)} className="px-3 py-2 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow"
                >
                  {adjSubmitting ? 'Submitting...' : 'Submit to Manager Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-600" /> Stock Transfer Request
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Transfer Route Type</label>
                <select
                  value={transferType}
                  onChange={e => setTransferType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                >
                  <option value="WAREHOUSE_TO_DRIVER">Warehouse $\to$ Delivery Boy</option>
                  <option value="DRIVER_TO_DRIVER">Delivery Boy $\to$ Delivery Boy</option>
                  <option value="DRIVER_TO_WAREHOUSE">Delivery Boy $\to$ Warehouse</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">From Location</label>
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={e => setFromLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">To Location</label>
                  <input
                    type="text"
                    value={toLocation}
                    onChange={e => setToLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Full Cylinders Qty</label>
                  <input
                    type="number"
                    value={transferFullQty}
                    onChange={e => setTransferFullQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Empty Cylinders Qty</label>
                  <input
                    type="number"
                    value={transferEmptyQty}
                    onChange={e => setTransferEmptyQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-amber-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Transfer Notes</label>
                <textarea
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="Notes for Manager approval..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-3 py-2 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow"
                >
                  {transferSubmitting ? 'Submitting...' : 'Submit to Manager Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENTRY / STOCK ADJUSTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" /> Add / Set Cylinder Stock Entry
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Customer Account</label>
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
                <label className="block font-bold uppercase text-slate-500 mb-1">Cylinder Product</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Empty Cylinders (At Site)</label>
                  <input
                    type="number"
                    value={emptyBalance}
                    onChange={e => setEmptyBalance(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-amber-600 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Full Cylinders (Delivered)</label>
                  <input
                    type="number"
                    value={fullBalance}
                    onChange={e => setFullBalance(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Defective Stock</label>
                  <input
                    type="number"
                    value={defectiveQty}
                    onChange={e => setDefectiveQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-rose-600"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Plant Refills In-Transit</label>
                  <input
                    type="number"
                    value={inTransitRefillQty}
                    onChange={e => setInTransitRefillQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-sky-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
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
                  <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Stock Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
