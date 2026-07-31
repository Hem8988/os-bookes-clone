'use client';

import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import { Product } from '../lib/types';

interface EnterSalePriceModalProps {
  isOpen: boolean;
  product: Product | null;
  purchasePriceInclGst: number;
  onCancel: () => void;
  onConfirm: (salePrice: number, wholesalePrice: number) => void;
}

export const EnterSalePriceModal: React.FC<EnterSalePriceModalProps> = ({
  isOpen,
  product,
  purchasePriceInclGst,
  onCancel,
  onConfirm,
}) => {
  const [salePrice, setSalePrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);

  React.useEffect(() => {
    if (isOpen && product) {
      setSalePrice(product.salePrice || 0);
      setWholesalePrice(product.salePrice || 0);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enter Sale Price</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Update sale and wholesale prices</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-600 text-white text-xs font-bold">
            <Package className="h-3.5 w-3.5" /> {product.sku}
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Product</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">{product.name}</div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-[80px_1fr_1fr] gap-0 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-sm">
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">Unit</div>
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
              Purchase <span className="font-normal text-xs text-slate-500">(included GST)</span>
            </div>
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">Sale Price</div>

            <div className="px-3 py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center bg-slate-50 dark:bg-slate-800/60">{product.unit}</div>
            <div className="px-3 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center">
              {purchasePriceInclGst.toFixed(2)}
            </div>
            <div className="px-2 py-2">
              <input
                type="number"
                autoFocus
                min={0}
                value={salePrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                className="w-full py-2 px-2 rounded-lg bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Wholesale Price</label>
            <input
              type="number"
              min={0}
              value={wholesalePrice}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            type="button"
            onClick={() => onConfirm(salePrice, wholesalePrice)}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
