'use client';

import React, { useState, useEffect } from 'react';
import { X, Landmark, CreditCard, Building2, Save, Plus, Check } from 'lucide-react';
import { BankMaster } from '../lib/types';

interface AddEditBankModalProps {
  isOpen: boolean;
  bankToEdit?: BankMaster | null;
  availableBookTypes?: string[];
  onAddBookType?: (newType: string) => void;
  onClose: () => void;
  onSave: (bank: BankMaster) => void;
}

export const AddEditBankModal: React.FC<AddEditBankModalProps> = ({
  isOpen,
  bankToEdit,
  availableBookTypes = ['BANK BOOK', 'CASH BOOK', 'NON-PAYMENT BOOK', 'LOAN ACCOUNT', 'OD / CC ACCOUNT', 'PETTY CASH BOOK'],
  onAddBookType,
  onClose,
  onSave,
}) => {
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branch, setBranch] = useState('');
  const [address, setAddress] = useState('');
  const [bookType, setBookType] = useState<string>('BANK BOOK');
  const [upiId, setUpiId] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [currentBalance, setCurrentBalance] = useState<number | ''>(0);

  // Custom Book Type Input Toggle State
  const [isCreatingCustomType, setIsCreatingCustomType] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');

  // Combined list of book types including custom ones dynamically
  const [dynamicTypesList, setDynamicTypesList] = useState<string[]>(availableBookTypes);

  useEffect(() => {
    // Keep dynamicTypesList synchronized with parent prop & existing bank's bookType
    const typesSet = new Set([...availableBookTypes, 'BANK BOOK', 'CASH BOOK', 'NON-PAYMENT BOOK']);
    if (bankToEdit?.bookType) {
      typesSet.add(bankToEdit.bookType.toUpperCase());
    }
    setDynamicTypesList(Array.from(typesSet));
  }, [availableBookTypes, bankToEdit]);

  useEffect(() => {
    if (bankToEdit) {
      setAccountName(bankToEdit.accountName || '');
      setBankName(bankToEdit.bankName || '');
      setAccountNumber(bankToEdit.accountNumber || '');
      setIfscCode(bankToEdit.ifscCode || '');
      setBranch(bankToEdit.branch || '');
      setAddress(bankToEdit.address || bankToEdit.branch || '');
      setBookType(bankToEdit.bookType || 'BANK BOOK');
      setUpiId(bankToEdit.upiId || '');
      setOpeningBalance(bankToEdit.openingBalance ?? 0);
      setCurrentBalance(bankToEdit.currentBalance ?? 0);
    } else {
      setAccountName('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setBranch('');
      setAddress('');
      setBookType('BANK BOOK');
      setUpiId('');
      setOpeningBalance(0);
      setCurrentBalance(0);
    }
    setIsCreatingCustomType(false);
    setCustomTypeInput('');
  }, [bankToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddNewCustomType = () => {
    const formatted = customTypeInput.trim().toUpperCase();
    if (!formatted) return;

    if (!dynamicTypesList.includes(formatted)) {
      setDynamicTypesList((prev) => [...prev, formatted]);
    }
    if (onAddBookType) {
      onAddBookType(formatted);
    }
    setBookType(formatted);
    setIsCreatingCustomType(false);
    setCustomTypeInput('');
  };

  const handleBookTypeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsCreatingCustomType(true);
    } else {
      setBookType(val);
      setIsCreatingCustomType(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      alert('Please enter Bank / Account Name');
      return;
    }

    let finalBookType = bookType;

    // If user is currently typing a custom book type when submitting
    if (isCreatingCustomType && customTypeInput.trim()) {
      finalBookType = customTypeInput.trim().toUpperCase();
      if (onAddBookType) {
        onAddBookType(finalBookType);
      }
    }

    const savedBank: BankMaster = {
      id: bankToEdit?.id || `bank-${Date.now()}`,
      accountName: accountName.trim(),
      bankName: bankName.trim() || 'Generic Bank',
      accountNumber: accountNumber.trim() || 'N/A',
      ifscCode: ifscCode.trim().toUpperCase() || 'N/A',
      branch: branch.trim() || 'Main Branch',
      address: address.trim() || branch.trim() || 'Local Branch',
      bookType: finalBookType || 'BANK BOOK',
      upiId: upiId.trim() || undefined,
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(currentBalance) || Number(openingBalance) || 0,
    };

    onSave(savedBank);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {bankToEdit ? 'Edit Bank Master Record' : 'Create New Bank Master Record'}
              </h2>
              <p className="text-xs text-slate-500">
                Add Bank Account Details, Dynamic Book Type & UPI QR Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Account Display Name */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Account Name / Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Bank Current A/c or SBI Cr A/c. 62232218627"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs md:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Bank Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI, ICICI, Cash In Hand"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Dynamic Book Type Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Book Type
                </label>
                {!isCreatingCustomType && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCustomType(true)}
                    className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Add Custom Type
                  </button>
                )}
              </div>

              {!isCreatingCustomType ? (
                <select
                  value={bookType}
                  onChange={handleBookTypeSelectChange}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {dynamicTypesList.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="font-bold text-emerald-600">
                    + Add New Book Type...
                  </option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter custom Book Type e.g. LOAN BOOK"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 text-xs font-bold uppercase rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCustomType}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                    title="Confirm Add"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCustomType(false);
                      setCustomTypeInput('');
                    }}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-all"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Account Number
              </label>
              <input
                type="text"
                placeholder="e.g. 50200011521150 or CASH-COUNTER-01"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* IFSC Code */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0000543 or SBIN0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-xs font-mono uppercase rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Branch */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. Vijay Nagar, Main Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* UPI ID */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                UPI VPA / QR ID
              </label>
              <input
                type="text"
                placeholder="e.g. ostech@hdfcbank or ostech@sbi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Address */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Branch Address
              </label>
              <input
                type="text"
                placeholder="e.g. Vijay Nagar Branch, AB Road, Indore"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Opening Balance */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Current Balance */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Current Ledger Balance (₹)
              </label>
              <input
                type="number"
                placeholder="0"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>{bankToEdit ? 'Save Changes' : 'Add Bank Record'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
