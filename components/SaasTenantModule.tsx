'use client';
import React, { useState } from 'react';
import { Building2, Shield, Zap, Plus, CheckCircle2 } from 'lucide-react';

export default function SaasTenantModule() {
  const [tenants, setTenants] = useState<any[]>([
    { id: 'ten_1', companyName: 'Apex Cylinder Agency Pvt Ltd', domain: 'apex.cylinder.com', plan: 'ENTERPRISE', status: 'ACTIVE', totalBranches: 4, monthlyRevenue: '₹4,50,000' },
    { id: 'ten_2', companyName: 'Metro Industrial Gases', domain: 'metro.gases.com', plan: 'PROFESSIONAL', status: 'ACTIVE', totalBranches: 2, monthlyRevenue: '₹2,10,000' },
    { id: 'ten_3', companyName: 'Star Gas Distributors', domain: 'stargas.in', plan: 'STARTER', status: 'ACTIVE', totalBranches: 1, monthlyRevenue: '₹85,000' },
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" /> Phase 3: Multi-Tenant SaaS Platform Portal
          </h1>
          <p className="text-sm text-slate-500">Pan-India Multi-Distributor & Subscription Plan Management</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold">
          <Plus className="w-4 h-4" /> Add New Distributor Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tenants.map(t => (
          <div key={t.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">{t.plan} PLAN</span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE</span>
            </div>

            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{t.companyName}</div>
              <div className="text-xs text-slate-400">{t.domain}</div>
            </div>

            <div className="pt-2 border-t flex justify-between text-xs text-slate-500">
              <span>Branches: <strong className="text-slate-800 dark:text-white">{t.totalBranches}</strong></span>
              <span>Revenue: <strong className="text-emerald-600">{t.monthlyRevenue}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
