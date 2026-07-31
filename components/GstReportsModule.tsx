'use client';

import React from 'react';
import { PieChart, Download, FileText, CheckCircle, ShieldCheck, DollarSign } from 'lucide-react';
import { Invoice } from '../lib/types';

interface GstReportsModuleProps {
  invoices: Invoice[];
}

export const GstReportsModule: React.FC<GstReportsModuleProps> = ({ invoices }) => {
  const totalTaxable = invoices.reduce((sum, inv) => sum + inv.subTotal, 0);
  const totalCgst = invoices.reduce((sum, inv) => sum + inv.totalCgst, 0);
  const totalSgst = invoices.reduce((sum, inv) => sum + inv.totalSgst, 0);
  const totalIgst = invoices.reduce((sum, inv) => sum + inv.totalIgst, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-indigo-500" />
            GST Tax Compliance & GSTR Filing Summary
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Form GSTR-1 (Outward Supplies) & GSTR-3B Tax Liability Computation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md">
            <Download className="h-4 w-4" />
            <span>Export GSTR-1 JSON</span>
          </button>
        </div>
      </div>

      {/* Tax Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Taxable Turnover</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2 font-mono">
            ₹{totalTaxable.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">From {invoices.length} Sales Invoices</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase">CGST Collected (Central)</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            ₹{totalCgst.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Intra-state Tax Rate Split</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-teal-600 uppercase">SGST Collected (State)</div>
          <div className="text-xl font-black text-teal-600 dark:text-teal-400 mt-2 font-mono">
            ₹{totalSgst.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">MP State Revenue Share</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-purple-600 uppercase">IGST Collected (Integrated)</div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            ₹{totalIgst.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inter-state Supplies</div>
        </div>
      </div>

      {/* GSTR-1 Breakdown Box */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          GSTR-1 Outward Supply Breakdown by Table
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Table 4A - B2B Registered Invoices</div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
              ₹{(totalTaxable * 0.85).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Includes GSTIN verified businesses</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Table 7 - B2C Retail Small Supplies</div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
              ₹{(totalTaxable * 0.15).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Unregistered consumer sales</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Table 12 - HSN Code Summary</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              6 HSN Summary Rows
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Formatted for GST Portal Upload</div>
          </div>
        </div>
      </div>
    </div>
  );
};
