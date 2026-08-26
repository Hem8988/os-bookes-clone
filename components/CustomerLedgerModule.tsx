'use client';

import React, { useState } from 'react';
import { Customer, LedgerEntry } from '../lib/types';
import { X, Filter, Printer, Download, Paperclip, Plus, Check } from 'lucide-react';

interface CustomerLedgerModuleProps {
  customerLedger: LedgerEntry[];
  customers: Customer[];
  onClose: () => void;
}

export const CustomerLedgerModule: React.FC<CustomerLedgerModuleProps> = ({
  customerLedger: initialLedger,
  customers,
  onClose
}) => {
  const [ledgerState, setLedgerState] = useState<LedgerEntry[]>(initialLedger);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);
  
  // New entry state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [otherInfo, setOtherInfo] = useState('');
  const [voucherNo, setVoucherNo] = useState(`VOU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [billAmount, setBillAmount] = useState('0');
  const [paymentIn, setPaymentIn] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paymentInToggle, setPaymentInToggle] = useState(true);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const accountBalance = selectedCustomer ? selectedCustomer.balance : 0;
  
  let filteredLedger = selectedCustomerId && selectedCustomer
    ? ledgerState.filter(l => l.accountName === selectedCustomer.name)
    : ledgerState;

  if (filterQuery.trim()) {
    filteredLedger = filteredLedger.filter(l =>
      l.particulars.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.voucherNumber.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }

  const totalBillAmount = filteredLedger.reduce((acc, l) => acc + (l.debit || 0), 0);
  const totalPaymentIn = filteredLedger.reduce((acc, l) => acc + (l.credit || 0), 0);
  const totalDiscount = 0;
  const finalBalance = totalBillAmount - totalPaymentIn - totalDiscount;

  const handleInsertEntry = () => {
    const custName = selectedCustomer ? selectedCustomer.name : 'General Customer';
    const dAmt = Number(billAmount) || 0;
    const cAmt = Number(paymentIn) || 0;

    const newEntry: LedgerEntry = {
      id: `led_${Date.now()}`,
      date,
      accountName: custName,
      particulars: otherInfo || (dAmt > 0 ? 'Sale Order Bill' : 'Customer Payment Receipt'),
      voucherNumber: voucherNo || `VOU-${Math.floor(1000 + Math.random() * 9000)}`,
      debit: dAmt,
      credit: cAmt,
      balance: finalBalance + dAmt - cAmt,
    };

    setLedgerState([newEntry, ...ledgerState]);
    alert('🎉 LEDGER ENTRY INSERTED SUCCESSFULLY!');
    setOtherInfo('');
    setBillAmount('0');
    setPaymentIn('0');
    setVoucherNo(`VOU-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const custName = selectedCustomer ? selectedCustomer.name : 'All_Customers';
    let csv = 'Date,Voucher No,Particulars,Debit (Bill Amount),Credit (Payment In),Balance\n';
    filteredLedger.forEach(l => {
      csv += `"${l.date}","${l.voucherNumber}","${l.particulars}",${l.debit},${l.credit},${l.balance}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Ledger_${custName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearSelection = () => {
    setSelectedCustomerId('');
    setFilterQuery('');
    setShowFilterBar(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 relative">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1b9999] text-white shadow-md z-10">
        <h2 className="text-[17px] font-semibold tracking-wide flex items-center gap-2">
          <span>Customer Ledger Statement</span>
          {selectedCustomer && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">{selectedCustomer.name}</span>
          )}
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilterBar(!showFilterBar)}
            className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          
          <button 
            onClick={handlePrint}
            className="px-3 py-1.5 bg-[#6c757d] hover:bg-slate-500 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#ffba00] hover:bg-amber-400 text-slate-900 text-xs font-black rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button 
            onClick={handleClearSelection} 
            className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1 cursor-pointer"
            title="Clear Filter / Cross"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
          
          <button onClick={onClose} className="p-1.5 bg-[#f44336] hover:bg-rose-400 text-white rounded shadow-sm cursor-pointer" title="Close Ledger View">
            <X className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Filter Bar (Toggled by Filter Button) */}
      {showFilterBar && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quick Search:</span>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by Particulars or Voucher Number..."
            className="flex-1 max-w-md px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          {filterQuery && (
            <button onClick={() => setFilterQuery('')} className="text-xs text-rose-500 font-bold hover:underline">
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Customer Selection Bar */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-bold text-slate-900 dark:text-slate-100">Select Customer Account</label>
          <div className="text-sm font-bold text-rose-600 dark:text-rose-500 font-mono">
            Account Balance : ₹{accountBalance.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="w-1/2">
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full p-2 text-sm font-bold rounded bg-white border border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 outline-none cursor-pointer"
          >
            <option value="">-- All Customer Accounts --</option>
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
            {/* Input Row for New Entry */}
            <tr className="bg-white dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-600">
              <td className="p-1 border border-slate-200 dark:border-slate-700 text-center align-middle">
                <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-emerald-500" />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700 font-bold text-center align-middle text-emerald-500">+</td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="text" 
                  value={otherInfo}
                  onChange={(e) => setOtherInfo(e.target.value)}
                  placeholder="Enter Particulars / Notes"
                  className="w-full p-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 font-medium" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="text" 
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono font-bold" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="number" 
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold font-mono text-emerald-600" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="number" 
                  value={paymentIn}
                  onChange={(e) => setPaymentIn(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold font-mono text-blue-600" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full p-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold" 
                />
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50">
                <div className="w-full h-full min-h-[30px] flex items-center justify-center font-bold font-mono">
                  {(Number(billAmount) - Number(paymentIn)).toLocaleString('en-IN')}
                </div>
              </td>
              <td className="p-1 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1 h-full min-h-[30px]">
                  <button
                    type="button"
                    onClick={handleInsertEntry}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow transition-all cursor-pointer flex items-center gap-1"
                    title="Insert Entry"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>

            {/* Actual Ledger Rows */}
            {filteredLedger.map((led, idx) => (
              <tr key={led.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                  <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer" />
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold">{idx + 1}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-mono">{led.date}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-medium">{led.particulars}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{led.voucherNumber}</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold font-mono">
                  {led.debit > 0 ? `₹${led.debit.toLocaleString('en-IN')}` : '-'}
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold font-mono">
                  {led.credit > 0 ? `₹${led.credit.toLocaleString('en-IN')}` : '-'}
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-mono">0</td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-black font-mono">
                  ₹{led.balance.toLocaleString('en-IN')}
                </td>
                <td className="p-2 text-center">
                  <button 
                    onClick={() => setLedgerState(ledgerState.filter(l => l.id !== led.id))}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Delete Entry"
                  >
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
              <td className="p-2 text-right pr-4 uppercase tracking-wider font-extrabold">Total Ledger Balance</td>
              <td className="p-2 w-28"></td>
              <td className="p-2 w-28 border-l border-slate-200 dark:border-slate-700 font-mono font-bold text-emerald-600">₹{totalBillAmount.toLocaleString('en-IN')}</td>
              <td className="p-2 w-28 border-l border-slate-200 dark:border-slate-700 font-mono font-bold text-blue-600">₹{totalPaymentIn.toLocaleString('en-IN')}</td>
              <td className="p-2 w-20 border-l border-slate-200 dark:border-slate-700 font-mono">₹{totalDiscount.toLocaleString('en-IN')}</td>
              <td className="p-2 w-24 border-l border-slate-200 dark:border-slate-700 font-mono font-black text-slate-900 dark:text-white">₹{finalBalance.toLocaleString('en-IN')}</td>
              <td className="p-2 w-20 border-l border-slate-200 dark:border-slate-700"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
