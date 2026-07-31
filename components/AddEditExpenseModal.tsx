'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ExpenseMaster } from '../lib/types';

interface AddEditExpenseModalProps {
  isOpen: boolean;
  expenseToEdit?: ExpenseMaster | null;
  expenseHeads: string[];
  onClose: () => void;
  onSave: (expense: ExpenseMaster) => void;
}

const EXPENSE_TYPES = [
  'Operating Expenses',
  'Administrative Expenses',
  'Financial Expenses',
  'Direct Expenses',
  'Capital Expenditure',
  'Other Expenses',
];

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  isOpen,
  expenseToEdit,
  expenseHeads,
  onClose,
  onSave,
}) => {
  const [expenseName, setExpenseName] = useState('');
  const [active, setActive] = useState(true);
  const [expenseHead, setExpenseHead] = useState('');
  const [expenseType, setExpenseType] = useState(EXPENSE_TYPES[0]);

  useEffect(() => {
    if (expenseToEdit) {
      setExpenseName(expenseToEdit.categoryName || '');
      setActive(expenseToEdit.active ?? true);
      setExpenseHead(expenseToEdit.expenseHead || '');
      setExpenseType(expenseToEdit.expenseType || EXPENSE_TYPES[0]);
    } else {
      setExpenseName('');
      setActive(true);
      setExpenseHead('');
      setExpenseType(EXPENSE_TYPES[0]);
    }
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName.trim()) {
      alert('Please enter Expense Name');
      return;
    }

    const saved: ExpenseMaster = {
      id: expenseToEdit?.id || `exp-${Date.now()}`,
      categoryName: expenseName.trim(),
      hsnSac: expenseToEdit?.hsnSac,
      gstRate: expenseToEdit?.gstRate ?? 0,
      monthlyBudget: expenseToEdit?.monthlyBudget ?? 0,
      ytdSpent: expenseToEdit?.ytdSpent ?? 0,
      active,
      expenseHead: expenseHead.trim(),
      expenseType,
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-teal-600 dark:bg-teal-800">
          <h2 className="text-base font-bold text-white">
            {expenseToEdit ? 'Edit Expense Master' : 'Expenses Master'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">

            {/* Expense Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Expense Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter Expense Name"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Active Toggle */}
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

            {/* Expense Head */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Expense Head
              </label>
              <input
                type="text"
                list="expense-head-options"
                placeholder="Enter Expense Head"
                value={expenseHead}
                onChange={(e) => setExpenseHead(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <datalist id="expense-head-options">
                {expenseHeads.map((head) => (
                  <option key={head} value={head} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Expense Type */}
          <div className="space-y-1.5 md:w-1/2">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Expense Type
            </label>
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {EXPENSE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
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
