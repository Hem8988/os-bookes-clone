'use client';

import React, { useState } from 'react';
import { Customer, LedgerEntry } from '../lib/types';
import { X, Filter, Printer, Download, Paperclip, Plus } from 'lucide-react';

interface CustomerLedgerModuleProps {
  customerLedger: LedgerEntry[];
  customers: Customer[];
  onClose: () => void;
}

export const CustomerLedgerModule: React.FC<CustomerLedgerModuleProps> = ({
  customerLedger,
  customers,
  onClose
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // New entry state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [otherInfo, setOtherInfo] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [billAmount, setBillAmount] = useState('0');
  const [paymentIn, setPaymentIn] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paymentInToggle, setPaymentInToggle] = useState(true);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const accountBalance = selectedCustomer ? selectedCustomer.balance : 0;
  
  const filteredLedger = selectedCustomerId && selectedCustomer
    ? customerLedger.filter(l => l.accountName === selectedCustomer.name)
    : customerLedger;

  const totalBillAmount = filteredLedger.reduce((acc, l) => acc + (l.debit || 0), 0);
  const totalPaymentIn = filteredLedger.reduce((acc, l) => acc + (l.credit || 0), 0);
  const totalDiscount = 0; // Not in LedgerEntry currently
  const finalBalance = totalBillAmount - totalPaymentIn - totalDiscount;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 relative">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1b9999] text-white shadow-md z-10">
        <h2 className="text-[17px] font-semibold tracking-wide">Customer Ledger</h2>
        
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold rounded shadow-sm flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          
          <button className="px-3 py-1.5 bg-[#6c757d] hover:bg-slate-500 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          
          <button className="px-3 py-1.5 bg-[#ffba00] hover:bg-amber-400 text-slate-900 text-xs font-black rounded shadow-sm flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          
          <button onClick={onClose} className="p-1.5 bg-[#f44336] hover:bg-rose-400 text-white rounded shadow-sm">
            <X className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Customer Selection Bar */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-bold text-slate-900 dark:text-slate-100">Customer Name</label>
          <div className="text-sm font-bold text-rose-600 dark:text-rose-500">
            Account Balance : {accountBalance.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="w-1/2">
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full p-2 text-sm font-semibold rounded bg-white border border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="">Select Name</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-x-auto bg-white dark:bg-slate-950">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 border-collapse min-w-[900px]">
          <thead className="bg-[#343a40] text-white font-bold">
            <tr>
              <th className="p-2 border border-slate-600 w-8 text-center"></th>
              <th className="p-2 border border-slate-600 w-8 text-center">#</th>
              <th className="p-2 border border-slate-600 w-32 text-center">DATE</th>
              <th className="p-2 border border-slate-600 text-center">Other Information</th>
              <th className="p-2 border border-slate-600 w-28 text-center">Voucher No</th>
              <th className="p-2 border border-slate-600 w-28 text-center">Bill Amount</th>
              <th className="p-2 border border-slate-600 w-28 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button 
                    onClick={() => setPaymentInToggle(!paymentInToggle)}
                    className={`w-7 h-3.5 rounded-full relative transition-colors ${paymentInToggle ? 'bg-emerald-500' : 'bg-slate-500'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${paymentInToggle ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                  Payment In
                </div>
              </th>
              <th className="p-2 border border-slate-600 w-20 text-center">Dis.</th>
              <th className="p-2 border border-slate-600 w-24 text-center">Balance</th>
              <th className="p-2 border border-slate-600 w-20 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="align-top divide-y divide-slate-200 dark:divide-slate-700">
            {/* Input Row */}
            <tr className="bg-white dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-600">
              <td className="p-1 border border-slate-200 dark:border-slate-700 text-center align-middle">
                <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-emerald-500" />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700"></td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 outline-none" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="text" 
                  value={otherInfo}
                  onChange={(e) => setOtherInfo(e.target.value)}
                  placeholder="Enter Other Information"
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 outline-none placeholder:text-slate-400" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="text" 
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 outline-none" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="number" 
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 outline-none" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="number" 
                  value={paymentIn}
                  onChange={(e) => setPaymentIn(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 outline-none" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 outline-none" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50">
                <div className="w-full h-full min-h-[30px] flex items-center justify-center font-bold">
                  0
                </div>
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1 h-full min-h-[30px]">
                  <button className="p-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded">
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <button className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>

            {/* Empty space filler for screenshot accuracy */}
            {filteredLedger.length === 0 && (
              <tr>
                <td colSpan={10} className="h-64"></td>
              </tr>
            )}

            {/* Actual Ledger Rows */}
            {filteredLedger.map((led, idx) => (
              <tr key={led.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                  <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer" />
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">{idx + 1}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">{led.date}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700">{led.particulars}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-semibold text-emerald-600 dark:text-emerald-400">{led.voucherNumber}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold">
                  {led.debit > 0 ? led.debit.toLocaleString('en-IN') : '-'}
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold">
                  {led.credit > 0 ? led.credit.toLocaleString('en-IN') : '-'}
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">0</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-black">
                  {led.balance.toLocaleString('en-IN')}
                </td>
                <td className="p-2 text-center">
                  <button className="text-slate-400 hover:text-rose-500">
                    <X className="h-4 w-4 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Totals */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 z-10 flex">
        <table className="w-full text-center text-xs font-bold text-slate-900 dark:text-slate-100 min-w-[900px]">
          <tbody>
            <tr>
              <td className="p-2 w-8"></td>
              <td className="p-2 w-8"></td>
              <td className="p-2 w-32"></td>
              <td className="p-2 text-right pr-4">Total</td>
              <td className="p-2 w-28"></td>
              <td className="p-2 w-28 border-l border-slate-200 dark:border-slate-700">{totalBillAmount.toLocaleString('en-IN')}</td>
              <td className="p-2 w-28 border-l border-slate-200 dark:border-slate-700">{totalPaymentIn.toLocaleString('en-IN')}</td>
              <td className="p-2 w-20 border-l border-slate-200 dark:border-slate-700">{totalDiscount.toLocaleString('en-IN')}</td>
              <td className="p-2 w-24 border-l border-slate-200 dark:border-slate-700">{finalBalance.toLocaleString('en-IN')}</td>
              <td className="p-2 w-20 border-l border-slate-200 dark:border-slate-700"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
