'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { CompanyMaster } from '../lib/types';

interface AddEditCompanyModalProps {
  isOpen: boolean;
  companyToEdit?: CompanyMaster | null;
  onClose: () => void;
  onSave: (company: CompanyMaster) => void;
}

export const AddEditCompanyModal: React.FC<AddEditCompanyModalProps> = ({
  isOpen,
  companyToEdit,
  onClose,
  onSave,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Indore');
  const [state, setState] = useState('Madhya Pradesh');
  const [stateCode, setStateCode] = useState('23');
  const [pincode, setPincode] = useState('452001');
  const [isMainBranch, setIsMainBranch] = useState(false);

  useEffect(() => {
    if (companyToEdit) {
      setCompanyName(companyToEdit.companyName || '');
      setTradeName(companyToEdit.tradeName || '');
      setGstin(companyToEdit.gstin || '');
      setPan(companyToEdit.pan || '');
      setPhone(companyToEdit.phone || '');
      setEmail(companyToEdit.email || '');
      setAddress(companyToEdit.address || '');
      setCity(companyToEdit.city || 'Indore');
      setState(companyToEdit.state || 'Madhya Pradesh');
      setStateCode(companyToEdit.stateCode || '23');
      setPincode(companyToEdit.pincode || '452001');
      setIsMainBranch(Boolean(companyToEdit.isMainBranch));
    } else {
      setCompanyName('');
      setTradeName('');
      setGstin('');
      setPan('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCity('Indore');
      setState('Madhya Pradesh');
      setStateCode('23');
      setPincode('452001');
      setIsMainBranch(false);
    }
  }, [companyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Please enter Company / Firm Name');
      return;
    }

    const savedCompany: CompanyMaster = {
      id: companyToEdit?.id || `comp-${Date.now()}`,
      companyName: companyName.trim(),
      tradeName: tradeName.trim() || companyName.trim(),
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase() || (gstin.trim().length >= 10 ? gstin.trim().slice(2, 12).toUpperCase() : ''),
      phone: phone.trim() || '+91 98260 00000',
      email: email.trim() || 'branch@os-books.com',
      address: address.trim() || 'Commercial Center',
      city: city.trim() || 'Indore',
      state: state.trim() || 'Madhya Pradesh',
      stateCode: stateCode.trim() || '23',
      pincode: pincode.trim() || '452001',
      isMainBranch,
    };

    onSave(savedCompany);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {companyToEdit ? 'Edit Company / Branch Master' : 'Add New Company / Branch Master'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure Firm GSTIN, Address, Trade Name & Branch HQ Details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Company Name */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Company / Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PRAMUKH INDANE - Bhopal Depot"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs md:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Trade Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trade / Brand Name
              </label>
              <input
                type="text"
                placeholder="e.g. Pramukh Indane Gas"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* GSTIN */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                GSTIN Number
              </label>
              <input
                type="text"
                placeholder="e.g. 24AAAFP1234F1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-xs font-mono uppercase rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Contact Phone
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Official Email
              </label>
              <input
                type="email"
                placeholder="e.g. depot@pramukhindane.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Address */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Address
              </label>
              <input
                type="text"
                placeholder="e.g. 45 MP Nagar Zone 1"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Bhopal"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* State */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                State & Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Madhya Pradesh"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="23"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-16 px-2 py-2 text-xs font-mono text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Is Main HQ Branch Toggle */}
            <div className="md:col-span-2 pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isMainBranch"
                checked={isMainBranch}
                onChange={(e) => setIsMainBranch(e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isMainBranch" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                Set as Main Company HQ Branch
              </label>
            </div>

          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{companyToEdit ? 'Save Company Changes' : 'Add Company Master'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
