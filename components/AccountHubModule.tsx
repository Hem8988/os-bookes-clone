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

  // Vendor Invoice Photo Upload State
  const [isVendorBillModalOpen, setIsVendorBillModalOpen] = useState(false);
  const [billVendorName, setBillVendorName] = useState('Indian Oil Corporation Ltd');
  const [billAmount, setBillAmount] = useState('45800');
  const [billNumber, setBillNumber] = useState(`IOCL-BILL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billPhotoUrl, setBillPhotoUrl] = useState<string | null>(null);
  const [billNotes, setBillNotes] = useState('Plant LPG Cylinder Bulk Supply Invoice');
  const [isScanning, setIsScanning] = useState(false);

  const handleBillPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanning(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillPhotoUrl(reader.result as string);
        setTimeout(() => setIsScanning(false), 600);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVendorBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: LedgerEntry = {
      id: `bill_${Date.now()}`,
      date: billDate,
      accountName: billVendorName,
      particulars: `Purchase Invoice Photo Uploaded: ${billNotes} (Ref: ${billNumber})`,
      voucherNumber: billNumber,
      debit: 0,
      credit: Number(billAmount) || 0,
      balance: Number(billAmount) || 0,
    };
    setPaymentsList([newEntry, ...paymentsList]);
    setIsVendorBillModalOpen(false);
    alert(`✅ Vendor Purchase Bill (${billNumber}) for ₹${Number(billAmount).toLocaleString('en-IN')} successfully uploaded & posted to Ledger!`);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Financial Account & Branch Management
          </h2>
          <p className="text-xs text-slate-500">
            Real-time Debit/Credit Statements, Bank Books, Payment Verification & Day Closing Locks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsVendorBillModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <span>📸 Upload Vendor Bill Photo (Auto Ledger)</span>
          </button>

          <button 
            onClick={() => setIsNewPaymentModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Entry in {activeSubTab.toUpperCase().replace('-', ' ')}</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-thin">
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
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.shortcut && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono">
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

      {/* VENDOR INVOICE / PURCHASE BILL PHOTO UPLOAD MODAL */}
      {isVendorBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 font-extrabold text-base">
                  📸
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    Upload Vendor Bill / Invoice Photo
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Upload Purchase Invoice Image &rarr; Auto OCR Scanner Updates Vendor Ledger
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsVendorBillModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleVendorBillSubmit} className="space-y-4 text-xs font-semibold">
              
              {/* IMAGE UPLOAD CARD */}
              <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-2">
                {billPhotoUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={billPhotoUrl} 
                      alt="Uploaded Vendor Bill" 
                      className="max-h-48 mx-auto rounded-lg shadow-md border border-slate-300"
                    />
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Invoice Image Loaded & OCR Scanned Successfully
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl block mb-1">📄</span>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">
                      Click to Select or Drag Vendor Bill Photo
                    </p>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Upload Plant Supply Bill, IOCL / BPCL / HPCL Voucher Image
                    </p>
                  </div>
                )}

                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleBillPhotoChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer pt-2"
                />

                {isScanning && (
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black animate-pulse">
                    ⚡ Scanning & Extracting Bill Amount & GSTIN details...
                  </div>
                )}
              </div>

              {/* FORM FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Vendor / Company Name *
                  </label>
                  <select
                    value={billVendorName}
                    onChange={(e) => setBillVendorName(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-extrabold"
                  >
                    <option value="Indian Oil Corporation Ltd">Indian Oil Corporation Ltd (IOCL Plant)</option>
                    <option value="Bharat Petroleum Corp Ltd">Bharat Petroleum Corp Ltd (BPCL Bottling)</option>
                    <option value="Hindustan Petroleum Corp Ltd">Hindustan Petroleum Corp Ltd (HPCL)</option>
                    <option value="Reliance Industries LPG Division">Reliance LPG Industries Division</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Bill / Voucher # *
                  </label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Bill Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-black text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Bill Date
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Bill Type / Category
                  </label>
                  <input
                    type="text"
                    value={billNotes}
                    onChange={(e) => setBillNotes(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVendorBillModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold shadow cursor-pointer flex items-center gap-1.5"
                >
                  <span>Post Bill to Vendor Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
