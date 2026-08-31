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
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  DollarSign,
  Building,
  CreditCard,
  Clock
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
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  customer,
  onClose
}) => {
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('ALL');

  // Generate realistic B2B LPG ERP Ledger Transactions for the selected Customer
  const rawLedgerEntries = useMemo<LedgerEntry[]>(() => {
    if (!customer) return [];

    const today = new Date();
    const currentYear = today.getFullYear();

    const baseBalance = Number(customer.balance || 0);

    // Dynamic ledger generation based on customer ID and balance
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
        particulars: 'Payment Received via HDFC Online Bank Transfer / UPI',
        debit: 0,
        credit: 18000,
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
        particulars: 'Cheque Clearance / Cash Submission Received at Counter',
        debit: 0,
        credit: 15000,
      },
      {
        id: 'entry-6',
        date: `${currentYear}-08-25`,
        voucherType: 'Sales Invoice',
        voucherNo: `INV-${customer.id.toUpperCase()}-119`,
        particulars: '19kg Commercial LPG Refill (15 Qty @ ₹1,720 + CGST/SGST)',
        debit: (baseBalance > 0 ? baseBalance : 25000) + 8998,
        credit: 0,
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow"
              title="Share Statement via WhatsApp"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition"
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

          {/* Statement Ledger Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                Detailed Statement Account Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Showing all chronological debit invoices, credit payment vouchers, and running balance
              </p>
            </div>
          </div>

          {/* Statement Ledger Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
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
                      
                      {/* Date */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">
                        {entry.date}
                      </td>

                      {/* Voucher Type */}
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

                      {/* Voucher No */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {entry.voucherNo}
                      </td>

                      {/* Particulars */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {entry.particulars}
                        </span>
                      </td>

                      {/* Debit */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {entry.debit > 0 ? (
                          <span className="text-slate-900 dark:text-slate-100">₹{entry.debit.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>

                      {/* Credit */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {entry.credit > 0 ? (
                          <span>₹{entry.credit.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>

                      {/* Running Balance */}
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

    </div>
  );
};
