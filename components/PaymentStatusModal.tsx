'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { BankMaster, Customer, PurchaseOrderPayment, NarrationMaster } from '../lib/types';

interface PaymentStatusModalProps {
  isOpen: boolean;
  dueAmount: number;
  banks: BankMaster[];
  parties: Customer[];
  narrations?: NarrationMaster[];
  onAddNarration?: (narration: NarrationMaster) => void;
  defaultShippingParty?: string; // Kept for interface compatibility
  onClose: () => void;
  onSave: (payments: PurchaseOrderPayment[], shippingParty: string, attachmentName: string) => void;
}

const bankLabel = (b: BankMaster) => `${b.bankName} Cr Ac.${b.accountNumber}`;

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigitsToWords = (n: number): string => {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
};

const threeDigitsToWords = (n: number): string => {
  if (n >= 100) return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + twoDigitsToWords(n % 100) : ''}`;
  return twoDigitsToWords(n);
};

// Indian numbering system (crore/lakh/thousand)
const numberToWords = (amount: number): string => {
  const rupees = Math.floor(Math.abs(amount));
  if (rupees === 0) return 'Zero';

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(' ');
};

const amountInWords = (amount: number): string => `Rupees ${numberToWords(amount)} Only`;

export const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
  isOpen,
  dueAmount,
  banks,
  parties,
  narrations = [],
  onAddNarration,
  defaultShippingParty = '',
  onClose,
  onSave,
}) => {
  const defaultPartyName = defaultShippingParty || parties[0]?.name || 'Customer/Vendor';

  const initialRows = useMemo(() => {
    const modes: PurchaseOrderPayment[] = [
      { id: 'CASH', bankAccountId: 'CASH', bankLabel: 'Cash A/c', amount: 0, byCheque: false, remark: '' },
      { id: 'CARD', bankAccountId: 'CARD', bankLabel: 'Card Swipe', amount: 0, byCheque: false, remark: '' },
    ];
    banks.forEach(b => {
      modes.push({ id: b.id, bankAccountId: b.id, bankLabel: bankLabel(b), amount: 0, byCheque: false, remark: '' });
    });
    modes.push({ id: 'PARTY_DEBIT', bankAccountId: 'PARTY_DEBIT', bankLabel: `${defaultPartyName} Dr Ac.`, amount: 0, byCheque: false, remark: '' });
    return modes;
  }, [banks, defaultPartyName]);

  const [rows, setRows] = useState<PurchaseOrderPayment[]>(initialRows);
  const [cashTendered, setCashTendered] = useState(0);

  // Dynamic QR Popup state
  const [qrPopup, setQrPopup] = useState<{ visible: boolean; bankLabel: string; amount: number } | null>(null);

  // Narration Master list (F4) state
  const [narrationListRowId, setNarrationListRowId] = useState<string | null>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setRows(initialRows);
      setCashTendered(0);
      setQrPopup(null);
    }
  }, [isOpen, initialRows]);

  if (!isOpen) return null;

  const handleAmountChange = (id: string, amount: number) => {
    setRows(prev => {
      const otherPaid = prev.reduce((sum, r) => sum + (r.id === id ? 0 : (r.amount || 0)), 0);
      const maxAllowed = Math.max(0, Math.abs(dueAmount) - otherPaid);
      const clampedAmount = Math.min(Math.max(0, amount), maxAllowed);
      return prev.map(r => r.id === id ? { ...r, amount: clampedAmount } : r);
    });
  };

  const handleAmountBlur = (id: string, amount: number) => {
    if (amount > 0 && id !== 'CASH' && id !== 'CARD' && id !== 'PARTY_DEBIT') {
      const bankRow = rows.find(r => r.id === id);
      if (bankRow) {
        setQrPopup({ visible: true, bankLabel: bankRow.bankLabel, amount });
      }
    }
  };

  const handleRemarkChange = (id: string, remark: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, remark } : r));
  };

  const handleRemarkBlur = (remark: string) => {
    const trimmed = remark.trim();
    if (!trimmed) return;
    const alreadyExists = narrations.some(n => n.text.trim().toLowerCase() === trimmed.toLowerCase());
    if (!alreadyExists) {
      onAddNarration?.({ id: `narr-${Date.now()}`, text: trimmed });
    }
  };

  const totalPaid = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const remaining = Math.max(0, Math.abs(dueAmount) - totalPaid);
  const isFullySettled = remaining === 0;

  const cashRow = rows.find(r => r.id === 'CASH');
  const cashAmount = cashRow?.amount || 0;
  const cashReturned = Math.max(0, cashTendered - cashAmount);

  const handleSave = () => {
    const validPayments = rows.filter(r => r.amount > 0);
    // defaultShippingParty mapping is preserved for parent interface requirements.
    onSave(validPayments, defaultShippingParty, '');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      {/* Dynamic QR Popup */}
      {qrPopup?.visible && (
        <div className="absolute z-[70] inset-0 flex items-center justify-center bg-transparent">
          <div className="bg-white border-2 border-slate-800 shadow-2xl rounded-sm w-[400px] overflow-hidden flex flex-col animate-in zoom-in duration-150">
            <div className="bg-slate-900 text-white text-center py-2 text-sm font-semibold">
              Bank Dynamic QR Generator
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm font-semibold text-slate-800">
                {qrPopup.bankLabel} Amount: ₹ {qrPopup.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Entered.<br />
                Do you want to generate a dynamic UPI QR Code?
              </p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setQrPopup(null)}
                  className="px-6 py-1.5 border border-green-600 text-green-700 font-bold text-sm hover:bg-green-50"
                >
                  Yes (Y)
                </button>
                <button
                  type="button"
                  onClick={() => setQrPopup(null)}
                  className="px-6 py-1.5 border border-red-600 text-red-700 font-bold text-sm hover:bg-red-50"
                >
                  No (N)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl bg-white border border-slate-300 shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">Amount Settlement Details (Advanced Multi-Mode Tally POS Window)</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Top Info Bar */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5 border border-sky-400 bg-sky-50 px-4 py-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-sky-700">Party Ledger Name:</div>
                  <div className="text-sm font-bold text-red-600">{defaultPartyName}</div>
                </div>
                <div className={`font-bold text-2xl px-4 py-4 text-right transition-colors ${isFullySettled ? 'bg-emerald-600 text-white' : 'bg-purple-700 text-yellow-300'}`}>
                   ₹ {Math.abs(dueAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-base text-slate-700 font-semibold text-right">
         
                {amountInWords(dueAmount)}
              </div>
            </div>

            <div className={`w-80 border-2 px-4 py-2 ${isFullySettled ? 'border-amber-400 bg-amber-50' : 'border-rose-400 bg-rose-50'}`}>
              <div className="text-xs text-amber-700 font-semibold mb-1">LIVE REMAINING BALANCE</div>
              <div className="bg-white border border-slate-300 py-1 text-center font-bold text-lg text-green-600">
                ₹ {remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {isFullySettled && '(Fully Settled)'}
              </div>
              <div className="text-[9px] text-slate-500 text-center mt-1">*Updates instantly as you type payment modes below</div>
            </div>
          </div>

          {/* Table Headers */}
          <div className="grid grid-cols-[120px_200px_150px_1fr] gap-4 px-2 pb-2 border-b-2 border-slate-800 text-[13px] font-semibold text-slate-700">
            <div>Payment Mode</div>
            <div>Ledger Account Details</div>
            <div>Amount (₹)</div>
            <div>Large Narration / Remarks [F4: List / F8: Delete]</div>
          </div>

          {/* Payment Rows */}
          <div className="space-y-3">
            {(() => {
              const nextEmptyId = rows.find(r => !r.amount)?.id;
              return rows.map((row) => {
              const bankIndex = banks.findIndex(b => b.id === row.id);
              const paymentModeLabel = row.id === 'CASH' ? 'CASH' : row.id === 'CARD' ? 'CARD' : row.id === 'PARTY_DEBIT' ? 'PARTY DEBIT' : `BANK ${bankIndex + 1}`;
              const remarkPlaceholder =
                row.id === 'CASH' ? 'Cash received against retail counter bill' :
                row.id === 'CARD' ? 'Card payment received against retail counter bill' :
                row.id === 'PARTY_DEBIT' ? `Balance adjusted against ${defaultPartyName} ledger` :
                `Payment received via ${row.bankLabel}`;
              return (
              <div key={row.id} className="grid grid-cols-[120px_200px_150px_1fr] gap-4 px-2 items-center text-sm">
                <div className="font-medium text-slate-700">{paymentModeLabel}</div>
                <div className="text-sky-600 font-medium text-[13px]">{row.bankLabel}</div>
                <div>
                  <input
                    type="number"
                    min={0}
                    value={row.amount || ''}
                    onChange={(e) => handleAmountChange(row.id, parseFloat(e.target.value) || 0)}
                    onBlur={(e) => handleAmountBlur(row.id, parseFloat(e.target.value) || 0)}
                    placeholder={row.id === nextEmptyId && remaining > 0 ? remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    className="w-full border border-slate-300 bg-amber-50/30 px-2 py-1.5 text-right focus:outline-none focus:border-sky-500 text-black font-black text-lg"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={row.remark}
                    onChange={(e) => handleRemarkChange(row.id, e.target.value)}
                    onBlur={(e) => handleRemarkBlur(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'F4') {
                        e.preventDefault();
                        handleRemarkBlur(row.remark || '');
                        setNarrationListRowId(row.id);
                      } else if (e.key === 'F8') {
                        e.preventDefault();
                        handleRemarkChange(row.id, '');
                        setNarrationListRowId(null);
                      }
                    }}
                    placeholder={remarkPlaceholder}
                    className="w-full border border-slate-300 pl-2 pr-7 py-1 focus:outline-none focus:border-sky-500 text-[13px] text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onMouseDown={() => handleRemarkBlur(row.remark || '')}
                    onClick={() => setNarrationListRowId(narrationListRowId === row.id ? null : row.id)}
                    title="Narration List (F4)"
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {narrationListRowId === row.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNarrationListRowId(null)} />
                      <div className="absolute z-50 top-full mt-1 left-0 w-full max-h-48 overflow-y-auto bg-white border border-slate-300 shadow-xl rounded-sm">
                        {narrations.length === 0 ? (
                          <div className="p-2 text-xs text-slate-500 text-center">No narration master found.</div>
                        ) : (
                          narrations.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                handleRemarkChange(row.id, n.text);
                                setNarrationListRowId(null);
                              }}
                              className="px-2 py-1.5 text-[13px] text-slate-800 cursor-pointer hover:bg-sky-50 border-b border-slate-100 last:border-b-0"
                            >
                              {n.text}
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              );
            });
            })()}
          </div>

          {/* Summary Section */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-blue-200 bg-blue-50/50 p-4">
            <div className="text-sm font-medium text-slate-700">
                    <div>  </div>
                    <br></br>
              Total Bill Amount: ₹ {dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm font-medium text-green-600">
            <div>  </div>
                    <br></br>
              Total Settled Amount: ₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm font-medium text-slate-700 text-right space-y-1">
              <div>Party Debit</div>
              <div>Remaining Amount: ₹ {remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Cash Calculator & Actions */}
          <div className="flex gap-4">
            <div className="flex-1 border border-slate-300 p-4 space-y-4 bg-slate-50/50">
              <div className="flex items-center justify-between max-w-sm">
                <span className="text-[13px] text-slate-600 font-medium">Cash Tendered:</span>
                <input
                  type="number"
                  min={0}
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                  className="w-32 text-right font-medium text-sm text-slate-800 border border-slate-300 bg-white px-2 py-1 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex items-center justify-between max-w-sm">
                <span className="text-[13px] text-slate-600 font-medium">Cash to be Returned:</span>
                <span className="w-32 text-right font-semibold text-sm text-green-600">
                  {cashReturned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <button
                type="button"
                onClick={handleSave}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 text-sm font-medium"
              >
                Save / End
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-500 px-8 py-2 text-sm font-medium"
              >
                Quit [Esc]
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-900 text-white/70 text-[11px] px-4 py-2 text-center mt-auto">
          [ F4 - List ] [ F8 - Delete ] [ F2 / END - Save Entire Settlement Window ]
        </div>
      </div>
    </div>
  );
};
