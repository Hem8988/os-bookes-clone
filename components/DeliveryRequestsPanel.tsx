'use client';

import React, { useState } from 'react';
import { 
  Package, 
  DollarSign, 
  Wrench, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  MessageSquare,
  ShieldCheck,
  Search
} from 'lucide-react';
import { DeliveryRequest } from '../lib/types';

interface DeliveryRequestsPanelProps {
  requests: DeliveryRequest[];
  onApprove: (id: string, adminNote?: string) => void;
  onReject: (id: string, adminNote?: string) => void;
}

export const DeliveryRequestsPanel: React.FC<DeliveryRequestsPanelProps> = ({
  requests = [],
  onApprove,
  onReject,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminNotes, setAdminNotes] = useState<{ [id: string]: string }>({});

  const safeRequests = Array.isArray(requests) ? requests : [];

  const pendingCount = safeRequests.filter(r => r.status === 'PENDING').length;
  const approvedCount = safeRequests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = safeRequests.filter(r => r.status === 'REJECTED').length;

  const filteredRequests = safeRequests.filter(req => {
    if (filterStatus !== 'ALL' && req.status !== filterStatus) return false;
    if (filterType !== 'ALL' && req.requestType !== filterType) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = req.deliveryBoyName?.toLowerCase().includes(term);
      const matchNote = req.requestNote?.toLowerCase().includes(term);
      const matchId = req.id?.toLowerCase().includes(term);
      if (!matchName && !matchNote && !matchId) return false;
    }
    return true;
  });

  const getRequestTypeMeta = (type: DeliveryRequest['requestType']) => {
    switch (type) {
      case 'EXTRA_CYLINDERS':
        return {
          label: 'Extra Cylinders',
          icon: <Package className="w-4 h-4 text-sky-500" />,
          bgColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
        };
      case 'CASH_ADVANCE':
        return {
          label: 'Cash Advance',
          icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
          bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'VEHICLE_ISSUE':
        return {
          label: 'Vehicle Issue',
          icon: <Wrench className="w-4 h-4 text-amber-500" />,
          bgColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        };
      default:
        return {
          label: 'Other Request',
          icon: <HelpCircle className="w-4 h-4 text-purple-500" />,
          bgColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        };
    }
  };

  const handleApprove = (id: string) => {
    const note = adminNotes[id] || 'Approved by Admin';
    onApprove(id, note);
  };

  const handleReject = (id: string) => {
    const note = adminNotes[id] || 'Rejected by Admin';
    onReject(id, note);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Delivery Boy Requests & Approvals
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black animate-pulse">
                    {pendingCount} PENDING
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and approve real-time stock, cash advance, and vehicle requests submitted by delivery fleet
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
            <div className="text-[10px] font-bold text-amber-600 uppercase">Pending</div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-300">{pendingCount}</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
            <div className="text-[10px] font-bold text-emerald-600 uppercase">Approved</div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{approvedCount}</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
            <div className="text-[10px] font-bold text-rose-600 uppercase">Rejected</div>
            <div className="text-lg font-black text-rose-700 dark:text-rose-300">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All ({safeRequests.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              filterStatus === 'PENDING'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              filterStatus === 'APPROVED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Rejected ({rejectedCount})
          </button>
        </div>

        {/* Type Filter & Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Request Types</option>
            <option value="EXTRA_CYLINDERS">Extra Cylinders</option>
            <option value="CASH_ADVANCE">Cash Advance</option>
            <option value="VEHICLE_ISSUE">Vehicle Issue</option>
            <option value="OTHER">Other Requests</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search delivery boy or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-4xl">📬</div>
          <h3 className="font-extrabold text-base text-slate-700 dark:text-slate-300">No Requests Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterStatus !== 'ALL' || filterType !== 'ALL' || searchTerm
              ? 'No delivery requests match the active filters.'
              : 'When delivery staff submits a request from the Delivery App, it will appear here for Admin approval.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => {
            const typeMeta = getRequestTypeMeta(req.requestType);
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';

            return (
              <div
                key={req.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm space-y-4 ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-900/40'
                    : isApproved
                    ? 'border-emerald-200 dark:border-emerald-900/50'
                    : 'border-rose-200 dark:border-rose-900/50'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-sm">
                      <User className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                          {req.deliveryBoyName}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeMeta.bgColor}`}>
                          {typeMeta.icon}
                          {typeMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(req.requestedAt).toLocaleString('en-IN')}</span>
                        <span className="font-mono text-[10px] text-slate-400">ID: {req.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Pending Admin Approval
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    )}
                    {!isPending && !isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Quantity if specified */}
                  {req.qty !== undefined && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Requested Stock</div>
                      <div className="text-base font-black text-sky-600 dark:text-sky-400 mt-0.5 flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {req.qty} Cylinders
                      </div>
                    </div>
                  )}

                  {/* Amount if specified */}
                  {req.amount !== undefined && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Requested Cash</div>
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ₹{req.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}

                  {/* Remarks Note */}
                  <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 ${
                    req.qty === undefined && req.amount === undefined ? 'col-span-3' : 'col-span-2'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Delivery Boy Note
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 font-semibold mt-1">
                      {req.requestNote || 'No remarks provided.'}
                    </div>
                  </div>
                </div>

                {/* Resolution / Admin Actions */}
                {isPending ? (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Optional admin note / remark before approval..."
                        value={adminNotes[req.id] || ''}
                        onChange={(e) => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-extrabold text-xs transition flex items-center gap-1.5 border border-rose-200 dark:border-rose-800 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md hover:shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span>
                        Admin Remark: <strong className="text-slate-700 dark:text-slate-300">{req.adminNote || 'Processed'}</strong>
                      </span>
                    </div>
                    {req.resolvedAt && (
                      <span className="text-[11px] text-slate-400">
                        Resolved on {new Date(req.resolvedAt).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default DeliveryRequestsPanel;
