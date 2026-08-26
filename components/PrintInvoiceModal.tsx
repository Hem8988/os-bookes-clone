'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';

interface PrintInvoiceModalProps {
  invoice: any | null;
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

  const invoiceNum = invoice.invoiceNumber || invoice.id || `INV-${Date.now().toString().slice(-5)}`;
  const invDate = invoice.date || new Date().toISOString().split('T')[0];
  const invDueDate = invoice.dueDate || invDate;
  const custName = invoice.customerName || 'B2B Customer';
  const custGstin = invoice.customerGstin || 'URP (Unregistered Dealer)';
  const custPhone = invoice.customerPhone || invoice.phone || '+91 98260 00000';
  const invStatus = invoice.status || 'PAID';
  const invPaymentMode = invoice.paymentMode || 'CASH';
  const isIgst = Boolean(invoice.isIgst);

  const rawItems = Array.isArray(invoice.items) ? invoice.items : [];
  const items = rawItems.length > 0 ? rawItems : [
    {
      id: 'inv_item_1',
      productName: '19 KG Commercial LPG Cylinder',
      hsnCode: '27111900',
      quantity: invoice.deliveredQty || 1,
      unit: 'PCS',
      unitPrice: invoice.grandTotal ? invoice.grandTotal / (invoice.deliveredQty || 1) : 1850,
      taxRate: 18,
      totalAmount: invoice.grandTotal || 1850,
    }
  ];

  const grandTotalNum = Number(invoice.grandTotal) || items.reduce((sum: number, item: any) => sum + (Number(item.totalAmount) || 0), 0);
  const subTotalNum = Number(invoice.subTotal) || Math.round(grandTotalNum / 1.18);
  const totalCgstNum = Number(invoice.totalCgst) || Math.round((grandTotalNum - subTotalNum) / 2);
  const totalSgstNum = Number(invoice.totalSgst) || Math.round((grandTotalNum - subTotalNum) / 2);
  const totalIgstNum = Number(invoice.totalIgst) || (grandTotalNum - subTotalNum);
  const roundOffNum = Number(invoice.roundOff) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Control Header (Non-printable) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm sm:text-base">
              Tax Invoice Preview #{invoiceNum}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Close"
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
                GSTIN: <strong className="text-slate-900">23AAAFP1234F1Z5</strong> | State Code: 23 (MP)
              </p>
              <p className="text-slate-500 text-[11px]">
                Indane Gas Godown Road, Main Market, Indore - 452001
              </p>
              <p className="text-slate-500 text-[11px]">
                Phone: +91 98260 00000 | Email: billing@pramukhindane.com
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded mb-1">
                TAX INVOICE
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm">{invoiceNum}</div>
              <div className="text-[11px] text-slate-600">Date: {invDate}</div>
              <div className="text-[11px] text-slate-600">Due Date: {invDueDate}</div>
            </div>
          </div>

          {/* Billed To / Customer Details */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Billed To (Customer):</div>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">{custName}</div>
              <div className="text-[11px] text-slate-600">
                GSTIN: <strong>{custGstin}</strong>
              </div>
              <div className="text-[11px] text-slate-600">Phone: {custPhone}</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Payment Summary:</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-1">
                Status: {String(invStatus).toUpperCase()} ({invPaymentMode})
              </div>
              <div className="text-[11px] text-slate-600">
                Place of Supply: {isIgst ? 'Out of State (IGST)' : 'Madhya Pradesh (23)'}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-300 text-center">#</th>
                  <th className="p-2 border-r border-slate-300">Item Description</th>
                  <th className="p-2 border-r border-slate-300 text-center">HSN</th>
                  <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right">Rate</th>
                  <th className="p-2 border-r border-slate-300 text-center">GST</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {items.map((item: any, idx: number) => {
                  const qty = Number(item.quantity) || 1;
                  const rate = Number(item.unitPrice) || 1850;
                  const amt = Number(item.totalAmount) || (qty * rate);
                  return (
                    <tr key={item.id || idx}>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-slate-900">
                        {item.productName || '19 KG Commercial LPG Cylinder'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono text-[11px]">{item.hsnCode || '27111900'}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">
                        {qty} {item.unit || 'PCS'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono">
                        ₹{rate.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{item.taxRate || 18}%</td>
                      <td className="p-2 text-right font-bold font-mono text-slate-900">
                        ₹{amt.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
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
                <span className="font-mono font-bold">₹{subTotalNum.toLocaleString('en-IN')}</span>
              </div>

              {!isIgst ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST Total (9%):</span>
                    <span className="font-mono font-bold">₹{totalCgstNum.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST Total (9%):</span>
                    <span className="font-mono font-bold">₹{totalSgstNum.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST Total (18%):</span>
                  <span className="font-mono font-bold">₹{totalIgstNum.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Round Off:</span>
                <span className="font-mono">₹{roundOffNum}</span>
              </div>

              <div className="pt-2 border-t border-slate-400 flex justify-between font-black text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="text-base text-emerald-700 font-mono">
                  ₹{grandTotalNum.toLocaleString('en-IN')}
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
