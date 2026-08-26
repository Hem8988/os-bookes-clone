'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Building2, 
  Landmark, 
  UserCheck, 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  CalendarCheck, 
  Plus, 
  Search, 
  CheckCircle2,
  X,
  PackageCheck,
  Truck
} from 'lucide-react';
import { 
  LedgerEntry, 
  EmployeeAttendance, 
  BranchStockTransfer, 
  Customer, 
  CompanyMaster 
} from '../lib/types';
import { CustomerLedgerModule } from './CustomerLedgerModule';

interface AccountHubModuleProps {
  customerLedger: LedgerEntry[];
  companyLedger: LedgerEntry[];
  bankBook: LedgerEntry[];
  employeeLedger: LedgerEntry[];
  expensesLedger: LedgerEntry[];
  incomesLedger: LedgerEntry[];
  paymentLedger: LedgerEntry[];
  attendance: EmployeeAttendance[];
  branchTransfers: BranchStockTransfer[];
  customers: Customer[];
  companies: CompanyMaster[];
  initialSubTab?: string;
}

export const AccountHubModule: React.FC<AccountHubModuleProps> = ({
  customerLedger,
  companyLedger,
  bankBook,
  employeeLedger,
  expensesLedger,
  incomesLedger,
  paymentLedger: initialPaymentLedger,
  attendance,
  branchTransfers,
  customers,
  companies,
  initialSubTab = 'customer-ledger',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentsList, setPaymentsList] = useState<LedgerEntry[]>(initialPaymentLedger);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);

  // New Payment Modal State
  const [payPartyName, setPayPartyName] = useState('Hotel Rajdhani');
  const [payAmount, setPayAmount] = useState('18500');
  const [payMode, setPayMode] = useState('Online UPI / Banking');
  const [payVoucher, setPayVoucher] = useState(`PAY-${Math.floor(1000 + Math.random() * 9000)}`);
  const [payRemarks, setPayRemarks] = useState('Payment Received for Cylinder Dispatch');

  React.useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const accountSubTabs = [
    { id: 'stock-in', label: 'Stock In (Branch)', category: 'Branch', icon: PackageCheck },
    { id: 'stock-out', label: 'Stock Out (Branch)', category: 'Branch', icon: Truck },
    { id: 'customer-ledger', label: 'Customer Ledger', shortcut: 'Ctrl+Shift+C', category: 'Account', icon: Users },
    { id: 'company-ledger', label: 'Company Ledger', shortcut: 'Ctrl+Shift+M', category: 'Account', icon: Building2 },
    { id: 'bank-book', label: 'Bank Book', category: 'Account', icon: Landmark },
    { id: 'employee-ledger', label: 'Employee Ledger', category: 'Account', icon: UserCheck },
    { id: 'expenses-ledger', label: 'Expenses Ledger', shortcut: 'Ctrl+E', category: 'Account', icon: DollarSign },
    { id: 'incomes-ledger', label: 'Incomes Ledger', shortcut: 'Ctrl+I', category: 'Account', icon: TrendingUp },
    { id: 'payment-ledger', label: 'Payment Ledger', category: 'Account', icon: Receipt },
    { id: 'employee-attendance', label: 'Employee Attendance', category: 'Account', icon: CalendarCheck },
  ];

  const handleCreatePaymentEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const newPay: LedgerEntry = {
      id: `pay_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      accountName: payPartyName,
      particulars: `${payRemarks} (${payMode})`,
      voucherNumber: payVoucher,
      debit: Number(payAmount) || 0,
      credit: 0,
      balance: Number(payAmount) || 0,
    };

    setPaymentsList([newPay, ...paymentsList]);
    alert('🎉 NEW PAYMENT ENTRY RECORDED IN PAYMENT LEDGER!');
    setIsNewPaymentModalOpen(false);
  };

  if (activeSubTab === 'customer-ledger') {
    return (
      <CustomerLedgerModule 
        customerLedger={customerLedger}
        customers={customers}
        onClose={() => setActiveSubTab('company-ledger')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            Financial Account & Branch Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time Debit/Credit Statements, Bank Books, Payment Verification & Day Closing Locks
          </p>
        </div>

        <button 
          onClick={() => setIsNewPaymentModalOpen(true)}
          className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Entry in {activeSubTab.toUpperCase().replace('-', ' ')}</span>
        </button>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-thin">
        {accountSubTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.shortcut && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950/80 text-emerald-300 font-mono">
                  {tab.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${activeSubTab.toUpperCase().replace('-', ' ')} records...`}
          className="w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-medium"
        />
      </div>

      {/* 9. PAYMENT LEDGER */}
      {activeSubTab === 'payment-ledger' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-700 dark:text-slate-300 uppercase">
              <tr>
                <th className="px-3.5 py-3">Date</th>
                <th className="px-3.5 py-3">Voucher #</th>
                <th className="px-3.5 py-3">Party Account Name</th>
                <th className="px-3.5 py-3">Payment Channel / Particulars</th>
                <th className="px-3.5 py-3">Amount Processed</th>
                <th className="px-3.5 py-3">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paymentsList.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3.5 py-3 font-mono font-bold">{pay.date}</td>
                  <td className="px-3.5 py-3 font-mono font-bold text-emerald-500">{pay.voucherNumber}</td>
                  <td className="px-3.5 py-3 font-extrabold text-slate-900 dark:text-slate-100 text-sm">{pay.accountName}</td>
                  <td className="px-3.5 py-3 font-medium">{pay.particulars}</td>
                  <td className="px-3.5 py-3 font-black text-slate-900 dark:text-white font-mono text-sm">₹{pay.debit.toLocaleString('en-IN')}</td>
                  <td className="px-3.5 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Payment Cleared & Posted
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW PAYMENT ENTRY MODAL */}
      {isNewPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-500" />
                Add New Payment Ledger Entry
              </h3>
              <button onClick={() => setIsNewPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePaymentEntry} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer / Party Name</label>
                <input
                  type="text"
                  required
                  value={payPartyName}
                  onChange={(e) => setPayPartyName(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Voucher Number</label>
                  <input
                    type="text"
                    required
                    value={payVoucher}
                    onChange={(e) => setPayVoucher(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Channel / Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
                >
                  <option value="Online UPI / Banking">Online UPI / Net Banking</option>
                  <option value="Cash Deposit">Cash Deposit at Counter</option>
                  <option value="Cheque Deposit">Bank Cheque Deposit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks / Particulars</label>
                <input
                  type="text"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow cursor-pointer"
                >
                  Post Payment to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
