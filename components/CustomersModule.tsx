'use client';

import React, { useState } from 'react';
import { Users, Phone, Mail, MapPin, Shield, Plus, DollarSign } from 'lucide-react';
import { Customer } from '../lib/types';
import { AddEditVendorModal } from './AddEditVendorModal';

interface CustomersModuleProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
}

export const CustomersModule: React.FC<CustomersModuleProps> = ({ customers, onAddCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Party Ledgers & Account Receivables ({customers.length} Accounts)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track customer balances, vendor payables, GSTIN registrations, and credit terms
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add New Customer / Vendor</span>
        </button>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customers.map((c) => {
          const isReceivable = c.balance > 0;
          return (
            <div 
              key={c.id} 
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {c.name}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {c.address}, {c.city}, {c.state}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                      c.type === 'Customer'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {c.type}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 font-mono">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span>GSTIN:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {c.gstin || 'Unregistered Dealer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{c.phone}</span>
                    <span className="text-slate-400">•</span>
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{c.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Account Balance</div>
                  <div
                    className={`text-lg font-black font-mono ${
                      isReceivable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    ₹{Math.abs(c.balance).toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-bold">{isReceivable ? '(Receivable)' : '(Payable)'}</span>
                  </div>
                </div>

                <button className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all">
                  Statement Ledger →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for adding vendor / customer */}
      <AddEditVendorModal
        isOpen={isModalOpen}
        defaultType="Vendor"
        onClose={() => setIsModalOpen(false)}
        onSave={onAddCustomer}
      />
    </div>
  );
};
