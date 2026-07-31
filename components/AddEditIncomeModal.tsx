'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { IncomeMaster } from '../lib/types';

interface AddEditIncomeModalProps {
  isOpen: boolean;
  incomeToEdit?: IncomeMaster | null;
  onClose: () => void;
  onSave: (income: IncomeMaster) => void;
}

export const AddEditIncomeModal: React.FC<AddEditIncomeModalProps> = ({
  isOpen,
  incomeToEdit,
  onClose,
  onSave,
}) => {
  const [sourceName, setSourceName] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [gstRate, setGstRate] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (incomeToEdit) {
      setSourceName(incomeToEdit.sourceName || '');
      setHsnSac(incomeToEdit.hsnSac || '');
      setGstRate(incomeToEdit.gstRate ?? 0);
      setActive(incomeToEdit.active ?? true);
    } else {
      setSourceName('');
      setHsnSac('');
      setGstRate(0);
      setActive(true);
    }
  }, [incomeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) {
      alert('Please enter Income Name');
      return;
    }

    const saved: IncomeMaster = {
      id: incomeToEdit?.id || `inc-${Date.now()}`,
      sourceName: sourceName.trim(),
      hsnSac: hsnSac.trim() || undefined,
      gstRate,
      ytdEarned: incomeToEdit?.ytdEarned ?? 0,
      active,
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">

        <div className="flex items-center justify-between px-5 py-3.5 bg-teal-600 dark:bg-teal-800">
          <h2 className="text-base font-bold text-white">
            {incomeToEdit ? 'Edit Income Master' : 'Incomes Master'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Income Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter Income Name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5 md:pt-0 flex flex-col items-center md:pl-2">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Active
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
                    active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                HSN / SAC Code
              </label>
              <input
                type="text"
                placeholder="Enter HSN / SAC Code"
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                GST Rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
