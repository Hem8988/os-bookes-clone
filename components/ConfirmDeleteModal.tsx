'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemType?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'Delete Record Confirmation',
  itemName,
  itemType = 'Record',
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-3xl shadow-2xl overflow-hidden my-8 p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border-4 border-red-200 dark:border-red-900/60 shadow-lg shadow-red-500/10 animate-bounce">
          <AlertTriangle className="h-9 w-9 text-red-600 dark:text-red-400" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Are you sure you want to delete this {itemType}? This action cannot be undone.
          </p>
        </div>

        {/* Item Name Highlight Badge */}
        {itemName && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 block mb-0.5">
              Selected {itemType} for Deletion:
            </span>
            <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-slate-100">
              "{itemName}"
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-extrabold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Yes, Delete Now</span>
          </button>
        </div>

      </div>
    </div>
  );
};
