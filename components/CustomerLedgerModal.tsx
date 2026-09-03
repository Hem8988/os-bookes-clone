'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Shield, 
  FileText, 
  Printer, 
  Download, 
  MessageSquare, 
  CheckCircle2, 
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard,
  Building,
  Eye,
  FileCheck
} from 'lucide-react';
import { Customer } from '../lib/types';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

interface LedgerEntry {
  id: string;
  date: string;
  voucherType: 'Sales Invoice' | 'Payment Receipt' | 'Opening Balance' | 'Credit Note' | 'Debit Note';
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  paymentMode?: string;
  referenceNo?: string;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  customer,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'ALL_LEDGER' | 'PAYMENTS' | 'INVOICES'>('ALL_LEDGER');
  
  // Selected Receipt state for displaying full Official Receipt Voucher
  const [selectedReceipt, setSelectedReceipt] = useState<LedgerEntry | null>(null);

  // Generate realistic B2B LPG ERP Ledger Transactions for the selected Customer
  const rawLedgerEntries = useMemo<LedgerEntry[]>(() => {
    if (!customer) return [];

    const today = new Date();
    const currentYear = today.getFullYear();

    const baseBalance = Number(customer.balance || 0);

    return [
      {
        id: 'entry-1',
        date: `${currentYear}-07-01`,
        voucherType: 'Opening Balance',
        voucherNo: 'OPB-001',
        particulars: 'Opening Balance B/F',
        debit: baseBalance > 0 ? 15000 : 0,
        credit: baseBalance < 0 ? Math.abs(baseBalance) : 0,
      },
      {
        id: 'entry-2',
        date: `${currentYear}-07-10`,
        voucherType: 'Sales Invoice',
        voucherNo: `INV-${customer.id.toUpperCase()}-101`,
        particulars: '19kg Commercial LPG Cylinder (10 Qty @ ₹1,750 + GST 18%)',
        debit: 20650,
        credit: 0,
      },
      {
        id: 'entry-3',
        date: `${currentYear}-07-15`,
        voucherType: 'Payment Receipt',
        voucherNo: `RCP-${customer.id.toUpperCase()}-501`,
        particulars: 'Payment Received via HDFC Online Net Banking / UPI',
        debit: 0,
        credit: 18000,
        paymentMode: 'Online Net Banking / UPI',
        referenceNo: 'UPI/HDFC/9837261541'
      },
      {
        id: 'entry-4',
        date: `${currentYear}-08-02`,
        voucherType: 'Sales Invoice',
        voucherNo: `INV-${customer.id.toUpperCase()}-108`,
        particulars: '47.5kg Industrial LPG Cylinder (4 Qty @ ₹4,100 + GST 18%)',
        debit: 19352,
        credit: 0,
      },
      {
        id: 'entry-5',
        date: `${currentYear}-08-18`,
        voucherType: 'Payment Receipt',
        voucherNo: `RCP-${customer.id.toUpperCase()}-512`,
        particulars: 'Cash Deposit Received at Agency Counter',
        debit: 0,
        credit: 15000,
        paymentMode: 'Cash Deposit',
        referenceNo: 'CASH-COUNTER-098'
      },
      {
        id: 'entry-6',
        date: `${currentYear}-08-25`,
        voucherType: 'Sales Invoice',
        voucherNo: `INV-${customer.id.toUpperCase()}-119`,
        particulars: '19kg Commercial LPG Refill (15 Qty @ ₹1,720 + CGST/SGST)',
        debit: (baseBalance > 0 ? baseBalance : 25000) + 8998,
        credit: 0,
      },
      {
        id: 'entry-7',
        date: `${currentYear}-08-28`,
        voucherType: 'Payment Receipt',
        voucherNo: `RCP-${customer.id.toUpperCase()}-530`,
        particulars: 'Bank Cheque Clearing Payment Received (SBI Cheque #40291)',
        debit: 0,
        credit: 12000,
        paymentMode: 'Cheque Deposit',
        referenceNo: 'CHQ-SBI-40291'
      }
    ];
  }, [customer]);

  // Calculate Running Balance line-by-line
  const ledgerWithRunningBalance = useMemo(() => {
    let running = 0;
    return rawLedgerEntries.map((entry) => {
      running += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance: running,
      };
    });
  }, [rawLedgerEntries]);

  // Filtered Payments Only
  const paymentReceipts = useMemo(() => {
    return ledgerWithRunningBalance.filter((e) => e.voucherType === 'Payment Receipt');
  }, [ledgerWithRunningBalance]);

  // Filtered Invoices Only
  const salesInvoices = useMemo(() => {
    return ledgerWithRunningBalance.filter((e) => e.voucherType === 'Sales Invoice');
  }, [ledgerWithRunningBalance]);

  // Summary Totals
  const totalDebit = useMemo(() => ledgerWithRunningBalance.reduce((acc, curr) => acc + curr.debit, 0), [ledgerWithRunningBalance]);
  const totalCredit = useMemo(() => ledgerWithRunningBalance.reduce((acc, curr) => acc + curr.credit, 0), [ledgerWithRunningBalance]);
  const netBalance = totalDebit - totalCredit;

  if (!isOpen || !customer) return null;

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Voucher Type', 'Voucher No', 'Particulars', 'Debit (Dr ₹)', 'Credit (Cr ₹)', 'Balance (₹)'];
    const rows = ledgerWithRunningBalance.map((e) => [
      e.date,
      e.voucherType,
      e.voucherNo,
      `"${e.particulars.replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      e.runningBalance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${customer.name.replace(/\s+/g, '_')}_Statement_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Send WhatsApp Statement
  const handleWhatsAppShare = () => {
    const text = `*Customer Statement Ledger*\n*Party*: ${customer.name}\n*GSTIN*: ${customer.gstin || 'N/A'}\n*Total Billed*: ₹${totalDebit.toLocaleString('en-IN')}\n*Total Received*: ₹${totalCredit.toLocaleString('en-IN')}\n*Net Outstanding Balance*: ₹${Math.abs(netBalance).toLocaleString('en-IN')} (${netBalance >= 0 ? 'Dr Receivable' : 'Cr Payable'})\n\nThank you for doing business with Pramukh Indane!`;
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone.length >= 10 ? cleanPhone : ''}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end overflow-hidden animate-in fade-in duration-200">
      
      {/* Drawer Container */}
      <div className="w-full max-w-5xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
        
        {/* Top Header Bar */}
        <div className="bg-[#00a8b5] px-6 py-4 flex items-center justify-between text-white shadow-md shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-wide">
                {customer.name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-black uppercase tracking-wider">
                {customer.type || 'Customer'} Ledger
              </span>
            </div>
            <p className="text-xs text-white/90 font-medium mt-0.5 flex items-center gap-2">
              <span>{customer.tradeName ? `Trade: ${customer.tradeName}` : 'Customer 360 View & Detailed Account Ledger'}</span>
              <span>•</span>
              <span>GSTIN: {customer.gstin || 'Unregistered'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow cursor-pointer"
              title="Share Statement via WhatsApp"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition cursor-pointer"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition cursor-pointer"
              title="Print Statement"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition ml-2 cursor-pointer"
              title="Close Drawer"
            >
              <X className="h-5 w-5 font-bold" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Customer Profile Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Contact & Info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-teal-500" />
                Contact & Address Info
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{customer.phone || 'N/A'}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{customer.address}, {customer.city}, {customer.state || 'Madhya Pradesh'}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Account & Tax Profile */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                GSTIN & Credit Terms
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">GSTIN Reg:</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {customer.gstin || 'Unregistered'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Credit Limit:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    ₹{(customer.creditLimit || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Credit Terms:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {customer.dueDays || customer.creditDays || 7} Days Due
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Account Group:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {customer.accountGroup || (customer.type === 'Vendor' ? 'Sundry Creditors' : 'Sundry Debtors')}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Portal Access:</span>
                  </span>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px]">
                    {customer.email || 'customer@deskshark.com'} • {customer.password || 'cust123'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Financial Summary Scorecard */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2 shadow-lg">
              <div className="text-[11px] font-black uppercase text-slate-400 flex items-center justify-between">
                <span>Account Scorecard</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  Verified
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Invoiced</div>
                  <div className="text-sm font-black font-mono text-white">
                    ₹{totalDebit.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Received</div>
                  <div className="text-sm font-black font-mono text-emerald-400">
                    ₹{totalCredit.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Net Closing Balance</div>
                <div
                  className={`text-lg font-black font-mono ${
                    netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ₹{Math.abs(netBalance).toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-extrabold uppercase">
                    {netBalance >= 0 ? '(Dr - Receivable)' : '(Cr - Payable)'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Card 4: Cylinder Security Deposit & Subscription Voucher (SV) Summary */}
          <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-400 font-black text-xs border border-teal-500/30">
                ₹ Security Deposit
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    Cylinder Security Fee: ₹{(customer.depositFeePerCylinder || 2000).toLocaleString('en-IN')} / Cylinder
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-300 font-mono border border-teal-300 dark:border-teal-700">
                    SV Voucher: {customer.svVoucherNo || 'SV-2026-0089'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Total Refundable Security Paid: <strong className="text-teal-700 dark:text-teal-300 font-black">₹{(customer.totalDepositAmount || customer.depositFeePerCylinder || 2000).toLocaleString('en-IN')}</strong> (Refundable upon Cylinder return)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                customer.depositStatus === 'Refunded'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : customer.depositStatus === 'Adjusted'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                🟢 {customer.depositStatus || 'Paid'} (Active Security)
              </span>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap gap-2">
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ALL_LEDGER')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'ALL_LEDGER'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>All Statement Ledger</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
                  {ledgerWithRunningBalance.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'PAYMENTS'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                }`}
              >
                <Receipt className="h-4 w-4" />
                <span>Payments & Receipts Received ({paymentReceipts.length})</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono font-bold">
                  ₹{totalCredit.toLocaleString('en-IN')}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('INVOICES')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'INVOICES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                }`}
              >
                <FileCheck className="h-4 w-4" />
                <span>Billed Sales Invoices ({salesInvoices.length})</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono font-bold">
                  ₹{totalDebit.toLocaleString('en-IN')}
                </span>
              </button>
            </div>

          </div>

          {/* TAB 1: ALL STATEMENT LEDGER */}
          {activeTab === 'ALL_LEDGER' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Txn Date</th>
                      <th className="py-3 px-4">Voucher Type</th>
                      <th className="py-3 px-4">Voucher / Ref #</th>
                      <th className="py-3 px-4">Particulars & Descriptions</th>
                      <th className="py-3 px-4 text-right">Debit (Dr ₹)</th>
                      <th className="py-3 px-4 text-right">Credit (Cr ₹)</th>
                      <th className="py-3 px-4 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                    {ledgerWithRunningBalance.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">
                          {entry.date}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              entry.voucherType === 'Sales Invoice'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                : entry.voucherType === 'Payment Receipt'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {entry.voucherType}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {entry.voucherNo}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {entry.particulars}
                            </span>
                            {entry.paymentMode && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Mode: {entry.paymentMode} ({entry.referenceNo || 'Ref N/A'})</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {entry.debit > 0 ? (
                            <span className="text-slate-900 dark:text-slate-100">₹{entry.debit.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? (
                            <span>₹{entry.credit.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black">
                          <span
                            className={
                              entry.runningBalance >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            ₹{Math.abs(entry.runningBalance).toLocaleString('en-IN')}{' '}
                            <span className="text-[10px]">
                              {entry.runningBalance >= 0 ? 'Dr' : 'Cr'}
                            </span>
                          </span>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                  {/* Table Footer Summary */}
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700 text-xs">
                      <td colSpan={4} className="py-3 px-4 text-right uppercase">
                        Total Ledger Summary:
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        ₹{totalDebit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₹{totalCredit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Math.abs(netBalance).toLocaleString('en-IN')} ({netBalance >= 0 ? 'Dr' : 'Cr'})
                      </td>
                    </tr>
                  </tfoot>

                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS & RECEIPTS RECEIVED VIEW */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div>
                  <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-600" />
                    Payment Collection Receipts ({paymentReceipts.length} Transactions)
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Showing all payment receipts collected via UPI, Cash Deposit & Bank Cheque
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Total Collected</div>
                  <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                    ₹{totalCredit.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Receipt Date</th>
                        <th className="py-3 px-4">Receipt No</th>
                        <th className="py-3 px-4">Payment Mode</th>
                        <th className="py-3 px-4">Reference / Txn ID</th>
                        <th className="py-3 px-4">Particulars</th>
                        <th className="py-3 px-4 text-right">Amount Received (Cr ₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                      {paymentReceipts.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">
                            {entry.date}
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                            {entry.voucherNo}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {entry.paymentMode || 'Online UPI / Bank'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                            {entry.referenceNo || 'REF-N/A'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {entry.particulars}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{entry.credit.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Cleared
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedReceipt(entry)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition shadow cursor-pointer flex items-center gap-1 mx-auto"
                              title="View Official Receipt Voucher"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BILLED SALES INVOICES VIEW */}
          {activeTab === 'INVOICES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div>
                  <h4 className="font-extrabold text-blue-900 dark:text-blue-200 text-sm flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                    Billed Sales Invoices ({salesInvoices.length} Invoices)
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                    Showing all B2B LPG Commercial Sales Invoices issued to {customer.name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Total Billed</div>
                  <div className="text-xl font-black font-mono text-blue-700 dark:text-blue-300">
                    ₹{totalDebit.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Invoice Date</th>
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3 px-4">Items & Particulars</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                        <th className="py-3 px-4 text-right">GST (18%)</th>
                        <th className="py-3 px-4 text-right">Total Invoice (Dr ₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                      {salesInvoices.map((entry) => {
                        const total = entry.debit;
                        const taxable = Math.round(total / 1.18);
                        const gst = total - taxable;

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">
                              {entry.date}
                            </td>
                            <td className="py-3 px-4 font-mono font-extrabold text-blue-600 dark:text-blue-400">
                              {entry.voucherNo}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {entry.particulars}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                              ₹{taxable.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                              ₹{gst.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                              ₹{total.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                                Billed & Posted
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Drawer Sticky Bottom Footer */}
        <div className="bg-slate-100 dark:bg-slate-800 px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 shrink-0">
          <div className="text-xs text-slate-500 font-semibold">
            Pramukh Indane Gas Agency • Authorized B2B LPG ERP Ledger System
          </div>
          
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs hover:bg-slate-800 transition cursor-pointer shadow"
          >
            Close Statement View
          </button>
        </div>

      </div>

      {/* OFFICIAL PAYMENT RECEIPT VOUCHER POPUP MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Receipt Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-6 w-6 text-emerald-500" />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Official Payment Collection Receipt
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Pramukh Indane Gas Agency • ERP Payment Voucher
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Printable Receipt Slip Body */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
              
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                    PRAMUKH INDANE GAS AGENCY
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Authorized Indane Commercial LPG Distributor
                  </div>
                  <div className="text-[11px] text-slate-500">
                    GSTIN: 23AAACS1234F1Z5 • Indore (M.P.)
                  </div>
                </div>

                <div className="text-right">
                  <div className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs">
                    {selectedReceipt.voucherNo}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    Date: {selectedReceipt.date}
                  </div>
                </div>
              </div>

              {/* Receipt Particulars */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-bold">Received From Party:</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                    {customer.name}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-bold">Party GSTIN:</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {customer.gstin || 'Unregistered'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-bold">Payment Mode / Method:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedReceipt.paymentMode || 'Online Bank Transfer'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-bold">Txn Reference / Cheque No:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {selectedReceipt.referenceNo || 'REF-N/A'}
                  </span>
                </div>

                <div className="py-2">
                  <span className="text-slate-500 font-bold block mb-0.5">Remarks / Ledger Narration:</span>
                  <p className="text-slate-800 dark:text-slate-200 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-medium">
                    "{selectedReceipt.particulars}"
                  </p>
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="p-4 rounded-xl bg-emerald-600 text-white flex justify-between items-center shadow-lg">
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-emerald-100">
                    Amount Received
                  </div>
                  <div className="text-2xl font-black font-mono">
                    ₹{selectedReceipt.credit.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-white text-emerald-800 shadow">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Payment Verified
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Close Receipt
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Receipt Voucher</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
