'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ImageOff } from 'lucide-react';
import { CategoryMaster } from '../lib/types';

interface AddEditCategoryModalProps {
  isOpen: boolean;
  categoryToEdit?: CategoryMaster | null;
  onClose: () => void;
  onSave: (category: CategoryMaster) => void;
}

export const AddEditCategoryModal: React.FC<AddEditCategoryModalProps> = ({
  isOpen,
  categoryToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [purchaseDiscount, setPurchaseDiscount] = useState<number | ''>(0);
  const [saleDiscount, setSaleDiscount] = useState<number | ''>(0);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || '');
      setActive(categoryToEdit.active !== undefined ? categoryToEdit.active : true);
      setPurchaseDiscount(categoryToEdit.purchaseDiscount ?? 0);
      setSaleDiscount(categoryToEdit.saleDiscount ?? 0);
      setImage(categoryToEdit.image);
    } else {
      setName('');
      setActive(true);
      setPurchaseDiscount(0);
      setSaleDiscount(0);
      setImage(undefined);
    }
    setIsDragging(false);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const readImageFile = (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    readImageFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter Category Name');
      return;
    }

    const savedCategory: CategoryMaster = {
      id: categoryToEdit?.id || `cat-${Date.now()}`,
      name: name.trim(),
      hsnDefault: categoryToEdit?.hsnDefault,
      itemCount: categoryToEdit?.itemCount || 0,
      active,
      purchaseDiscount: Number(purchaseDiscount) || 0,
      saleDiscount: Number(saleDiscount) || 0,
      image,
    };

    onSave(savedCategory);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">

        {/* Header Bar */}
        <div className="bg-[#00a8b5] px-5 py-3 flex items-center justify-between text-white shadow-sm">
          <h2 className="text-base font-extrabold tracking-wide">Category Master</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-red-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5 font-extrabold" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">

          {/* Category Name + Active Toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 dark:text-slate-100 text-sm">Category Name</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">Active</span>
              </div>
            </div>
            <input
              type="text"
              required
              autoFocus
              placeholder="Enter Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold"
            />
          </div>

          {/* Purchase Discount / Sale Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Purchase Discount</label>
              <input
                type="number"
                value={purchaseDiscount}
                onChange={(e) => setPurchaseDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Sale Discount</label>
              <input
                type="number"
                value={saleDiscount}
                onChange={(e) => setSaleDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Image</label>
              <Download className="h-4 w-4 text-blue-500" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => readImageFile(e.target.files?.[0])}
            />

            {image ? (
              <div className="relative w-full h-32 rounded border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Category" className="max-h-full max-w-full object-contain" />
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                  title="Remove Image"
                >
                  <ImageOff className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onPaste={(e) => readImageFile(e.clipboardData.files?.[0])}
                className={`w-full h-32 rounded border-2 border-dashed flex flex-col items-center justify-center text-center px-3 cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  Drag and drop or paste files here or
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  Browse..
                </span>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/60 -mx-6 -mb-6 p-4">
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
