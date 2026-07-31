'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Edit3, Trash2 } from 'lucide-react';
import { Product } from '../lib/types';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-slate-900 dark:text-slate-50 font-black rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
};

interface ProductSearchDropdownProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
}

export const ProductSearchDropdown: React.FC<ProductSearchDropdownProps> = ({
  products,
  selectedProductId,
  onSelect,
  placeholder = 'Enter Product Name',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const filteredProducts = useMemo(() => {
    if (!query || !isOpen) return products;
    const lowerQuery = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.sku && p.sku.toLowerCase().includes(lowerQuery)) ||
        (p.barcode && p.barcode.includes(query))
    );
  }, [products, query, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        onSelect(filteredProducts[0].id);
        setQuery(filteredProducts[0].name);
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative flex-1 min-w-[260px]">
      <input
        type="text"
        value={isOpen ? query : selectedProduct?.name || ''}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full py-1.5 px-2 rounded bg-teal-50 dark:bg-slate-900 border border-teal-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute z-30 top-full mt-1 left-0 w-[550px] max-h-[500px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-b-lg">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No exact match found.</div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelect(p.id);
                    setQuery(p.name);
                    setIsOpen(false);
                  }}
                  className={`p-2 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors ${selectedProductId === p.id ? 'bg-sky-100 dark:bg-sky-900/40' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {highlightMatch(p.name, query)} <span className="text-slate-500 ml-1">Qty : {p.autoQty || 1}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                        {p.stock} {p.unit}
                      </span>
                      <div className="flex items-center gap-1">
                        <Edit3 className="h-3.5 w-3.5 text-teal-600 hover:text-teal-500" />
                        <Trash2 className="h-3.5 w-3.5 text-rose-600 hover:text-rose-500" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <span>Product Code : {p.sku}</span>
                    <span className="text-rose-600">MRP : {p.mrp?.toFixed(2) || '0.00'}</span>
                    <span className="text-emerald-600">PRICE : {p.salePrice?.toFixed(2) || '0.00'}</span>
                    <span className="text-slate-500">W-PRICE : {p.wholesalePrice?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
