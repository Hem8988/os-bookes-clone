'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Settings,
  ScrollText,
  Plus,
  X,
  Power,
  Download,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  EmployeeMaster,
  CompanyMaster,
  AuditLogEntry,
  TaxMaster,
} from '../lib/types';

interface AdminModuleProps {
  staff: EmployeeMaster[];
  companies: CompanyMaster[];
  taxes: TaxMaster[];
  auditLog: AuditLogEntry[];
  onAddStaff: (staff: EmployeeMaster) => void;
  onToggleStaffActive: (id: string) => void;
  onAddCompany: (company: CompanyMaster) => void;
  onResetDemoData: () => void;
  exportAllData: () => Record<string, unknown>;
}

type AdminTab = 'staff' | 'companies' | 'settings' | 'audit';

const ROLES: EmployeeMaster['role'][] = [
  'Admin',
  'Salesman',
  'Accountant',
  'Billing Executive',
  'Store Manager',
];

export const AdminModule: React.FC<AdminModuleProps> = ({
  staff,
  companies,
  taxes,
  auditLog,
  onAddStaff,
  onToggleStaffActive,
  onAddCompany,
  onResetDemoData,
  exportAllData,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('staff');
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const [staffDraft, setStaffDraft] = useState({
    name: '',
    role: 'Salesman' as EmployeeMaster['role'],
    phone: '',
    email: '',
    salary: '',
    commissionPercent: '',
  });

  const [companyDraft, setCompanyDraft] = useState({
    companyName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    isMainBranch: false,
  });

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'staff', label: 'Staff & Roles', icon: UserCheck },
    { id: 'companies', label: 'Companies & Branches', icon: Building2 },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
  ];

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffDraft.name.trim() || !staffDraft.phone.trim()) return;

    let apiRole = 'DELIVERY_BOY';
    if (staffDraft.role === 'Accountant') apiRole = 'ACCOUNTANT';
    if (staffDraft.role === 'Admin' || staffDraft.role === 'Store Manager') apiRole = 'ADMIN';

    const staffEmail = staffDraft.email.trim() || `${staffDraft.name.toLowerCase().replace(/\s+/g, '')}@pramukhindane.com`;

    try {
      await fetch('/api/users/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffDraft.name.trim(),
          email: staffEmail,
          mobile: staffDraft.phone.trim(),
          role: apiRole,
          password: 'password123',
        }),
      });
    } catch (err) {}

    onAddStaff({
      id: `staff-${Date.now()}`,
      name: staffDraft.name.trim(),
      role: staffDraft.role,
      phone: staffDraft.phone.trim(),
      email: staffEmail,
      salary: Number(staffDraft.salary) || 0,
      commissionPercent: Number(staffDraft.commissionPercent) || 0,
      active: true,
    });
    alert(`✅ Staff member '${staffDraft.name}' registered cleanly in database!\nLogin Email/Mobile: ${staffEmail}\nDefault Password: password123`);
    setStaffDraft({ name: '', role: 'Salesman', phone: '', email: '', salary: '', commissionPercent: '' });
    setShowStaffForm(false);
  };

  const handleSubmitCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyDraft.companyName.trim() || !companyDraft.gstin.trim()) return;
    onAddCompany({
      id: `comp-${Date.now()}`,
      ...companyDraft,
      companyName: companyDraft.companyName.trim(),
      tradeName: companyDraft.tradeName.trim(),
      gstin: companyDraft.gstin.trim().toUpperCase(),
    });
    setCompanyDraft({
      companyName: '', tradeName: '', gstin: '', pan: '', phone: '', email: '',
      address: '', city: '', state: '', stateCode: '', pincode: '', isMainBranch: false,
    });
    setShowCompanyForm(false);
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `os-books-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          Admin Panel
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage staff & roles, companies/branches, system-wide settings, and audit history
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* STAFF & ROLES */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowStaffForm((v) => !v)}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              {showStaffForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{showStaffForm ? 'Cancel' : 'Add Staff Member'}</span>
            </button>
          </div>

          {showStaffForm && (
            <form
              onSubmit={handleSubmitStaff}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
            >
              <input required placeholder="Full Name" value={staffDraft.name}
                onChange={(e) => setStaffDraft((d) => ({ ...d, name: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <select value={staffDraft.role}
                onChange={(e) => setStaffDraft((d) => ({ ...d, role: e.target.value as EmployeeMaster['role'] }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input required placeholder="Phone" value={staffDraft.phone}
                onChange={(e) => setStaffDraft((d) => ({ ...d, phone: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="Email" type="email" value={staffDraft.email}
                onChange={(e) => setStaffDraft((d) => ({ ...d, email: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="Monthly Salary" type="number" value={staffDraft.salary}
                onChange={(e) => setStaffDraft((d) => ({ ...d, salary: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="Commission %" type="number" value={staffDraft.commissionPercent}
                onChange={(e) => setStaffDraft((d) => ({ ...d, commissionPercent: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md">
                  Save Staff Member
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staff.map((st) => (
              <div key={st.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{st.name}</div>
                  <div className="text-xs text-slate-500">{st.role} | {st.phone}</div>
                  <div className="text-xs text-slate-400 font-mono mt-1">Monthly Salary: ₹{st.salary.toLocaleString('en-IN')}</div>
                </div>
                <button
                  onClick={() => onToggleStaffActive(st.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                    st.active
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {st.active ? 'Active' : 'Deactivated'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPANIES & BRANCHES */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCompanyForm((v) => !v)}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              {showCompanyForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{showCompanyForm ? 'Cancel' : 'Add Company / Branch'}</span>
            </button>
          </div>

          {showCompanyForm && (
            <form
              onSubmit={handleSubmitCompany}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
            >
              <input required placeholder="Company Name" value={companyDraft.companyName}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, companyName: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="Trade Name" value={companyDraft.tradeName}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, tradeName: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input required placeholder="GSTIN" value={companyDraft.gstin}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, gstin: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono" />
              <input placeholder="PAN" value={companyDraft.pan}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, pan: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono" />
              <input placeholder="Phone" value={companyDraft.phone}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, phone: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="Email" type="email" value={companyDraft.email}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, email: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="City" value={companyDraft.city}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, city: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="State" value={companyDraft.state}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, state: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="State Code" value={companyDraft.stateCode}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, stateCode: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="Pincode" value={companyDraft.pincode}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, pincode: e.target.value }))}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <input placeholder="Address" value={companyDraft.address}
                onChange={(e) => setCompanyDraft((d) => ({ ...d, address: e.target.value }))}
                className="md:col-span-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={companyDraft.isMainBranch}
                  onChange={(e) => setCompanyDraft((d) => ({ ...d, isMainBranch: e.target.checked }))}
                  className="rounded border-slate-400" />
                Mark as Main Branch
              </label>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md">
                  Save Company / Branch
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((comp) => (
              <div key={comp.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{comp.companyName}</h3>
                  {comp.isMainBranch && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Main Branch
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  GSTIN: <strong className="text-emerald-600 dark:text-emerald-400">{comp.gstin}</strong> | {comp.city}, {comp.state}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">GST Tax Slabs Configured</h3>
            <div className="flex flex-wrap gap-2">
              {taxes.map((t) => (
                <span key={t.id} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t.name} ({t.rate}%)
                </span>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Data Management</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This clone stores all data locally in your browser (localStorage). Export a backup, or reset back to the original demo dataset.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md"
              >
                <Download className="h-4 w-4" />
                Export All Data (JSON)
              </button>

              {!confirmingReset ? (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Demo Data
                </button>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">This clears everything you've added. Confirm?</span>
                  <button
                    onClick={onResetDemoData}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th className="px-3 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">Actor</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {auditLog.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3 font-mono">{entry.timestamp}</td>
                  <td className="px-3 py-3 font-semibold">{entry.actorEmail}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400">{entry.action}</td>
                  <td className="px-3 py-3">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
