'use client';

import React, { useState } from 'react';
import { Product } from '../lib/types';
import { Search, Filter, X, Save, Download, SlidersHorizontal, Check } from 'lucide-react';

interface StockPriceUpdateModuleProps {
  products: Product[];
  onUpdateProduct?: (product: Product) => void;
  onClose: () => void;
}

export const StockPriceUpdateModule: React.FC<StockPriceUpdateModuleProps> = ({
  products,
  onUpdateProduct,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewModified, setViewModified] = useState(false);
  const [modifiedProducts, setModifiedProducts] = useState<Record<string, Partial<Product>>>({});
  
  // Bulk Modal States
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkField, setBulkField] = useState<keyof Product>('mrp');
  const [bulkOperation, setBulkOperation] = useState<'increase' | 'decrease' | 'set'>('increase');
  const [bulkType, setBulkType] = useState<'percentage' | 'fixed'>('percentage');
  const [bulkValue, setBulkValue] = useState<string>('');

  const handlePriceChange = (productId: string, field: keyof Product, value: string) => {
    const numValue = parseFloat(value) || 0;
    setModifiedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: numValue
      }
    }));
  };

  const handleSave = () => {
    if (!onUpdateProduct) return;
    
    Object.keys(modifiedProducts).forEach(productId => {
      const original = products.find(p => p.id === productId);
      if (original) {
        const changes = modifiedProducts[productId];
        onUpdateProduct({ ...original, ...changes });
      }
    });
    
    setModifiedProducts({});
  };

  const handleApplyBulkPriceUpdate = () => {
    const valueNum = parseFloat(bulkValue);
    if (isNaN(valueNum)) return;
    
    const newMods = { ...modifiedProducts };
    
    filteredProducts.forEach(p => {
      const currentMod = newMods[p.id] || {};
      // Get the effective current value
      const currentValue = currentMod[bulkField] !== undefined 
        ? currentMod[bulkField] 
        : (p[bulkField] as number || 0);
      
      let newValue = currentValue;
      
      if (bulkOperation === 'set') {
        newValue = valueNum;
      } else {
        const changeAmount = bulkType === 'percentage' 
          ? (newValue * (valueNum / 100)) 
          : valueNum;
          
        if (bulkOperation === 'increase') {
          newValue += changeAmount;
        } else if (bulkOperation === 'decrease') {
          newValue -= changeAmount;
        }
      }
      
      newMods[p.id] = {
        ...currentMod,
        [bulkField]: Math.round(newValue * 100) / 100
      };
    });
    
    setModifiedProducts(newMods);
    setShowBulkPriceModal(false);
    setBulkValue('');
  };

  const handleExport = () => {
    const headers = ['Product Name', 'Barcode', 'Category', 'HSN', 'GST (%)', 'Purchase Price', 'Qty', 'Total Value', 'MRP', 'Credit Sale', 'Cash Sale', 'Whole Sale'];
    
    const csvRows = filteredProducts.map(p => {
      const mod = modifiedProducts[p.id] || {};
      const purchasePrice = mod.purchasePrice !== undefined ? mod.purchasePrice : (p.purchasePrice || 0);
      const mrp = mod.mrp !== undefined ? mod.mrp : (p.mrp || 0);
      const salePrice = mod.salePrice !== undefined ? mod.salePrice : (p.salePrice || 0);
      const wholesalePrice = mod.wholesalePrice !== undefined ? mod.wholesalePrice : (p.wholesalePrice || 0);
      const value = (p.stock || 0) * purchasePrice;
      
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.barcode || p.sku || ''}"`,
        `"${p.category || ''}"`,
        `"${p.hsnCode || ''}"`,
        p.taxRate || 0,
        purchasePrice,
        p.stock || 0,
        value.toFixed(2),
        mrp,
        salePrice,
        salePrice, // Assuming Cash Sale is same as Credit Sale here
        wholesalePrice
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_price_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modifiedCount = Object.keys(modifiedProducts).length;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModified = viewModified ? modifiedProducts[p.id] !== undefined : true;
    return matchesSearch && matchesModified;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 relative">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#21a6a6] text-white shadow-md">
        <h2 className="text-[17px] font-semibold tracking-wide">Stock Price Update</h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span>View All</span>
            <button 
              onClick={() => setViewModified(!viewModified)}
              className={`w-9 h-4 rounded-full relative transition-colors ${viewModified ? 'bg-emerald-300' : 'bg-[#1b8c8c]'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${viewModified ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-white/80">View Modified</span>
          </div>

          <button 
            onClick={() => setShowBulkPriceModal(true)}
            className="px-4 py-1.5 bg-[#758494] hover:bg-slate-500 text-white text-xs font-bold rounded shadow-sm"
          >
            Bulk Price Update
          </button>
          
          <button 
            onClick={() => setShowBulkPriceModal(true)}
            className="px-4 py-1.5 bg-[#ffba00] hover:bg-amber-400 text-slate-900 text-xs font-black rounded shadow-sm"
          >
            Bulk Update
          </button>
          
          <button 
            onClick={handleExport}
            className="px-4 py-1.5 bg-[#ffba00] hover:bg-amber-400 text-slate-900 text-xs font-black rounded shadow-sm flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          
          <button onClick={onClose} className="p-1.5 bg-[#f44336] hover:bg-rose-400 text-white rounded shadow-sm">
            <X className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col gap-0.5 w-64">
          <label className="text-[11px] font-bold text-slate-800 dark:text-slate-300">Select Branch</label>
          <select className="p-1.5 text-xs font-semibold rounded bg-[#bce0f0] border border-sky-300 text-slate-800 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300">
            <option>MANHERIAL</option>
            <option>HEAD OFFICE</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-0.5 flex-1">
          <label className="text-[11px] font-bold text-slate-800 dark:text-slate-300">Search Product</label>
          <div className="flex items-center rounded border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 h-8">
            <div className="px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sky-500 flex items-center justify-center">
              <Filter className="h-3.5 w-3.5" />
            </div>
            <select className="h-full px-2 text-xs font-semibold border-r border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 w-40 outline-none">
              <option>Product Name</option>
              <option>Barcode</option>
            </select>
            <input 
              type="text"
              placeholder="Search for Product Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-full px-3 text-xs font-semibold bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-0.5 w-48 mt-4">
           <select className="p-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <option>Show All</option>
            <option>Active Only</option>
          </select>
        </div>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f4f7] dark:bg-slate-950">
        {filteredProducts.map((p, idx) => {
          const mod = modifiedProducts[p.id] || {};
          const purchasePrice = mod.purchasePrice !== undefined ? mod.purchasePrice : (p.purchasePrice || 0);
          const mrp = mod.mrp !== undefined ? mod.mrp : (p.mrp || 0);
          const salePrice = mod.salePrice !== undefined ? mod.salePrice : (p.salePrice || 0);
          const wholesalePrice = mod.wholesalePrice !== undefined ? mod.wholesalePrice : (p.wholesalePrice || 0);
          
          return (
            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-2 relative transition-colors hover:border-emerald-300 dark:hover:border-emerald-700/50">
              {/* Top Row: Title and Stats */}
              <div className="flex justify-between items-start pr-32">
                <div>
                  <h4 className="font-bold text-[13px] text-slate-900 dark:text-slate-100">
                    #{idx + 1}. {p.barcode || p.id.substring(0, 8)} - {p.name} - <span className="text-[#32a852] font-black tracking-tight">{p.category?.toUpperCase() || 'TIPPER MINING - BIAS'}</span>
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    <span className="text-[#419be0]">HSN: {p.hsnCode || '40112090'}</span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-slate-500 dark:text-slate-400">GST: {p.taxRate || 18}</span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-slate-500 dark:text-slate-400">Branches: MANHERIAL</span>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-3 right-3 flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Purchase Price : 
                <div className="relative">
                  <input 
                    type="number" 
                    value={purchasePrice}
                    onChange={(e) => handlePriceChange(p.id, 'purchasePrice', e.target.value)}
                    className="w-10 px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-center font-mono"
                  />
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>Qty: 0</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>value: 0</span>
              </div>
              
              {/* Bottom Row: Inputs */}
              <div className="flex items-center justify-end gap-3 mt-1">
                <div className="relative rounded border border-[#d2d9df] dark:border-slate-700 px-2 pb-1 pt-2 w-36 bg-white dark:bg-slate-900">
                  <span className="absolute -top-2 left-2 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-slate-700 dark:text-slate-400">MRP</span>
                  <input 
                    type="number" 
                    value={mrp}
                    onChange={(e) => handlePriceChange(p.id, 'mrp', e.target.value)}
                    className="w-full text-right bg-transparent outline-none text-xs font-mono text-slate-800 dark:text-slate-200" 
                  />
                </div>
                
                <div className="relative rounded border border-[#d2d9df] dark:border-slate-700 px-2 pb-1 pt-2 w-36 bg-white dark:bg-slate-900">
                  <span className="absolute -top-2 left-2 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-slate-700 dark:text-slate-400">Credit Sale</span>
                  <input 
                    type="number" 
                    value={salePrice}
                    onChange={(e) => handlePriceChange(p.id, 'salePrice', e.target.value)}
                    className="w-full text-right bg-transparent outline-none text-xs font-mono text-slate-800 dark:text-slate-200" 
                  />
                </div>
                
                <div className="relative rounded border border-[#d2d9df] dark:border-slate-700 px-2 pb-1 pt-2 w-36 bg-white dark:bg-slate-900">
                  <span className="absolute -top-2 left-2 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-slate-700 dark:text-slate-400">Cash Sale</span>
                  <input 
                    type="number" 
                    value={salePrice}
                    onChange={(e) => handlePriceChange(p.id, 'salePrice', e.target.value)}
                    className="w-full text-right bg-transparent outline-none text-xs font-mono text-slate-800 dark:text-slate-200" 
                  />
                </div>

                <div className="relative rounded border border-[#d2d9df] dark:border-slate-700 px-2 pb-1 pt-2 w-36 bg-white dark:bg-slate-900">
                  <span className="absolute -top-2 left-2 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-slate-700 dark:text-slate-400">Whole Sale</span>
                  <input 
                    type="number" 
                    value={wholesalePrice}
                    onChange={(e) => handlePriceChange(p.id, 'wholesalePrice', e.target.value)}
                    className="w-full text-right bg-transparent outline-none text-xs font-mono text-slate-800 dark:text-slate-200" 
                  />
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Filter className="h-12 w-12 text-slate-300 mb-3" />
            <p className="font-semibold">No products found.</p>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#33424d] text-white">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-[#ffba00] hover:bg-amber-400 text-slate-900 text-xs font-black rounded flex items-center gap-1.5">
            <span className="text-sm leading-none">★</span> Rate Now
          </button>
          <button className="px-4 py-1.5 bg-[#5e7081] hover:bg-slate-400 text-white text-xs font-bold rounded">
            Help
          </button>
        </div>
        
        <div className="text-[13px] font-bold tracking-wider text-white absolute left-1/2 -translate-x-1/2">
          TOTAL ITEMS : {filteredProducts.length.toLocaleString()}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            disabled={modifiedCount === 0}
            className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${
              modifiedCount > 0 
                ? 'bg-[#3b9c51] hover:bg-emerald-500 text-white cursor-pointer' 
                : 'bg-[#3b9c51]/80 text-white/80 cursor-not-allowed'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Save Modified ({modifiedCount})
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-[#e43f3f] hover:bg-rose-500 text-white text-xs font-bold rounded flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
        </div>
      </div>

      {/* Bulk Price Update Modal */}
      {showBulkPriceModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Bulk Price Update</h3>
              <button onClick={() => setShowBulkPriceModal(false)} className="text-slate-400 hover:text-rose-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Field to Update</label>
                <select 
                  value={bulkField}
                  onChange={(e) => setBulkField(e.target.value as any)}
                  className="w-full p-2 text-sm rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="mrp">MRP</option>
                  <option value="purchasePrice">Purchase Price</option>
                  <option value="salePrice">Sale Price (Credit & Cash)</option>
                  <option value="wholesalePrice">Wholesale Price</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operation</label>
                  <select 
                    value={bulkOperation}
                    onChange={(e) => setBulkOperation(e.target.value as any)}
                    className="w-full p-2 text-sm rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none"
                  >
                    <option value="increase">Increase by</option>
                    <option value="decrease">Decrease by</option>
                    <option value="set">Set to exactly</option>
                  </select>
                </div>
                
                {bulkOperation !== 'set' && (
                  <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Type</label>
                    <select 
                      value={bulkType}
                      onChange={(e) => setBulkType(e.target.value as any)}
                      className="w-full p-2 text-sm rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Value {bulkOperation !== 'set' ? (bulkType === 'percentage' ? '(%)' : '(₹)') : '(₹)'}
                </label>
                <input 
                  type="number"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full p-2 text-sm rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none font-mono"
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  This will apply the change to <span className="font-bold">{filteredProducts.length}</span> currently filtered products. Changes are not saved to the database until you click "Save Modified".
                </p>
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800">
              <button 
                onClick={() => setShowBulkPriceModal(false)}
                className="px-4 py-2 text-sm font-semibold rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleApplyBulkPriceUpdate}
                disabled={!bulkValue || isNaN(parseFloat(bulkValue))}
                className="px-4 py-2 text-sm font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
