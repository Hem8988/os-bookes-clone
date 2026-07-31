'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Settings, ImagePlus, ImageOff, Trash2 } from 'lucide-react';
import { Product, CategoryMaster, BrandMaster, UnitMaster, BomComponent } from '../lib/types';

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
const PRODUCT_TAG_OPTIONS = ['Fast Moving', 'Slow Moving', 'Seasonal', 'Best Seller', 'Low Stock Priority', 'Discontinued'];

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  productToEdit,
  categories,
  brands,
  units,
  products,
  onClose,
  onSave,
}) => {
  const [productType, setProductType] = useState<'Product' | 'Service'>('Product');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [productCode, setProductCode] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [category, setCategory] = useState('');
  const [gstApplicable, setGstApplicable] = useState(true);
  const [taxRate, setTaxRate] = useState(0);
  const [groupCode, setGroupCode] = useState('');
  const [autoQty, setAutoQty] = useState<number | ''>(0);
  const [openingQty, setOpeningQty] = useState<number | ''>(0);
  const [unit, setUnit] = useState('pcs');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(0);
  const [reorderQty, setReorderQty] = useState<number | ''>(0);
  const [isMoreInfo, setIsMoreInfo] = useState(false);
  const [isRawMaterial, setIsRawMaterial] = useState(false);
  const [isSubItem, setIsSubItem] = useState(false);
  const [image, setImage] = useState<string | undefined>(undefined);
  // HSN inherited from the selected category; this form has no direct HSN field.
  const [defaultHsn, setDefaultHsn] = useState('');

  // More Info fields
  const [size, setSize] = useState('');
  const [colour, setColour] = useState('');
  const [expiryMonth, setExpiryMonth] = useState<number | ''>(0);
  const [location, setLocation] = useState('');
  const [productHindiName, setProductHindiName] = useState('');
  const [description, setDescription] = useState('');
  const [termsAndCondition, setTermsAndCondition] = useState('');
  const [productTags, setProductTags] = useState<string[]>([]);

  // Raw Materials: components this product is built from
  const [rawMaterialComponents, setRawMaterialComponents] = useState<BomComponent[]>([]);
  const [componentProductId, setComponentProductId] = useState('');
  const [componentQty, setComponentQty] = useState<number | ''>(1);

  // Sub Item: this product is a smaller unit broken out of a parent product
  const [parentProductId, setParentProductId] = useState('');
  const [subItemConversionQty, setSubItemConversionQty] = useState<number | ''>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (productToEdit) {
      setProductType(productToEdit.productType || 'Product');
      setName(productToEdit.name || '');
      setActive(productToEdit.active !== undefined ? productToEdit.active : true);
      setProductCode(productToEdit.sku || '');
      setBrand(productToEdit.brand || '');
      setCategory(productToEdit.category || '');
      setCategoryQuery(productToEdit.category || '');
      setGstApplicable(productToEdit.gstApplicable !== undefined ? productToEdit.gstApplicable : true);
      setTaxRate(productToEdit.taxRate || 0);
      setGroupCode(productToEdit.groupCode || '');
      setAutoQty(productToEdit.autoQty ?? 0);
      setOpeningQty(productToEdit.stock ?? 0);
      setUnit(productToEdit.unit || 'pcs');
      setPurchasePrice(productToEdit.purchasePrice ?? 0);
      setReorderQty(productToEdit.minStockAlert ?? 0);
      setIsMoreInfo(!!productToEdit.isMoreInfo);
      setIsRawMaterial(!!productToEdit.isRawMaterial);
      setIsSubItem(!!productToEdit.isSubItem);
      setImage(productToEdit.image);
      setSize(productToEdit.size || '');
      setColour(productToEdit.colour || '');
      setExpiryMonth(productToEdit.expiryMonth ?? 0);
      setLocation(productToEdit.rackLocation || '');
      setProductHindiName(productToEdit.productHindiName || '');
      setDescription(productToEdit.description || '');
      setTermsAndCondition(productToEdit.termsAndCondition || '');
      setProductTags(productToEdit.productTags || []);
      setRawMaterialComponents(productToEdit.rawMaterialComponents || []);
      setParentProductId(productToEdit.parentProductId || '');
      setSubItemConversionQty(productToEdit.subItemConversionQty ?? 1);
    } else {
      setProductType('Product');
      setName('');
      setActive(true);
      setProductCode('');
      setBrand('');
      setCategory('');
      setCategoryQuery('');
      setGstApplicable(true);
      setTaxRate(0);
      setGroupCode('');
      setAutoQty(0);
      setOpeningQty(0);
      setUnit('pcs');
      setPurchasePrice(0);
      setReorderQty(0);
      setIsMoreInfo(false);
      setIsRawMaterial(false);
      setIsSubItem(false);
      setImage(undefined);
      setSize('');
      setColour('');
      setExpiryMonth(0);
      setLocation('');
      setProductHindiName('');
      setDescription('');
      setTermsAndCondition('');
      setProductTags([]);
      setRawMaterialComponents([]);
      setParentProductId('');
      setSubItemConversionQty(1);
    }
    setComponentProductId('');
    setComponentQty(1);
  }, [productToEdit, isOpen]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(categoryQuery.toLowerCase())),
    [categories, categoryQuery]
  );

  if (!isOpen) return null;

  const readImageFile = (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleProductTag = (tag: string) => {
    setProductTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleAddComponent = () => {
    const comp = products.find((p) => p.id === componentProductId);
    if (!comp || !componentQty) return;
    setRawMaterialComponents((prev) => [
      ...prev,
      {
        productId: comp.id,
        productName: comp.name,
        quantity: Number(componentQty),
        unit: comp.unit,
        unitCost: comp.purchasePrice,
      },
    ]);
    setComponentProductId('');
    setComponentQty(1);
  };

  const handleRemoveComponent = (idx: number) => {
    setRawMaterialComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectCategory = (catName: string) => {
    setCategory(catName);
    setCategoryQuery(catName);
    const matched = categories.find((c) => c.name === catName);
    if (matched?.hsnDefault) {
      setDefaultHsn(matched.hsnDefault);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter Product Name');
      return;
    }
    if (!category.trim()) {
      alert('Please select a Category');
      return;
    }

    const savedProduct: Product = {
      id: productToEdit?.id || `prod-${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      brand: brand || undefined,
      sku: productCode.trim() || productToEdit?.sku || `SKU-${Date.now()}`,
      barcode: productToEdit?.barcode,
      hsnCode: productToEdit?.hsnCode || defaultHsn || '',
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: productToEdit?.salePrice ?? (Number(purchasePrice) || 0),
      mrp: productToEdit?.mrp,
      taxRate: gstApplicable ? Number(taxRate) || 0 : 0,
      stock: Number(openingQty) || 0,
      minStockAlert: Number(reorderQty) || 0,
      maxStockLimit: productToEdit?.maxStockLimit,
      batchNumber: productToEdit?.batchNumber,
      expiryDate: productToEdit?.expiryDate,
      groupCode: groupCode.trim() || undefined,
      active,
      gstApplicable,
      autoQty: Number(autoQty) || 0,
      productType,
      isMoreInfo,
      isRawMaterial,
      isSubItem,
      image,
      size: isMoreInfo ? (size.trim() || undefined) : productToEdit?.size,
      colour: isMoreInfo ? (colour.trim() || undefined) : productToEdit?.colour,
      expiryMonth: isMoreInfo ? (Number(expiryMonth) || undefined) : productToEdit?.expiryMonth,
      rackLocation: isMoreInfo ? (location.trim() || undefined) : productToEdit?.rackLocation,
      productHindiName: isMoreInfo ? (productHindiName.trim() || undefined) : productToEdit?.productHindiName,
      description: isMoreInfo ? (description.trim() || undefined) : productToEdit?.description,
      termsAndCondition: isMoreInfo ? (termsAndCondition.trim() || undefined) : productToEdit?.termsAndCondition,
      productTags: isMoreInfo ? productTags : productToEdit?.productTags,
      rawMaterialComponents: isRawMaterial ? rawMaterialComponents : productToEdit?.rawMaterialComponents,
      parentProductId: isSubItem ? (parentProductId || undefined) : productToEdit?.parentProductId,
      parentProductName: isSubItem ? (products.find((p) => p.id === parentProductId)?.name) : productToEdit?.parentProductName,
      subItemConversionQty: isSubItem ? (Number(subItemConversionQty) || undefined) : productToEdit?.subItemConversionQty,
    };

    onSave(savedProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">

        {/* Header Bar */}
        <div className="bg-[#00a8b5] px-5 py-3 flex items-center justify-between text-white shadow-sm">
          <h2 className="text-base font-extrabold tracking-wide">Product Master</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${productType === 'Product' ? 'text-white' : 'text-teal-100/70'}`}>Product</span>
              <ToggleSwitch
                checked={productType === 'Service'}
                onChange={() => setProductType(productType === 'Product' ? 'Service' : 'Product')}
              />
              <span className={`text-xs font-bold ${productType === 'Service' ? 'text-white' : 'text-teal-100/70'}`}>Service</span>
            </div>
            <Settings className="h-4 w-4 text-white/80" />
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-red-200 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5 font-extrabold" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">

          <div className="grid grid-cols-2 gap-5">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Product Name + Active */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-slate-100 text-sm">Product Name</label>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch checked={active} onChange={() => setActive(!active)} />
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">Active</span>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter Product Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold"
                />
              </div>

              {/* Brand Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Brand Name</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Gst */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Gst</label>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch checked={gstApplicable} onChange={() => setGstApplicable(!gstApplicable)} />
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      Applicable : {gstApplicable ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <select
                  value={taxRate}
                  disabled={!gstApplicable}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                >
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>@{rate} %</option>
                  ))}
                </select>
              </div>

              {/* Group Code */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">GROUP CODE</label>
                <input
                  type="text"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Auto Qty */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Auto Qty</label>
                <input
                  type="number"
                  value={autoQty}
                  onChange={(e) => setAutoQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* RIGHT COLUMN - Product Code + Category */}
            <div className="space-y-4 flex flex-col">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Product Code</label>
                <input
                  type="text"
                  placeholder="Auto / Enter Code"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1 flex-1 flex flex-col">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Category</label>
                <div className="relative flex-1 flex flex-col">
                  <input
                    type="text"
                    required
                    placeholder="Search / Select Category"
                    value={categoryQuery}
                    onChange={(e) => {
                      setCategoryQuery(e.target.value);
                      setCategory(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-t border border-b-0 border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none"
                  />
                  <div className="flex-1 min-h-[128px] max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-b bg-white dark:bg-slate-800">
                    {filteredCategories.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 italic p-3 text-center">
                        No Records Found...
                      </div>
                    ) : (
                      filteredCategories.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCategory(c.name)}
                          className={`px-3 py-2 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950/40 font-semibold ${
                            category === c.name ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {c.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opening Qty / Unit / Purchase Price / Reorder Qty */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Opening Qty</label>
              <input
                type="number"
                value={openingQty}
                onChange={(e) => setOpeningQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {units.length === 0 && <option value="pcs">pcs</option>}
                {units.map((u) => (
                  <option key={u.id} value={u.symbol || u.name}>{u.symbol || u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Purchase Price</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Reorder Qty</label>
              <input
                type="number"
                value={reorderQty}
                onChange={(e) => setReorderQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* More Info / Raw Materials / Sub Item */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="flex flex-col items-center gap-1.5">
              <ToggleSwitch checked={isMoreInfo} onChange={() => setIsMoreInfo(!isMoreInfo)} />
              <span className="font-bold text-slate-700 dark:text-slate-300">More Info</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <ToggleSwitch checked={isRawMaterial} onChange={() => setIsRawMaterial(!isRawMaterial)} />
              <span className="font-bold text-slate-700 dark:text-slate-300">Raw Materials</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <ToggleSwitch checked={isSubItem} onChange={() => setIsSubItem(!isSubItem)} />
              <span className="font-bold text-slate-700 dark:text-slate-300">Sub Item</span>
            </div>
          </div>

          {/* More Info Panel */}
          {isMoreInfo && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3 bg-slate-50/60 dark:bg-slate-800/30">
              <div className="grid grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Size</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Colour</label>
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Expiry Month</label>
                  <input
                    type="number"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Product Hindi Name</label>
                  <input
                    type="text"
                    value={productHindiName}
                    onChange={(e) => setProductHindiName(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Terms & Condition</label>
                  <input
                    type="text"
                    value={termsAndCondition}
                    onChange={(e) => setTermsAndCondition(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 block">Product Tags</label>
                  <select
                    multiple
                    value={productTags}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setProductTags(selected);
                    }}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 h-[38px]"
                  >
                    {PRODUCT_TAG_OPTIONS.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  {productTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {productTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-[10px] font-bold cursor-pointer"
                          onClick={() => toggleProductTag(tag)}
                          title="Click to remove"
                        >
                          {tag} ×
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Raw Materials Panel */}
          {isRawMaterial && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-slate-50/60 dark:bg-slate-800/30">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Raw Material Components</label>

              {rawMaterialComponents.length > 0 && (
                <div className="space-y-1">
                  {rawMaterialComponents.map((comp, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {comp.productName} — {comp.quantity} {comp.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(idx)}
                        className="p-1 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                        title="Remove Component"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block">Component Product</label>
                  <select
                    value={componentProductId}
                    onChange={(e) => setComponentProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block">Qty</label>
                  <input
                    type="number"
                    value={componentQty}
                    onChange={(e) => setComponentQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="px-3 py-2 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* Sub Item Panel */}
          {isSubItem && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 grid grid-cols-2 gap-3 bg-slate-50/60 dark:bg-slate-800/30">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Parent Product</label>
                <select
                  value={parentProductId}
                  onChange={(e) => setParentProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Select Parent Product</option>
                  {products.filter((p) => p.id !== productToEdit?.id).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Conversion Qty (per parent unit)</label>
                <input
                  type="number"
                  value={subItemConversionQty}
                  onChange={(e) => setSubItemConversionQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/60 -mx-6 -mb-6 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => readImageFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => (image ? setImage(undefined) : fileInputRef.current?.click())}
              className="p-2.5 rounded bg-slate-600 hover:bg-slate-500 text-white shadow transition-colors cursor-pointer"
              title={image ? 'Remove Image' : 'Upload Product Image'}
            >
              {image ? <ImageOff className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded bg-[#28a745] hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded bg-[#dc3545] hover:bg-red-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
