'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Header (Non-printable) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm sm:text-base">
              {docTypeLabel} Preview #{docNumber}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-6 sm:p-8 overflow-y-auto font-sans text-xs space-y-6 select-text" id="printable-invoice">
          {/* Header Branding */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                OS TECH SOLUTIONS PVT LTD
              </h1>
              <p className="text-slate-600 text-[11px] font-medium mt-0.5">
                GSTIN: <strong className="text-slate-900">23AAACO8991F1Z2</strong> | State Code: 23 (MP)
              </p>
              <p className="text-slate-500 text-[11px]">
                102 MG Road, Main Business Center, Indore - 452001
              </p>
              <p className="text-slate-500 text-[11px]">
                Phone: +91 731 4987654 | Email: billing@os-books.com
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded mb-1">
                {docTypeLabel}
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm">{docNumber}</div>
              <div className="text-[11px] text-slate-600">Date: {date}</div>
              {extraHeaderLines?.map((line) => (
                <div key={line} className="text-[11px] text-slate-600">{line}</div>
              ))}
            </div>
          </div>

          {/* Party / Status Details */}
          {(partyName || statusLabel) && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
              {partyName ? (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{partyLabel || 'Party'}:</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{partyName}</div>
                  {partyGstin && (
                    <div className="text-[11px] text-slate-600">
                      GSTIN: <strong>{partyGstin || 'URP (Unregistered)'}</strong>
                    </div>
                  )}
                  {partyPhone && <div className="text-[11px] text-slate-600">Phone: {partyPhone}</div>}
                  {partyExtraLines?.map((line) => (
                    <div key={line} className="text-[11px] text-slate-600">{line}</div>
                  ))}
                </div>
              ) : <div />}

              {statusLabel && (
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Status:</div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-1">{statusLabel}</div>
                </div>
              )}
            </div>
          )}

          {/* Detail Rows (for documents without a party/items table, e.g. Stock Adjustment) */}
          {detailRows && detailRows.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              {detailRows.map((row) => (
                <div key={row.label}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{row.label}</div>
                  <div className="font-bold text-slate-900 text-sm">{row.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Line Items Table */}
          {items && items.length > 0 && (
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
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-mono text-[11px]">{item.hsnCode}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{item.quantity}</td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono">
                        ₹{item.listPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{item.gstRate}%</td>
                      <td className="p-2 text-right font-bold font-mono text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals & Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="font-bold text-slate-900">Terms & Conditions:</div>
              <p>1. Goods once sold will not be taken back or exchanged.</p>
              <p>2. Interest @ 18% p.a. will be charged if payment is delayed.</p>
              <p>3. Subject to Indore Jurisdiction.</p>
              {remark && (
                <p className="pt-1"><span className="font-bold text-slate-900">Remark: </span>{remark}</p>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-right border-l border-slate-200 pl-4">
              {totals.map((t) => (
                <div
                  key={t.label}
                  className={
                    t.emphasize
                      ? 'pt-2 border-t border-slate-400 flex justify-between font-black text-sm text-slate-900'
                      : 'flex justify-between text-slate-600'
                  }
                >
                  <span>{t.label}:</span>
                  <span className={t.emphasize ? 'text-base text-emerald-700 font-mono' : 'font-mono font-bold'}>
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-6 flex justify-between items-end text-slate-500 text-[11px]">
            <div>Computer Generated Document (No Signature Required)</div>
            <div className="text-center font-bold text-slate-900 border-t border-slate-400 pt-1 w-48">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
