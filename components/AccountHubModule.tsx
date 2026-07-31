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
  ArrowUpRight, 
  ArrowDownRight,
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

import { CustomerLedgerModule } from './CustomerLedgerModule';

export const AccountHubModule: React.FC<AccountHubModuleProps> = ({
  customerLedger,
  companyLedger,
  bankBook,
  employeeLedger,
  expensesLedger,
  incomesLedger,
  paymentLedger,
  attendance,
  branchTransfers,
  customers,
  companies,
  initialSubTab = 'customer-ledger',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Sub-items matching OS-BOOKS screenshot 3 (Branch Management + Account)
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
            OS-BOOKS Financial Account & Branch Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time Debit/Credit Statements, Bank Books, Attendance & Inter-Branch Stock Transfers
          </p>
        </div>

        <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all">
          <Plus className="h-4 w-4" />
          <span>New Entry in {activeSubTab.toUpperCase()}</span>
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
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
          placeholder={`Search ${activeSubTab.toUpperCase()} records...`}
          className="w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* RENDER VIEWS FOR EACH SUB TAB */}

      {/* 1. STOCK IN */}
      {activeSubTab === 'stock-in' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Stock Inward #</th>
                <th className="px-3 py-2.5">Source Branch</th>
                <th className="px-3 py-2.5">Destination Branch</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Received Qty</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {branchTransfers.filter((st) => st.type === 'Stock In').map((st) => (
                <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{st.transferNumber}</td>
                  <td className="px-3 py-3 font-bold">{st.fromBranch}</td>
                  <td className="px-3 py-3 font-bold">{st.toBranch}</td>
                  <td className="px-3 py-3">{st.date}</td>
                  <td className="px-3 py-3 font-mono font-extrabold">{st.totalQty} Units</td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {st.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. STOCK OUT */}
      {activeSubTab === 'stock-out' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Stock Outward #</th>
                <th className="px-3 py-2.5">Originating Branch</th>
                <th className="px-3 py-2.5">Target Branch</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Dispatched Qty</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {branchTransfers.filter((st) => st.type === 'Stock Out').map((st) => (
                <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{st.transferNumber}</td>
                  <td className="px-3 py-3 font-bold">{st.fromBranch}</td>
                  <td className="px-3 py-3 font-bold">{st.toBranch}</td>
                  <td className="px-3 py-3">{st.date}</td>
                  <td className="px-3 py-3 font-mono font-extrabold">{st.totalQty} Units</td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      {st.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. COMPANY LEDGER */}
      {activeSubTab === 'company-ledger' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Voucher #</th>
                <th className="px-3 py-2.5">Company Account</th>
                <th className="px-3 py-2.5">Particulars</th>
                <th className="px-3 py-2.5">Debit (Dr)</th>
                <th className="px-3 py-2.5">Credit (Cr)</th>
                <th className="px-3 py-2.5">Net Reserve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {companyLedger.map((led) => (
                <tr key={led.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">{led.date}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400">{led.voucherNumber}</td>
                  <td className="px-3 py-3 font-sans font-extrabold text-slate-900 dark:text-slate-100">{led.accountName}</td>
                  <td className="px-3 py-3 font-sans">{led.particulars}</td>
                  <td className="px-3 py-3 font-bold text-rose-600">{led.debit > 0 ? `₹${led.debit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600">{led.credit > 0 ? `₹${led.credit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-3 py-3 font-black text-slate-900 dark:text-slate-100">₹{led.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. BANK BOOK */}
      {activeSubTab === 'bank-book' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Voucher #</th>
                <th className="px-3 py-2.5">Bank Account</th>
                <th className="px-3 py-2.5">Particulars</th>
                <th className="px-3 py-2.5">Deposit (Dr)</th>
                <th className="px-3 py-2.5">Withdrawal (Cr)</th>
                <th className="px-3 py-2.5">Bank Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {bankBook.map((bb) => (
                <tr key={bb.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">{bb.date}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400">{bb.voucherNumber}</td>
                  <td className="px-3 py-3 font-sans font-extrabold text-slate-900 dark:text-slate-100">{bb.accountName}</td>
                  <td className="px-3 py-3 font-sans">{bb.particulars}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600">{bb.debit > 0 ? `₹${bb.debit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-3 py-3 font-bold text-rose-600">{bb.credit > 0 ? `₹${bb.credit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-3 py-3 font-black text-slate-900 dark:text-slate-100">₹{bb.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. EMPLOYEE LEDGER */}
      {activeSubTab === 'employee-ledger' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Voucher #</th>
                <th className="px-3 py-2.5">Employee Name</th>
                <th className="px-3 py-2.5">Particulars</th>
                <th className="px-3 py-2.5">Payout (Dr)</th>
                <th className="px-3 py-2.5">Credit (Cr)</th>
                <th className="px-3 py-2.5">Due Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {employeeLedger.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">{emp.date}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400">{emp.voucherNumber}</td>
                  <td className="px-3 py-3 font-sans font-extrabold text-slate-900 dark:text-slate-100">{emp.accountName}</td>
                  <td className="px-3 py-3 font-sans">{emp.particulars}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600">{emp.debit > 0 ? `₹${emp.debit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-3 py-3 font-bold text-rose-600">{emp.credit > 0 ? `₹${emp.credit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-3 py-3 font-black text-slate-900 dark:text-slate-100">₹{emp.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. EXPENSES LEDGER */}
      {activeSubTab === 'expenses-ledger' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Voucher #</th>
                <th className="px-3 py-2.5">Expense Head</th>
                <th className="px-3 py-2.5">Particulars</th>
                <th className="px-3 py-2.5">Amount Spent (Dr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {expensesLedger.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">{exp.date}</td>
                  <td className="px-3 py-3 font-bold text-rose-500">{exp.voucherNumber}</td>
                  <td className="px-3 py-3 font-sans font-extrabold text-slate-900 dark:text-slate-100">{exp.accountName}</td>
                  <td className="px-3 py-3 font-sans">{exp.particulars}</td>
                  <td className="px-3 py-3 font-black text-rose-600 dark:text-rose-400">₹{exp.debit.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 8. INCOMES LEDGER */}
      {activeSubTab === 'incomes-ledger' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Voucher #</th>
                <th className="px-3 py-2.5">Income Head</th>
                <th className="px-3 py-2.5">Particulars</th>
                <th className="px-3 py-2.5">Amount Earned (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {incomesLedger.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">{inc.date}</td>
                  <td className="px-3 py-3 font-bold text-emerald-500">{inc.voucherNumber}</td>
                  <td className="px-3 py-3 font-sans font-extrabold text-slate-900 dark:text-slate-100">{inc.accountName}</td>
                  <td className="px-3 py-3 font-sans">{inc.particulars}</td>
                  <td className="px-3 py-3 font-black text-emerald-600 dark:text-emerald-400">₹{inc.credit.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 9. PAYMENT LEDGER */}
      {activeSubTab === 'payment-ledger' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Payment Voucher</th>
                <th className="px-3 py-2.5">Payment Channel</th>
                <th className="px-3 py-2.5">Particulars</th>
                <th className="px-3 py-2.5">Amount Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {paymentLedger.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">{pay.date}</td>
                  <td className="px-3 py-3 font-bold text-emerald-500">{pay.voucherNumber}</td>
                  <td className="px-3 py-3 font-sans font-extrabold text-slate-900 dark:text-slate-100">{pay.accountName}</td>
                  <td className="px-3 py-3 font-sans">{pay.particulars}</td>
                  <td className="px-3 py-3 font-black text-slate-900 dark:text-slate-100">₹{pay.debit.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 10. EMPLOYEE ATTENDANCE */}
      {activeSubTab === 'employee-attendance' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Employee Name</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Check In</th>
                <th className="px-3 py-2.5">Check Out</th>
                <th className="px-3 py-2.5">Overtime (Hrs)</th>
                <th className="px-3 py-2.5">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {attendance.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-slate-100">{att.employeeName}</td>
                  <td className="px-3 py-3 font-mono">{att.date}</td>
                  <td className="px-3 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{att.checkIn}</td>
                  <td className="px-3 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{att.checkOut}</td>
                  <td className="px-3 py-3 font-mono font-bold">{att.overtimeHours} hrs</td>
                  <td className="px-3 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {att.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
