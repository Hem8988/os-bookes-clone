'use client';

import React from 'react';
import { Printer, X, Download, Share2, CheckCircle2, Building2 } from 'lucide-react';
import { Invoice } from '../lib/types';

interface PrintInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  invoice,
  onClose,
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Header (Non-printable) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm sm:text-base">
              Tax Invoice Preview #{invoice.invoiceNumber}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Content */}
        <div className="p-6 sm:p-8 overflow-y-auto font-sans text-xs space-y-6 select-text" id="printable-invoice">
          {/* Header Branding */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                PRAMUKH INDANE GAS AGENCY
              </h1>
              <p className="text-slate-600 text-[11px] font-medium mt-0.5">
                GSTIN: <strong className="text-slate-900">24AAAFP1234F1Z5</strong> | State Code: 23 (MP)
              </p>
              <p className="text-slate-500 text-[11px]">
                Indane Gas Godown Road, Main Market, Indore - 452001
              </p>
              <p className="text-slate-500 text-[11px]">
                Phone: +91 98765 43210 | Email: billing@pramukhindane.com
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded mb-1">
                TAX INVOICE
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm">{invoice.invoiceNumber}</div>
              <div className="text-[11px] text-slate-600">Date: {invoice.date}</div>
              <div className="text-[11px] text-slate-600">Due Date: {invoice.dueDate}</div>
            </div>
          </div>

          {/* Billed To / Customer Details */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Billed To (Customer):</div>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">{invoice.customerName}</div>
              <div className="text-[11px] text-slate-600">
                GSTIN: <strong>{invoice.customerGstin || 'URP (Unregistered)'}</strong>
              </div>
              <div className="text-[11px] text-slate-600">Phone: {invoice.customerPhone}</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Payment Summary:</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-1">
                Status: {invoice.status.toUpperCase()} ({invoice.paymentMode})
              </div>
              <div className="text-[11px] text-slate-600">
                Place of Supply: {invoice.isIgst ? 'Out of State (IGST)' : 'Madhya Pradesh (23)'}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-300">#</th>
                  <th className="p-2 border-r border-slate-300">Item Description</th>
                  <th className="p-2 border-r border-slate-300">HSN</th>
                  <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right">Rate</th>
                  <th className="p-2 border-r border-slate-300 text-center">GST</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300 font-bold text-slate-900">
                      {item.productName}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-mono text-[11px]">{item.hsnCode}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">
                      ₹{item.unitPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">{item.taxRate}%</td>
                    <td className="p-2 text-right font-bold font-mono text-slate-900">
                      ₹{item.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="font-bold text-slate-900">Terms & Conditions:</div>
              <p>1. Goods once sold will not be taken back or exchanged.</p>
              <p>2. Interest @ 18% p.a. will be charged if payment is delayed.</p>
              <p>3. Subject to Indore Jurisdiction.</p>
            </div>

            <div className="space-y-1.5 text-xs text-right border-l border-slate-200 pl-4">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span className="font-mono font-bold">₹{invoice.subTotal.toLocaleString('en-IN')}</span>
              </div>

              {!invoice.isIgst ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST Total:</span>
                    <span className="font-mono font-bold">₹{invoice.totalCgst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST Total:</span>
                    <span className="font-mono font-bold">₹{invoice.totalSgst.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST Total:</span>
                  <span className="font-mono font-bold">₹{invoice.totalIgst.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Round Off:</span>
                <span className="font-mono">₹{invoice.roundOff}</span>
              </div>

              <div className="pt-2 border-t border-slate-400 flex justify-between font-black text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="text-base text-emerald-700 font-mono">
                  ₹{invoice.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-6 flex justify-between items-end text-slate-500 text-[11px]">
            <div>Computer Generated Invoice (No Signature Required)</div>
            <div className="text-center font-bold text-slate-900 border-t border-slate-400 pt-1 w-48">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
