'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCompany } from '../lib/useCompany';

interface InvoiceItemView {
  id?: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate?: number;
  taxableAmount?: number;
  totalAmount: number;
}

export interface InvoiceView {
  id?: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerGstin?: string | null;
  customerPhone?: string;
  items: InvoiceItemView[];
  subTotal?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount?: number;
  balanceAfter?: number | null;
  paymentMode?: string;
  status?: string;
  isIgst?: boolean;
  notes?: string | null;
}

interface PrintInvoiceModalProps {
  invoice: InvoiceView | null;
  onClose: () => void;
}

const inr = (n: number | null | undefined) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, onClose }) => {
  const company = useCompany();
  if (!invoice) return null;

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const paid = Number(invoice.paidAmount || 0);
  const due = Math.max(Number(invoice.grandTotal) - paid, 0);
  const upiLink =
    company.upiId && due > 0 && invoice.status !== 'Cancelled'
      ? `upi://pay?${new URLSearchParams({ pa: company.upiId, pn: company.name, am: due.toFixed(2), cu: 'INR', tr: invoice.invoiceNumber, tn: `Bill ${invoice.invoiceNumber}` })}`
      : null;
  const rates = [...new Set(items.map((i) => Number(i.taxRate || 0)))];
  const rateLabel = rates.length === 1 ? `${rates[0]}%` : 'mixed';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm sm:text-base">Tax Invoice {invoice.invoiceNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition-all cursor-pointer">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto font-sans text-xs space-y-6 select-text" id="printable-invoice">
          <div className="flex justify-between items-start border-b border-slate-300 pb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">{company.legalName || company.name}</h1>
              {company.gstin && (
                <p className="text-slate-600 text-[11px] font-medium mt-0.5">
                  GSTIN: <strong className="text-slate-900">{company.gstin}</strong>
                  {company.stateCode && <> | State Code: {company.stateCode}</>}
                </p>
              )}
              {company.address && <p className="text-slate-500 text-[11px]">{company.address}</p>}
              {(company.phone || company.email) && (
                <p className="text-slate-500 text-[11px]">
                  {company.phone && <>Phone: {company.phone}</>}
                  {company.phone && company.email && ' | '}
                  {company.email && <>Email: {company.email}</>}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded mb-1">
                {invoice.status === 'Cancelled' ? 'CANCELLED' : 'TAX INVOICE'}
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm">{invoice.invoiceNumber}</div>
              <div className="text-[11px] text-slate-600">Date: {invoice.date}</div>
              {invoice.dueDate && <div className="text-[11px] text-slate-600">Due: {invoice.dueDate}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Billed To</div>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">{invoice.customerName}</div>
              <div className="text-[11px] text-slate-600">
                GSTIN: <strong>{invoice.customerGstin || 'Unregistered'}</strong>
              </div>
              {invoice.customerPhone && <div className="text-[11px] text-slate-600">Phone: {invoice.customerPhone}</div>}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Payment</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-1">
                {invoice.status || 'Unpaid'} {invoice.paymentMode ? `(${invoice.paymentMode})` : ''}
              </div>
              <div className="text-[11px] text-slate-600">Tax: {invoice.isIgst ? 'IGST (inter-state)' : 'CGST + SGST'}</div>
            </div>
          </div>

          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center">#</th>
                <th className="p-2 border-r border-slate-300">Item</th>
                <th className="p-2 border-r border-slate-300 text-center">HSN</th>
                <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                <th className="p-2 border-r border-slate-300 text-right">Rate</th>
                <th className="p-2 border-r border-slate-300 text-center">GST</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{item.productName}</td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono text-[11px]">{item.hsnCode || '-'}</td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold">
                    {item.quantity} {item.unit || ''}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right font-mono">{inr(item.unitPrice)}</td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold">{item.taxRate ?? 0}%</td>
                  <td className="p-2 text-right font-bold font-mono text-slate-900">{inr(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-[11px] text-slate-600">
              {invoice.notes && <p>{invoice.notes}</p>}
              {upiLink && (
                <div className="flex items-center gap-3">
                  <QRCodeSVG value={upiLink} size={84} />
                  <div>
                    <div className="font-bold text-slate-900">Scan to pay {inr(due)}</div>
                    <div>UPI: {company.upiId}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5 text-xs text-right border-l border-slate-200 pl-4">
              <Row label="Taxable value" value={inr(invoice.subTotal)} />
              {invoice.isIgst ? (
                <Row label={`IGST (${rateLabel})`} value={inr(invoice.totalIgst)} />
              ) : (
                <>
                  <Row label="CGST" value={inr(invoice.totalCgst)} />
                  <Row label="SGST" value={inr(invoice.totalSgst)} />
                </>
              )}
              <Row label="Round off" value={inr(invoice.roundOff)} />
              <div className="pt-2 border-t border-slate-400 flex justify-between font-black text-sm text-slate-900">
                <span>Grand Total</span>
                <span className="text-base text-emerald-700 font-mono">{inr(invoice.grandTotal)}</span>
              </div>
              <Row label="Paid" value={inr(paid)} />
              <Row label="Balance on this bill" value={inr(due)} />
              {invoice.balanceAfter != null && <Row label="Total outstanding after this bill" value={inr(invoice.balanceAfter)} />}
            </div>
          </div>

          <div className="pt-6 flex justify-between items-end text-slate-500 text-[11px]">
            <div>Computer generated invoice.</div>
            <div className="text-center font-bold text-slate-900 border-t border-slate-400 pt-1 w-48">For {company.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-slate-600">
    <span>{label}</span>
    <span className="font-mono font-bold">{value}</span>
  </div>
);
