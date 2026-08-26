'use client';

import React, { useState, useEffect } from 'react';
import ApprovalQueueModule from '@/components/ApprovalQueueModule';
import { AccountHubModule } from '@/components/AccountHubModule';
import { BillingModule } from '@/components/BillingModule';
import { ReportsAndToolsModule } from '@/components/ReportsAndToolsModule';
import { PrintInvoiceModal } from '@/components/PrintInvoiceModal';
import { LogOut, DollarSign, FileCheck, Receipt, BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import { INITIAL_CUSTOMERS, INITIAL_PRODUCTS, INITIAL_INVOICES } from '@/lib/mockData';

export default function AccountantPage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'ledger' | 'billing' | 'reports'>('queue');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>(INITIAL_INVOICES as any);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated) setSession(json.user);
        else setSession({ name: 'Ravi (Chief Accountant)', role: 'ACCOUNTANT' });
      })
      .catch(() => setSession({ name: 'Ravi (Chief Accountant)', role: 'ACCOUNTANT' }));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/login';
  };

  const handleExportSummary = () => {
    const csvHeader = 'Invoice Number,Date,Customer Name,Grand Total,Status\n';
    const csvRows = invoices.map(i => `"${i.invoiceNumber}","${i.date}","${i.customerName}",${i.grandTotal},"${i.status || 'PAID'}"`).join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Accountant_Financial_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('📥 Accountant Financial Summary exported successfully as CSV/Excel!');
  };

  const handleAddInvoice = (newInv: any) => {
    setInvoices(prev => [newInv, ...prev]);
    setSelectedInvoice(newInv);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
              ACC
            </div>
            <div>
              <h1 className="font-extrabold text-base text-white flex items-center gap-1.5">
                {session?.name || 'Ravi (Chief Accountant)'}
              </h1>
              <p className="text-[11px] text-sky-300 font-semibold">Accountant & Financial Verification Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportSummary}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              title="Export Financial Summary Excel/PDF"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Summary (Excel/PDF)
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 font-extrabold text-xs rounded-xl border border-rose-800 transition flex items-center gap-1.5"
              title="Sign Out of Accountant Portal"
            >
              <LogOut className="w-4 h-4 text-rose-400" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Accountant Restricted Navigation */}
        <aside className="w-full md:w-60 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-3xl p-3 space-y-1 self-start text-xs font-bold">
          <button onClick={() => setActiveTab('queue')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${activeTab === 'queue' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <FileCheck className="w-4 h-4" /> Verification Queue
          </button>
          <button onClick={() => setActiveTab('ledger')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${activeTab === 'ledger' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <DollarSign className="w-4 h-4" /> Customer Ledgers
          </button>
          <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${activeTab === 'billing' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Receipt className="w-4 h-4" /> Invoices & Print ({invoices.length})
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${activeTab === 'reports' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BarChart3 className="w-4 h-4" /> Financial Reports
          </button>
          <div className="pt-4 border-t border-slate-800/80">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-400 hover:bg-rose-950/60 transition">
              <LogOut className="w-4 h-4" /> Logout Account
            </button>
          </div>
        </aside>

        {/* Dynamic View */}
        <main className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 overflow-hidden">
          {activeTab === 'queue' && <ApprovalQueueModule />}
          {activeTab === 'ledger' && <AccountHubModule customerLedger={[]} companyLedger={[]} bankBook={[]} employeeLedger={[]} expensesLedger={[]} incomesLedger={[]} paymentLedger={[]} attendance={[]} branchTransfers={[]} customers={INITIAL_CUSTOMERS as any} companies={[]} initialSubTab="customer-ledger" />}
          {activeTab === 'billing' && (
            <BillingModule
              customers={INITIAL_CUSTOMERS as any}
              products={INITIAL_PRODUCTS as any}
              onAddInvoice={handleAddInvoice}
              onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
            />
          )}
          {activeTab === 'reports' && <ReportsAndToolsModule products={INITIAL_PRODUCTS as any} customers={INITIAL_CUSTOMERS as any} invoices={invoices as any} initialCategory="account-summary" />}
        </main>
      </div>

      <PrintInvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
