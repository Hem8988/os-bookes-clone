'use client';

import React from 'react';
import { Printer, X, Building2, ShieldCheck, CheckCircle2, QrCode, FileText } from 'lucide-react';
import { PurchaseOrderItem } from '../lib/types';

export interface PrintTotal {
  label: string;
  value: string;
  emphasize?: boolean;
}

export interface PrintDocumentModalProps {
  docTypeLabel: string;
  docNumber: string;
  date: string;
  statusLabel?: string;
  extraHeaderLines?: string[];
  partyLabel?: string;
  partyName?: string;
  partyGstin?: string;
  partyPhone?: string;
  partyExtraLines?: string[];
  items?: PurchaseOrderItem[];
  totals: PrintTotal[];
  detailRows?: { label: string; value: string }[];
  remark?: string;
  onClose: () => void;
}

function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  const intPart = Math.floor(Math.abs(amount));
  let result = '';

  const crores = Math.floor(intPart / 10000000);
  const lakhs = Math.floor((intPart % 10000000) / 100000);
  const thousands = Math.floor((intPart % 100000) / 1000);
  const hundreds = intPart % 1000;

  if (crores > 0) result += convertGroup(crores) + ' Crore ';
  if (lakhs > 0) result += convertGroup(lakhs) + ' Lakh ';
  if (thousands > 0) result += convertGroup(thousands) + ' Thousand ';
  if (hundreds > 0) result += convertGroup(hundreds) + ' ';

  return (result.trim() || 'Zero') + ' Rupees Only';
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  docTypeLabel,
  docNumber,
  date,
  statusLabel,
  extraHeaderLines,
  partyLabel,
  partyName,
  partyGstin,
  partyPhone,
  partyExtraLines,
  items,
  totals,
  detailRows,
  remark,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Extract main total amount for words & calculations
  const grandTotalItem = totals.find((t) => t.emphasize) || totals[totals.length - 1];
  const grandTotalNum = grandTotalItem
    ? parseFloat(grandTotalItem.value.replace(/[^0-9.-]+/g, '')) || 0
    : 0;

  // Fallback items if items array is missing or empty (e.g. legacy SO record)
  const displayItems: PurchaseOrderItem[] = (items && items.length > 0) ? items : [
    {
      id: 'default-item-1',
      productId: 'p-1',
      productName: '19 KG Commercial LPG Cylinder (B2B Supply)',
      hsnCode: '27111900',
      gstRate: 18,
      quantity: 10,
      mrp: 2200,
      listPrice: grandTotalNum > 0 ? (grandTotalNum / 1.18) / 10 : 1950,
      taxExcluded: true,
      amount: grandTotalNum > 0 ? grandTotalNum : 23010,
    }
  ];

  // Calculate items summary for GST Table
  const hsnMap = displayItems.reduce((acc, item) => {
    const hsn = item.hsnCode || '27111900';
    const priceExcl = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
    const grossTaxable = priceExcl * item.quantity;
    const discType = item.discountType || (item.discountPercent ? 'percent' : 'percent');
    const discVal = item.discountValue ?? item.discountPercent ?? (item.discountAmount || 0);
    const discAmt = item.discountAmount !== undefined && item.discountAmount > 0
      ? item.discountAmount
      : (discType === 'percent' ? (grossTaxable * discVal) / 100 : discVal);
    const taxable = Math.max(0, grossTaxable - discAmt);
    const taxAmt = (taxable * item.gstRate) / 100;
    
    if (!acc[hsn]) {
      acc[hsn] = {
        hsn,
        gstRate: item.gstRate,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        totalTax: 0,
      };
    }
    acc[hsn].taxable += taxable;
    acc[hsn].cgst += taxAmt / 2;
    acc[hsn].sgst += taxAmt / 2;
    acc[hsn].totalTax += taxAmt;
    return acc;
  }, {} as Record<string, { hsn: string; gstRate: number; taxable: number; cgst: number; sgst: number; totalTax: number }>);

  const hsnSummary = Object.values(hsnMap);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
        
        {/* Top Control Header (Non-printable) */}
        <div className="print:hidden flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {docTypeLabel} Preview <span className="font-mono text-teal-300">#{docNumber}</span>
              </h3>
              <p className="text-[11px] text-slate-400">Official GST Tax Invoice & Document Format</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Document (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (A4 Proportional) */}
        <div className="p-6 sm:p-8 md:p-10 overflow-y-auto font-sans text-xs space-y-5 select-text bg-white" id="printable-invoice">
          
          {/* Header Branding & Official GST Info */}
          <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
            {/* Top Bar Banner */}
            <div className="bg-slate-900 text-white px-4 py-1.5 flex items-center justify-between font-bold text-[11px] uppercase tracking-wider">
              <span>{docTypeLabel === 'Sale Order' ? 'TAX INVOICE / SALE ORDER' : docTypeLabel.toUpperCase()}</span>
              <span className="text-teal-300 font-semibold">ORIGINAL FOR RECIPIENT</span>
            </div>

            {/* Main Header Details */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-slate-50/50">
              {/* Company Logo & Details (7 Cols) */}
              <div className="md:col-span-7 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-black text-sm">
                    PI
                  </div>
                  <h1 className="text-lg md:text-xl font-black text-slate-950 tracking-tight">
                    PRAMUKH INDANE GAS AGENCY
                  </h1>
                </div>
                <p className="text-[11px] font-semibold text-slate-700">
                  Authorized Commercial & Industrial LPG Distributor
                </p>
                <p className="text-[11px] text-slate-600">
                  Indane Gas Godown Road, Main Market, Indore, Madhya Pradesh - 452001
                </p>
                <div className="flex flex-wrap gap-x-3 text-[11px] text-slate-700 font-medium pt-0.5">
                  <span>GSTIN: <strong className="text-slate-900 font-mono">23AAAFP1234F1Z5</strong></span>
                  <span>State: <strong className="text-slate-900 font-mono">23 (MP)</strong></span>
                  <span>PAN: <strong className="text-slate-900 font-mono">AAAFP1234F</strong></span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Phone: <strong>+91 98260 00000</strong> | Email: <strong>billing@pramukhindane.com</strong>
                </p>
              </div>

              {/* Document Metadata (5 Cols) */}
              <div className="md:col-span-5 bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Document No:</span>
                  <span className="font-mono font-black text-slate-900 text-xs">{docNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Date of Issue:</span>
                  <span className="font-bold text-slate-800">{date}</span>
                </div>
                {statusLabel && (
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className="font-bold text-emerald-700 uppercase">{statusLabel}</span>
                  </div>
                )}
                {extraHeaderLines?.map((line) => (
                  <div key={line} className="flex justify-between border-b border-slate-100 pb-1 text-slate-700">
                    <span>{line}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500 font-medium">Place of Supply:</span>
                  <span className="font-semibold text-slate-800">Madhya Pradesh (23)</span>
                </div>
              </div>
            </div>

            {/* Billed To / Buyer Information Section */}
            {(partyName || partyGstin || partyPhone) && (
              <div className="border-t border-slate-300 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Billed To / Buyer Details:
                  </div>
                  <div className="text-sm font-black text-slate-900">{partyName || 'B2B Customer'}</div>
                  {partyGstin && (
                    <div className="text-[11px] text-slate-700 mt-0.5">
                      GSTIN: <strong className="font-mono text-slate-900">{partyGstin}</strong>
                    </div>
                  )}
                  {partyPhone && (
                    <div className="text-[11px] text-slate-600">
                      Contact: <strong>{partyPhone}</strong>
                    </div>
                  )}
                  {partyExtraLines?.map((line) => (
                    <div key={line} className="text-[11px] text-slate-600">{line}</div>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Dispatch & Logistics Info:
                  </div>
                  <div className="text-[11px] text-slate-700">
                    Dispatch Mode: <strong>Agency Delivery Vehicle</strong>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    Reverse Charge: <strong>No (Applicable to Supplier)</strong>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    Payment Terms: <strong>Standard Commercial Credit</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detail Rows (for documents like Stock Adjustment) */}
          {detailRows && detailRows.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              {detailRows.map((row) => (
                <div key={row.label} className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{row.label}:</span>
                  <span className="font-bold text-slate-900 text-xs">{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Product Items Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-2.5 w-10 text-center border-r border-slate-800">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Product / Item Description</th>
                  <th className="py-2.5 px-2.5 w-20 text-center border-r border-slate-800">HSN/SAC</th>
                  <th className="py-2.5 px-2.5 w-14 text-center border-r border-slate-800">Qty</th>
                  <th className="py-2.5 px-2.5 w-20 text-right border-r border-slate-800">Rate (₹)</th>
                  <th className="py-2.5 px-2.5 w-20 text-center border-r border-slate-800">Discount</th>
                  <th className="py-2.5 px-2.5 w-20 text-right border-r border-slate-800">Taxable (₹)</th>
                  <th className="py-2.5 px-2.5 w-16 text-center border-r border-slate-800">GST %</th>
                  <th className="py-2.5 px-3 w-24 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {displayItems.map((item, idx) => {
                  const priceExcl = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
                  const grossTaxable = priceExcl * item.quantity;
                  const discType = item.discountType || (item.discountPercent ? 'percent' : 'percent');
                  const discVal = item.discountValue ?? item.discountPercent ?? (item.discountAmount || 0);
                  const discAmt = item.discountAmount !== undefined && item.discountAmount > 0
                    ? item.discountAmount
                    : (discType === 'percent' ? (grossTaxable * discVal) / 100 : discVal);
                  const taxableAmt = Math.max(0, grossTaxable - discAmt);
                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-400 font-bold border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-950 border-r border-slate-200">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-center text-slate-600 border-r border-slate-200">
                        {item.hsnCode || '27111900'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-slate-900 border-r border-slate-200">
                        {item.quantity} PCS
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                        ₹{item.listPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-700 border-r border-slate-200">
                        {discAmt > 0 ? (
                          <span className="font-bold text-rose-600">
                            {discType === 'fixed' ? `₹${discVal}` : `${discVal}%`}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">
                        ₹{taxableAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-emerald-700 border-r border-slate-200">
                        @{item.gstRate}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* GST Breakdown Table (HSN Wise Analysis) */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300">
              GST Tax Breakdown (HSN / SAC Wise Summary)
            </div>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-3">HSN/SAC</th>
                  <th className="py-1.5 px-3 text-right">Taxable Value (₹)</th>
                  <th className="py-1.5 px-3 text-right">CGST (₹)</th>
                  <th className="py-1.5 px-3 text-right">SGST (₹)</th>
                  <th className="py-1.5 px-3 text-right">Total Tax Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {hsnSummary.map((h) => (
                  <tr key={h.hsn}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{h.hsn}</td>
                    <td className="py-1.5 px-3 text-right">₹{h.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 text-right">₹{h.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (@{h.gstRate / 2}%)</td>
                    <td className="py-1.5 px-3 text-right">₹{h.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (@{h.gstRate / 2}%)</td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹{h.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commercials, Bank Details & Totals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
            {/* Left: Amount in Words, Bank Details, Terms (7 Cols) */}
            <div className="md:col-span-7 space-y-3">
              {/* Amount in Words */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Amount In Words:
                </span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block italic">
                  {numberToWordsINR(grandTotalNum)}
                </span>
              </div>

              {/* Bank Details & UPI */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Bank Transfer Details:
                  </span>
                  <div>Bank: <strong>HDFC Bank Ltd</strong></div>
                  <div>A/C No: <strong className="font-mono">50200088991122</strong></div>
                  <div>IFSC: <strong className="font-mono">HDFC0001234</strong></div>
                  <div>Branch: <strong>Indore Main Branch</strong></div>
                </div>
                <div className="text-right flex flex-col items-end justify-center">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg">
                    <QrCode className="h-3.5 w-3.5" /> UPI ID: pramukh@upi
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Instant Bank Settlement</span>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700">Terms & Conditions:</div>
                <p>1. Goods once sold will not be taken back or exchanged.</p>
                <p>2. Interest @ 18% p.a. will be charged if payment is delayed beyond credit terms.</p>
                <p>3. Subject to Indore Jurisdiction only.</p>
                {remark && (
                  <p className="pt-1 text-slate-800 font-semibold">Special Instructions: {remark}</p>
                )}
              </div>
            </div>

            {/* Right: Commercial Calculations (5 Cols) */}
            <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1.5">
                Bill Summary
              </div>

              {totals.map((t) => (
                <div
                  key={t.label}
                  className={
                    t.emphasize
                      ? 'pt-2 mt-2 border-t-2 border-slate-900 flex justify-between items-center text-sm font-black text-slate-950'
                      : 'flex justify-between text-slate-600'
                  }
                >
                  <span className={t.emphasize ? 'text-slate-900 font-black' : 'font-medium'}>{t.label}:</span>
                  <span className={t.emphasize ? 'text-lg text-emerald-700 font-mono font-black' : 'font-mono font-bold text-slate-800'}>
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures & Seal Footer */}
          <div className="pt-8 grid grid-cols-2 gap-4 text-[11px] items-end">
            <div className="text-left space-y-8">
              <div className="text-slate-400 text-[10px]">Customer / Receiver&apos;s Seal & Signature</div>
              <div className="border-t border-slate-300 pt-1 w-44 font-semibold text-slate-700">
                Authorized Receiver
              </div>
            </div>

            <div className="text-right space-y-8">
              <div className="text-slate-900 font-bold">
                For PRAMUKH INDANE GAS AGENCY
              </div>
              <div className="border-t border-slate-900 pt-1 inline-block w-48 font-bold text-slate-950">
                Authorised Signatory
              </div>
            </div>
          </div>

          {/* Computer Generated Notice */}
          <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200">
            This is a Computer Generated Tax Document under the Central Goods and Services Tax Act, 2017.
          </div>
        </div>
      </div>
    </div>
  );
};

