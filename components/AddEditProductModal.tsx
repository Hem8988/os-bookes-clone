'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Product, CategoryMaster, BrandMaster, UnitMaster, ProductType } from '../lib/types';

// Product master (SRS §6): generic enough for LPG today and oxygen /
// nitrogen / argon later without schema changes.

interface AddEditProductModalProps {
  isOpen: boolean;
  productToEdit?: Product | null;
  categories: CategoryMaster[];
  brands: BrandMaster[];
  units: UnitMaster[];
  products: Product[];
  onClose: () => void;
  onSave: (product: Product) => void;
}

const GST_RATES = [0, 5, 12, 18, 28];
const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'REFILLABLE_CYLINDER', label: 'Refillable cylinder' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'ACCESSORY', label: 'Accessory (regulator, pipe…)' },
];
const GAS_TYPES = ['LPG', 'OXYGEN', 'NITROGEN', 'ARGON', 'CO2', 'OTHER'];

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';

const blank = (): Product => ({
  id: '',
  sku: '',
  name: '',
  category: 'LPG',
  productType: 'REFILLABLE_CYLINDER',
  gasType: 'LPG',
  hsnCode: '27111900',
  unit: 'PCS',
  weightUnit: 'KG',
  purchasePrice: 0,
  salePrice: 0,
  taxRate: 18,
  gstApplicable: true,
  emptyDepositValue: 0,
  stock: 0,
  minStockAlert: 0,
  active: true,
});

// The form is mounted fresh every time the modal opens, so it always starts
// from the product being edited (or a blank one).
export const AddEditProductModal: React.FC<AddEditProductModalProps> = (props) =>
  props.isOpen ? <ProductForm key={props.productToEdit?.id || 'new'} {...props} /> : null;

const ProductForm: React.FC<AddEditProductModalProps> = ({ productToEdit, categories, brands, units, products, onClose, onSave }) => {
  const [form, setForm] = useState<Product>(() => (productToEdit ? { ...blank(), ...productToEdit } : blank()));
  const [error, setError] = useState('');

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setForm((f) => ({ ...f, [key]: value }));
  const categoryNames = Array.from(new Set(['LPG', 'Industrial Gas', 'Accessory', ...categories.map((c) => c.name)]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.sku.trim()) return setError('Product code / SKU is required.');
    if (products.some((p) => p.sku.trim().toLowerCase() === form.sku.trim().toLowerCase() && p.id !== form.id)) return setError('This SKU is already used.');
    if (!(form.salePrice > 0)) return setError('Standard rate must be greater than zero.');
    onSave({ ...form, id: form.id || `prod-${Date.now()}`, name: form.name.trim(), sku: form.sku.trim(), taxRate: form.gstApplicable ? form.taxRate : 0 });
    onClose();
  };

  const num = (key: keyof Product) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, (e.target.value === '' ? 0 : Number(e.target.value)) as never);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-3 bg-teal-700 text-white rounded-t-2xl">
          <h3 className="font-black text-sm">{productToEdit ? `Edit ${productToEdit.name}` : 'New product'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-teal-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto grid sm:grid-cols-2 gap-3 text-xs">
          <L label="Product name *"><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="19 KG Commercial LPG Cylinder" /></L>
          <L label="Hindi name"><input className={input} value={form.productHindiName || ''} onChange={(e) => set('productHindiName', e.target.value)} /></L>
          <L label="Product code / SKU *"><input className={input} value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="LPG-19" /></L>
          <L label="Category">
            <select className={input} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {categoryNames.map((c) => <option key={c}>{c}</option>)}
            </select>
          </L>
          <L label="Product type">
            <select className={input} value={form.productType} onChange={(e) => set('productType', e.target.value as ProductType)}>
              {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </L>
          <L label="Gas">
            <select className={input} value={form.gasType || 'LPG'} onChange={(e) => set('gasType', e.target.value)}>
              {GAS_TYPES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </L>
          <L label="Weight / volume">
            <div className="flex gap-2">
              <input type="number" step="0.1" className={input} value={form.weightVolume ?? ''} onChange={num('weightVolume')} />
              <select className={`${input} w-24`} value={form.weightUnit || 'KG'} onChange={(e) => set('weightUnit', e.target.value)}>
                {['KG', 'M3', 'L'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </L>
          <L label="Brand / oil company">
            <input className={input} list="brand-options" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} placeholder="Indane / HP / Bharat…" />
            <datalist id="brand-options">{brands.map((b) => <option key={b.id} value={b.name} />)}</datalist>
          </L>
          <L label="Standard rate ₹ (GST incl.) *"><input type="number" step="0.01" className={input} value={form.salePrice || ''} onChange={num('salePrice')} /></L>
          <L label="Purchase price ₹"><input type="number" step="0.01" className={input} value={form.purchasePrice || ''} onChange={num('purchasePrice')} /></L>
          <L label="GST %">
            <div className="flex items-center gap-2">
              <select className={input} value={form.taxRate} disabled={!form.gstApplicable} onChange={(e) => set('taxRate', Number(e.target.value))}>
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
              <label className="flex items-center gap-1 whitespace-nowrap font-bold"><input type="checkbox" checked={form.gstApplicable !== false} onChange={(e) => set('gstApplicable', e.target.checked)} /> GST</label>
            </div>
          </L>
          <L label="HSN code"><input className={input} value={form.hsnCode} onChange={(e) => set('hsnCode', e.target.value)} /></L>
          <L label="Empty cylinder deposit ₹"><input type="number" className={input} value={form.emptyDepositValue || ''} onChange={num('emptyDepositValue')} /></L>
          <L label="Low-stock alert (full cylinders in godown)"><input type="number" className={input} value={form.minStockAlert || ''} onChange={num('minStockAlert')} /></L>
          <L label="Unit">
            <select className={input} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
              {Array.from(new Set(['PCS', ...units.map((u) => u.code)])).map((u) => <option key={u}>{u}</option>)}
            </select>
          </L>
          <L label="Barcode"><input className={input} value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} /></L>
          <L label="Description" wide><input className={input} value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></L>
          <label className="flex items-center gap-2 font-bold sm:col-span-2">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => set('active', e.target.checked)} /> Active (inactive products are hidden from WhatsApp and new orders)
          </label>
          <p className="sm:col-span-2 text-[11px] text-slate-500">Stock is not typed here — it comes from plant receipts, transfers and deliveries in Inventory.</p>
          {error && <div className="sm:col-span-2 p-2 rounded-lg bg-rose-50 text-rose-700 font-bold">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 font-bold text-xs">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs">Save product</button>
        </div>
      </form>
    </div>
  );
};

const L = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <label className={`block space-y-1 ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="font-bold text-slate-600">{label}</span>
    {children}
  </label>
);
