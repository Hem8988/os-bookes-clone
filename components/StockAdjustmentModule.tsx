'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, X, Printer, Save } from 'lucide-react';
import { Product, StockAdjustment } from '../lib/types';

interface StockAdjustmentModuleProps {
  products: Product[];
  adjustments: StockAdjustment[];
  adjustmentToEdit?: StockAdjustment | null;
  onAddAdjustment: (adj: StockAdjustment) => void;
  onUpdateAdjustment?: (adj: StockAdjustment) => void;
  onUpdateProduct: (product: Product) => void;
  onClose: () => void;
}

const REASONS: StockAdjustment['reason'][] = [
  'Physical Stock Count',
  'Damage/Breakage',
  'Sample Giveaway',
  'Expired Batch',
];

export const StockAdjustmentModule: React.FC<StockAdjustmentModuleProps> = ({
  products,
  adjustments,
  adjustmentToEdit,
  onAddAdjustment,
  onUpdateAdjustment,
  onUpdateProduct,
  onClose,
}) => {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [adjustCodeSearch, setAdjustCodeSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustment['adjustmentType']>('Addition (+)');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<StockAdjustment['reason']>('Physical Stock Count');
  const [approvedBy, setApprovedBy] = useState('Shiv Kumar (Admin)');
  const [remark, setRemark] = useState('');
  const [lastSavedQty, setLastSavedQty] = useState(0);

  useEffect(() => {
    if (adjustmentToEdit) {
      const matched = products.find((p) => p.id === adjustmentToEdit.productId) || products.find((p) => p.name === adjustmentToEdit.productName);
      if (matched) setProductId(matched.id);
      setAdjustCodeSearch(adjustmentToEdit.adjustCode);
      setDate(adjustmentToEdit.date);
      setAdjustmentType(adjustmentToEdit.adjustmentType);
      setQty(adjustmentToEdit.qty);
      setReason(adjustmentToEdit.reason);
      setApprovedBy(adjustmentToEdit.approvedBy);
      setRemark(adjustmentToEdit.remark || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustmentToEdit]);

  const product = products.find((p) => p.id === productId);

  const handleSearchAdjustment = () => {
    const match = adjustments.find(
      (adj) => adj.adjustCode.toLowerCase() === adjustCodeSearch.trim().toLowerCase()
    );
    if (!match) {
      if (adjustCodeSearch.trim()) alert('No Stock Adjustment found with that Audit #.');
      return;
    }
    const matched = products.find((p) => p.id === match.productId) || products.find((p) => p.name === match.productName);
    if (matched) setProductId(matched.id);
    setDate(match.date);
    setAdjustmentType(match.adjustmentType);
    setQty(match.qty);
    setReason(match.reason);
    setApprovedBy(match.approvedBy);
    setRemark(match.remark || '');
    setLastSavedQty(match.qty);
  };

  const handleResetForm = () => {
    setProductId(products[0]?.id || '');
    setAdjustCodeSearch('');
    setDate(new Date().toISOString().split('T')[0]);
    setAdjustmentType('Addition (+)');
    setQty(1);
    setReason('Physical Stock Count');
    setApprovedBy('Shiv Kumar (Admin)');
    setRemark('');
  };

  const handleSave = () => {
    if (!product) {
      alert('Please select a Product');
      return;
    }
    if (qty <= 0) {
      alert('Please enter a valid Quantity');
      return;
    }

    const adj: StockAdjustment = {
      id: adjustmentToEdit?.id || `adj-${Date.now()}`,
      adjustCode: adjustmentToEdit?.adjustCode || `ADJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      date,
      productId: product.id,
      productName: product.name,
      adjustmentType,
      qty,
      reason,
      approvedBy: approvedBy.trim() || 'Shiv Kumar (Admin)',
      remark,
    };

    // Reverse the previous adjustment's stock effect when editing, then apply the new one
    const prevDelta = adjustmentToEdit
      ? (adjustmentToEdit.adjustmentType === 'Addition (+)' ? -adjustmentToEdit.qty : adjustmentToEdit.qty)
      : 0;
    const newDelta = adjustmentType === 'Addition (+)' ? qty : -qty;
    onUpdateProduct({ ...product, stock: Math.max(0, product.stock + prevDelta + newDelta) });

    if (adjustmentToEdit) {
      if (onUpdateAdjustment) onUpdateAdjustment(adj);
      onClose();
    } else {
      onAddAdjustment(adj);
      setLastSavedQty(adj.qty);
      handleResetForm();
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-w-3xl">
      {/* Teal Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-teal-600 dark:bg-teal-800">
        <h2 className="text-base font-bold text-white">{adjustmentToEdit ? 'Edit Stock Adjustment' : 'Stock Adjustment'}</h2>
        <div className="flex items-center gap-3">
          <button type="button" title="Reset Form" onClick={handleResetForm} className="p-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-900 shadow">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" title="Close" onClick={onClose} className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full py-2 px-3 rounded-lg bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.stock} {p.unit})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Audit # :</label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={adjustCodeSearch}
                onChange={(e) => setAdjustCodeSearch(e.target.value)}
                placeholder="Search existing audit number"
                className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button type="button" title="Load Stock Adjustment" onClick={handleSearchAdjustment} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shrink-0">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Date :</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Addition (+)', 'Deduction (-)'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAdjustmentType(t)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    adjustmentType === t
                      ? t === 'Addition (+)'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-sm font-bold text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StockAdjustment['reason'])}
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Approved By</label>
          <input
            type="text"
            value={approvedBy}
            onChange={(e) => setApprovedBy(e.target.value)}
            className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Remark</label>
          <textarea
            rows={2}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Enter Remark"
            className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white">
        <div className="text-xs font-bold text-slate-300">
          Last Adjustment Qty: <span className="text-emerald-400 font-mono">{lastSavedQty}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow">
            <Save className="h-4 w-4" /> Save
          </button>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow">
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>
    </div>
  );
};
