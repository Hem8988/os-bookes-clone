'use client';

import React, { useState, useEffect } from 'react';
import ApprovalQueueModule from '@/components/ApprovalQueueModule';
import { AccountHubModule } from '@/components/AccountHubModule';
import { BillingModule } from '@/components/BillingModule';
import { ReportsAndToolsModule } from '@/components/ReportsAndToolsModule';
import { LogOut, DollarSign, FileCheck, Receipt, BarChart3, Clock, Lock } from 'lucide-react';
import { INITIAL_CUSTOMERS, INITIAL_PRODUCTS, INITIAL_INVOICES } from '@/lib/mockData';

export default function AccountantPage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'ledger' | 'billing' | 'reports'>('queue');

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
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
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
                {session?.name || 'Ravi (Accountant)'}
              </h1>
              <p className="text-[11px] text-sky-300 font-semibold">Accountant & Financial Verification Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition" title="Sign Out">
              <LogOut className="w-4 h-4" />
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
            <Receipt className="w-4 h-4" /> Invoices
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${activeTab === 'reports' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BarChart3 className="w-4 h-4" /> Financial Reports
          </button>
        </aside>

        {/* Dynamic View */}
        <main className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 overflow-hidden">
          {activeTab === 'queue' && <ApprovalQueueModule />}
          {activeTab === 'ledger' && <AccountHubModule customerLedger={[]} companyLedger={[]} bankBook={[]} employeeLedger={[]} expensesLedger={[]} incomesLedger={[]} paymentLedger={[]} attendance={[]} branchTransfers={[]} customers={INITIAL_CUSTOMERS as any} companies={[]} initialSubTab="customer-ledger" />}
          {activeTab === 'billing' && <BillingModule customers={INITIAL_CUSTOMERS as any} products={INITIAL_PRODUCTS as any} onAddInvoice={() => {}} onOpenInvoiceModal={() => {}} />}
          {activeTab === 'reports' && <ReportsAndToolsModule products={INITIAL_PRODUCTS as any} customers={INITIAL_CUSTOMERS as any} invoices={INITIAL_INVOICES as any} initialCategory="account-summary" />}
        </main>
      </div>
    </div>
  );
}
