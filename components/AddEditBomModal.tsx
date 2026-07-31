'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Package, Pencil, GripVertical, Plus, RefreshCw, Save, Printer } from 'lucide-react';
import { BomMaster, BomComponent, Product } from '../lib/types';

interface AddEditBomModalProps {
  isOpen: boolean;
  bomToEdit?: BomMaster | null;
  products: Product[];
  onClose: () => void;
  onSave: (bom: BomMaster) => void;
}

const ProductThumb: React.FC<{ image?: string; className?: string }> = ({ image, className }) => {
  if (image) {
    return <img src={image} alt="" className={`object-cover rounded-md border border-slate-200 dark:border-slate-700 ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 ${className}`}>
      <Package className="h-4 w-4" />
    </div>
  );
};

const ProductSearchSelect: React.FC<{
  products: Product[];
  value: string;
  onSelect: (productId: string) => void;
}> = ({ products, value, onSelect }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    setQuery(selected ? selected.name : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? products.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      )
    : products;

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        placeholder="Enter Product Name"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          if (selected && v !== selected.name) {
            onSelect('');
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {open && (
        <div className="absolute z-10 mt-1 min-w-full w-max max-w-[26rem] max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">No matching products</div>
          ) : (
            matches.slice(0, 50).map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p.id);
                  setQuery(p.name);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <ProductThumb image={p.image} className="h-7 w-7 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-normal break-words">{p.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">Code: {p.sku}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const AddEditBomModal: React.FC<AddEditBomModalProps> = ({
  isOpen,
  bomToEdit,
  products,
  onClose,
  onSave,
}) => {
  const [bomName, setBomName] = useState('');
  const [bomCode, setBomCode] = useState('');
  const [active, setActive] = useState(true);
  const [components, setComponents] = useState<BomComponent[]>([]);
  const [laborCost, setLaborCost] = useState('0');
  const [remark, setRemark] = useState('');
  const [lastSavedTotal, setLastSavedTotal] = useState(0);

  const [draftProductId, setDraftProductId] = useState('');
  const [draftQty, setDraftQty] = useState('1');
  const [draftUnit, setDraftUnit] = useState('PCS');
  const [draftMrp, setDraftMrp] = useState('0');
  const [draftSalePrice, setDraftSalePrice] = useState('0');
  const [draftWholesale, setDraftWholesale] = useState('0');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [draftCustomValues, setDraftCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (bomToEdit) {
      setBomName(bomToEdit.finishedGoodName || '');
      setBomCode(bomToEdit.bomCode || '');
      setActive(bomToEdit.active ?? true);
      setComponents(bomToEdit.components || []);
      setLaborCost(String(bomToEdit.laborCost ?? 0));
      setRemark(bomToEdit.remark || '');
      setLastSavedTotal(bomToEdit.totalCost ?? 0);
      const cols = new Set<string>();
      (bomToEdit.components || []).forEach((c) => {
        Object.keys(c.customValues || {}).forEach((k) => cols.add(k));
      });
      setCustomColumns(Array.from(cols));
    } else {
      setBomName('');
      setBomCode('');
      setActive(true);
      setComponents([]);
      setLaborCost('0');
      setRemark('');
      setLastSavedTotal(0);
      setCustomColumns([]);
    }
    setDraftProductId('');
    setDraftQty('1');
    setDraftUnit('PCS');
    setDraftMrp('0');
    setDraftSalePrice('0');
    setDraftWholesale('0');
    setDraftCustomValues({});
    setEditingIndex(null);
    setIsAddingColumn(false);
    setNewColumnName('');
  }, [bomToEdit, isOpen]);

  const handleAddColumnConfirm = () => {
    const name = newColumnName.trim();
    if (!name) {
      setIsAddingColumn(false);
      return;
    }
    if (!customColumns.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setCustomColumns((prev) => [...prev, name]);
    }
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleRemoveColumn = (col: string) => {
    setCustomColumns((prev) => prev.filter((c) => c !== col));
    setDraftCustomValues((prev) => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  };

  if (!isOpen) return null;

  const draftProduct = products.find((p) => p.id === draftProductId);
  const draftAmount = (parseFloat(draftQty) || 0) * (parseFloat(draftSalePrice) || 0);

  const handleProductSelect = (productId: string) => {
    setDraftProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setDraftUnit(prod.unit || 'PCS');
      setDraftMrp(String(prod.mrp ?? prod.salePrice ?? 0));
      setDraftSalePrice(String(prod.salePrice ?? 0));
      setDraftWholesale(String(prod.salePrice ?? 0));
      if (components.length === 0 && !bomName.trim()) {
        setBomName(`${prod.name} - ${prod.sku}`);
      }
      if (components.length === 0 && !bomCode.trim()) {
        setBomCode(prod.sku);
      }
    }
  };

  const resetDraft = () => {
    setDraftProductId('');
    setDraftQty('1');
    setDraftUnit('PCS');
    setDraftMrp('0');
    setDraftSalePrice('0');
    setDraftWholesale('0');
    setDraftCustomValues({});
    setEditingIndex(null);
  };

  const handleAddComponent = () => {
    if (!draftProduct) {
      alert('Please select a Product');
      return;
    }
    const qty = parseFloat(draftQty) || 0;
    if (qty <= 0) {
      alert('Please enter a valid Quantity');
      return;
    }

    const customValues: Record<string, number> = {};
    customColumns.forEach((col) => {
      customValues[col] = parseFloat(draftCustomValues[col]) || 0;
    });

    const newComponent: BomComponent = {
      productId: draftProduct.id,
      productName: draftProduct.name,
      productCode: draftProduct.sku,
      quantity: qty,
      unit: draftUnit || draftProduct.unit,
      unitCost: parseFloat(draftSalePrice) || draftProduct.salePrice,
      mrp: parseFloat(draftMrp) || 0,
      salePrice: parseFloat(draftSalePrice) || 0,
      wholesalePrice: parseFloat(draftWholesale) || 0,
      image: draftProduct.image,
      customValues,
    };

    if (editingIndex !== null) {
      setComponents((prev) => prev.map((c, i) => (i === editingIndex ? newComponent : c)));
    } else {
      setComponents((prev) => [...prev, newComponent]);
      if (components.length === 0 && !bomName.trim()) {
        setBomName(`${draftProduct.name} - ${draftProduct.sku}`);
      }
      if (components.length === 0 && !bomCode.trim()) {
        setBomCode(draftProduct.sku);
      }
    }
    resetDraft();
  };

  const handleEditComponent = (idx: number) => {
    const comp = components[idx];
    setDraftProductId(comp.productId);
    setDraftQty(String(comp.quantity));
    setDraftUnit(comp.unit);
    setDraftMrp(String(comp.mrp ?? 0));
    setDraftSalePrice(String(comp.salePrice ?? comp.unitCost));
    setDraftWholesale(String(comp.wholesalePrice ?? 0));
    const values: Record<string, string> = {};
    customColumns.forEach((col) => {
      values[col] = String(comp.customValues?.[col] ?? 0);
    });
    setDraftCustomValues(values);
    setEditingIndex(idx);
  };

  const handleInlineCustomValueChange = (idx: number, col: string, value: string) => {
    setComponents((prev) =>
      prev.map((c, i) =>
        i === idx
          ? { ...c, customValues: { ...c.customValues, [col]: parseFloat(value) || 0 } }
          : c
      )
    );
  };

  const handleRemoveComponent = (idx: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      resetDraft();
    }
  };

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (idx: number) => {
    setComponents((prev) => {
      if (draggedIndex === null || draggedIndex === idx) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(idx, 0, moved);
      return updated;
    });
    setDraggedIndex(null);
  };

  const handleResetForm = () => {
    setBomName('');
    setBomCode('');
    setActive(true);
    setComponents([]);
    setLaborCost('0');
    setRemark('');
    setCustomColumns([]);
    resetDraft();
  };

  const totals = {
    totalQty: components.reduce((sum, c) => sum + c.quantity, 0),
    totalMrp: components.reduce((sum, c) => sum + (c.mrp ?? 0), 0),
    componentsCost: components.reduce((sum, c) => sum + c.quantity * (c.salePrice ?? c.unitCost), 0),
    totalWholesale: components.reduce((sum, c) => sum + (c.wholesalePrice ?? 0), 0),
  };
  const grandTotal = totals.componentsCost + (parseFloat(laborCost) || 0);

  const handleSave = () => {
    if (!bomName.trim()) {
      alert('Please enter BOM Name');
      return;
    }
    if (components.length === 0) {
      alert('Please add at least one Product to the BOM');
      return;
    }

    const saved: BomMaster = {
      id: bomToEdit?.id || `bom-${Date.now()}`,
      finishedGoodId: bomToEdit?.finishedGoodId || `prod-bom-${Date.now()}`,
      finishedGoodName: bomName.trim(),
      bomCode: bomCode.trim() || bomToEdit?.bomCode || `BOM-${Date.now().toString().slice(-6)}`,
      components,
      laborCost: parseFloat(laborCost) || 0,
      totalCost: grandTotal,
      active,
      remark,
    };

    onSave(saved);
    setLastSavedTotal(grandTotal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col animate-in fade-in duration-200 overflow-hidden">

      {/* Teal Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-teal-600 dark:bg-teal-800 shrink-0">
        <h2 className="text-base font-bold text-white">{bomToEdit ? 'Edit BOM Master' : 'BOM Master'}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <span className={!active ? 'text-white' : 'text-teal-200'}>Inactive</span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((prev) => !prev)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                active ? 'bg-emerald-400' : 'bg-teal-900/60'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  active ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={active ? 'text-white' : 'text-teal-200'}>Active</span>
          </div>
          <button type="button" title="Reset Form" onClick={handleResetForm} className="p-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-900 shadow">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" title="Close" onClick={onClose} className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* BOM Name / BOM Code Row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">BOM Name</label>
              <input
                type="text"
                required
                placeholder="Enter BOM Name"
                value={bomName}
                onChange={(e) => setBomName(e.target.value)}
                className="w-full py-2 px-3 rounded-lg bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="text-xs font-bold text-emerald-600">
              Components Added : {components.length}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">BOM Code :</label>
              <input
                type="text"
                placeholder="Auto-filled from first Product Code"
                value={bomCode}
                onChange={(e) => setBomCode(e.target.value)}
                className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Add Column control */}
        <div className="flex items-center justify-end gap-2 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
          {isAddingColumn ? (
            <>
              <input
                type="text"
                autoFocus
                placeholder="Column name (e.g. Landing Cost)"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddColumnConfirm();
                  } else if (e.key === 'Escape') {
                    setIsAddingColumn(false);
                    setNewColumnName('');
                  }
                }}
                className="px-2 py-1 text-xs rounded-md bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={handleAddColumnConfirm}
                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setIsAddingColumn(false); setNewColumnName(''); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Column
            </button>
          )}
        </div>

        {/* Line Item Entry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[900px]">
            <thead className="bg-slate-900 text-white font-bold">
              <tr>
                <th className="px-2 py-2.5 w-8"></th>
                <th className="px-2 py-2.5 w-14 text-center">S.NO.#</th>
                <th className="px-2 py-2.5">Product Name</th>
                <th className="px-2 py-2.5 w-28">Qty / Unit</th>
                <th className="px-2 py-2.5 w-24">MRP</th>
                <th className="px-2 py-2.5 w-24">Sale Price</th>
                <th className="px-2 py-2.5 w-24">Wholesale</th>
                {customColumns.map((col) => (
                  <th key={col} className="px-2 py-2.5 w-24">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{col}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(col)}
                        className="text-slate-400 hover:text-red-400 cursor-pointer shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2.5 w-28">Amount</th>
                <th className="px-2 py-2.5 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr className="bg-sky-50/60 dark:bg-slate-800/40">
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2 text-center font-bold text-slate-500">
                  {editingIndex !== null ? editingIndex + 1 : components.length + 1}
                </td>
                <td className="px-2 py-2 min-w-0">
                  <ProductSearchSelect products={products} value={draftProductId} onSelect={handleProductSelect} />
                </td>
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={draftQty}
                      onChange={(e) => setDraftQty(e.target.value)}
                      className="w-14 py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center"
                    />
                    <select
                      value={draftUnit}
                      onChange={(e) => setDraftUnit(e.target.value)}
                      className="flex-1 py-1.5 px-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs cursor-pointer"
                    >
                      <option value="PCS">PCS</option>
                      <option value="PKT">PKT</option>
                      <option value="BOX">BOX</option>
                      <option value="KG">KG</option>
                      <option value="LTR">LTR</option>
                      <option value="MTR">MTR</option>
                      <option value="SET">SET</option>
                    </select>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draftMrp}
                    onChange={(e) => setDraftMrp(e.target.value)}
                    className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-right"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draftSalePrice}
                    onChange={(e) => setDraftSalePrice(e.target.value)}
                    className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-right"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draftWholesale}
                    onChange={(e) => setDraftWholesale(e.target.value)}
                    className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-right"
                  />
                </td>
                {customColumns.map((col) => (
                  <td key={col} className="px-2 py-2">
                    <input
                      type="number"
                      step="any"
                      value={draftCustomValues[col] ?? ''}
                      onChange={(e) => setDraftCustomValues((prev) => ({ ...prev, [col]: e.target.value }))}
                      className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-right"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 font-mono font-black text-right">
                  ₹{draftAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={handleAddComponent}
                      title={editingIndex !== null ? 'Update Item' : 'Add Item'}
                      className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    {editingIndex !== null && (
                      <button
                        type="button"
                        onClick={resetDraft}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>

              {components.map((comp, idx) => (
                <tr
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    editingIndex === idx ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                  } ${draggedIndex === idx ? 'opacity-40' : ''}`}
                >
                  <td className="px-2 py-2.5 text-center text-slate-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-3.5 w-3.5 inline" />
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <ProductThumb image={comp.image} className="h-7 w-7 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate">{comp.productName}</div>
                        {comp.productCode && (
                          <div className="text-[10px] font-mono text-slate-400 truncate">Code: {comp.productCode}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold">{comp.quantity} {comp.unit}</td>
                  <td className="px-2 py-2.5 text-right font-mono">₹{(comp.mrp ?? 0).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-2.5 text-right font-mono">₹{(comp.salePrice ?? comp.unitCost).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-2.5 text-right font-mono">₹{(comp.wholesalePrice ?? 0).toLocaleString('en-IN')}</td>
                  {customColumns.map((col) => (
                    <td key={col} className="px-2 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={comp.customValues?.[col] ?? 0}
                        onChange={(e) => handleInlineCustomValueChange(idx, col, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full text-right px-1.5 py-1 text-xs font-mono rounded border border-transparent bg-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right font-mono font-black">
                    ₹{(comp.quantity * (comp.salePrice ?? comp.unitCost)).toLocaleString('en-IN')}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEditComponent(idx)} className="p-1.5 rounded bg-amber-500 hover:bg-amber-400 text-white cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleRemoveComponent(idx)} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {components.length === 0 && (
                <tr>
                  <td colSpan={9 + customColumns.length} className="px-3 py-6 text-center text-sm text-slate-400">
                    No products added
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Stats + Remark + Labor Cost */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-[10px] font-bold text-slate-500">Total Qty</div>
                <div className="font-black text-slate-900 dark:text-slate-100">{totals.totalQty}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-[10px] font-bold text-slate-500">Total MRP</div>
                <div className="font-black text-slate-900 dark:text-slate-100">₹{totals.totalMrp.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-[10px] font-bold text-slate-500">Components Cost</div>
                <div className="font-black text-emerald-600">₹{totals.componentsCost.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-[10px] font-bold text-slate-500">Total Wholesale</div>
                <div className="font-black text-slate-900 dark:text-slate-100">₹{totals.totalWholesale.toLocaleString('en-IN')}</div>
              </div>
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

          <div className="min-w-[220px] space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Components Cost:</label>
              <input
                type="text"
                readOnly
                value={`₹${totals.componentsCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black text-right text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Labor Cost</label>
              <input
                type="number"
                min={0}
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-right text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Grand Total</label>
              <input
                type="text"
                readOnly
                value={`₹${grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-black text-right text-emerald-700 dark:text-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white shrink-0">
        <div className="text-xs font-bold text-slate-300">
          Last BOM Total: <span className="text-emerald-400 font-mono">₹{lastSavedTotal.toLocaleString('en-IN')}</span>
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
