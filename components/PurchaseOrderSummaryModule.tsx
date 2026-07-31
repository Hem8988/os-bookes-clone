'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, Printer, Plus, X, Search, ArrowUpDown, Edit3, Trash2 } from 'lucide-react';
import { Customer, PurchaseOrder } from '../lib/types';
import { PrintDocumentModal } from './PrintDocumentModal';

interface PurchaseOrderSummaryModuleProps {
  vendors: Customer[];
  purchaseOrders: PurchaseOrder[];
  onCreateNew: () => void;
  onEdit: (po: PurchaseOrder) => void;
  onDeletePO: (id: string) => void;
  onClose: () => void;
}

const formatTimeFromId = (id: string): string | null => {
  const match = id.match(/(\d{10,})$/);
  if (!match) return null;
  const epoch = parseInt(match[1], 10);
  if (Number.isNaN(epoch)) return null;
  const d = new Date(epoch);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatCardDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

type DateFilter = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'All';

const isSameDay = (dateStr: string, ref: Date) => {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

export const PurchaseOrderSummaryModule: React.FC<PurchaseOrderSummaryModuleProps> = ({
  vendors,
  purchaseOrders,
  onCreateNew,
  onEdit,
  onDeletePO,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printTarget, setPrintTarget] = useState<PurchaseOrder | null>(null);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (po: PurchaseOrder) => {
    if (window.confirm(`Delete Purchase Order ${po.poNumber}?`)) {
      onDeletePO(po.id);
    }
  };

  const [filterByCompany, setFilterByCompany] = useState(false);
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [dateFilter, setDateFilter] = useState<DateFilter>('Today');
  const [sortDesc, setSortDesc] = useState(true);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  const filteredPOs = useMemo(() => {
    let list = [...purchaseOrders];

    if (filterByCompany && vendorId) {
      const vendor = vendors.find((v) => v.id === vendorId);
      if (vendor) list = list.filter((po) => po.vendorName === vendor.name);
    }

    if (dateFilter === 'Today') {
      list = list.filter((po) => isSameDay(po.date, today));
    } else if (dateFilter === 'Yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      list = list.filter((po) => isSameDay(po.date, y));
    } else if (dateFilter === 'This Week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      list = list.filter((po) => new Date(po.date) >= weekAgo && new Date(po.date) <= today);
    } else if (dateFilter === 'This Month') {
      list = list.filter((po) => {
        const d = new Date(po.date);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      });
    }

    list.sort((a, b) => (sortDesc ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date)));

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrders, filterByCompany, vendorId, dateFilter, sortDesc]);

  const totals = useMemo(() => {
    const totalAmt = filteredPOs.reduce((sum, po) => sum + po.totalAmount, 0);
    const totalPaid = filteredPOs.reduce((sum, po) => sum + (po.paymentMode === 'Cash' ? po.totalAmount : 0), 0);
    return { totalAmt, totalPaid, balance: totalAmt - totalPaid };
  }, [filteredPOs]);

  const handleTodaysCollection = () => {
    const cashToday = purchaseOrders
      .filter((po) => isSameDay(po.date, today) && po.paymentMode === 'Cash')
      .reduce((sum, po) => sum + po.totalAmount, 0);
    alert(`Today's Cash Collection (Purchase Orders): ₹${cashToday.toLocaleString('en-IN')}`);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Teal Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-teal-600 dark:bg-teal-800">
        <h2 className="text-base font-bold text-white">Purchase Order Summary</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTodaysCollection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-500 hover:bg-slate-400 text-white text-xs font-bold italic shadow"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Today&apos;s Collection
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold italic shadow"
          >
            <Printer className="h-3.5 w-3.5" /> Loading Sheet
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow"
          >
            <Plus className="h-3.5 w-3.5" /> Create New
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-end justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              role="switch"
              aria-checked={filterByCompany}
              onClick={() => setFilterByCompany((prev) => !prev)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                filterByCompany ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  filterByCompany ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Company Name</label>
          </div>
          <select
            value={vendorId}
            disabled={!filterByCompany}
            onChange={(e) => setVendorId(e.target.value)}
            className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
          >
            {vendors.length === 0 && <option value="">Select Name</option>}
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              Date <span className="text-teal-600 dark:text-teal-400 font-mono text-xs">({dateLabel})</span>
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="All">All</option>
            </select>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
          >
            <Search className="h-4 w-4" /> Search
          </button>
          <button
            type="button"
            title="Toggle Sort Order"
            onClick={() => setSortDesc((prev) => !prev)}
            className="p-2 rounded-lg bg-slate-500 hover:bg-slate-400 text-white shadow"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-slate-900 text-white text-center">
        <div>
          <div className="text-xs font-bold text-slate-300">TOTAL AMT:</div>
          <div className="text-lg font-black">₹{totals.totalAmt.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-300">TOTAL PAID:</div>
          <div className="text-lg font-black text-emerald-400">₹{totals.totalPaid.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-300">BALANCE:</div>
          <div className="text-lg font-black text-rose-400">₹{totals.balance.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {filteredPOs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No Purchase Orders found for the selected filters.
          </div>
        ) : (
          filteredPOs.map((po, idx) => {
            const paid = po.paymentMode === 'Cash' ? po.totalAmount : 0;
            const balance = po.totalAmount - paid;
            const time = formatTimeFromId(po.id);
            const vendor = vendors.find((v) => v.name === po.vendorName);

            return (
              <div
                key={po.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500">{idx + 1}.</span>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(po.id)}
                        onChange={() => toggleSelected(po.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                      />
                      <span className="font-semibold">#PO No : {po.poNumber}</span>
                      {time && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                          {time}
                        </span>
                      )}
                    </div>
                    <div className="text-sm">{formatCardDate(po.date)}</div>
                  </div>

                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                      {po.vendorName}
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {po.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      User : {po.createdBy || 'Shiv Kumar (Admin)'}
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                      <div>Paid : {paid.toLocaleString('en-IN')}</div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">Balance : {balance.toLocaleString('en-IN')}</div>
                      {vendor && (
                        <div className="text-slate-400">Current Balance : {(vendor.balance ?? 0).toLocaleString('en-IN')}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPrintTarget(po)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(po)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(po)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {printTarget && (
        <PrintDocumentModal
          docTypeLabel="Purchase Order"
          docNumber={printTarget.poNumber}
          date={printTarget.date}
          statusLabel={printTarget.status}
          extraHeaderLines={[`Expected: ${printTarget.expectedDate}`]}
          partyLabel="Vendor"
          partyName={printTarget.vendorName}
          partyGstin={printTarget.vendorGstin}
          items={printTarget.items}
          totals={[
            { label: 'Taxable Amount', value: `₹${(printTarget.taxableAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'CGST', value: `₹${(printTarget.totalCgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'SGST', value: `₹${(printTarget.totalSgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'Discount', value: `₹${(printTarget.discountAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'Grand Total', value: `₹${printTarget.totalAmount.toLocaleString('en-IN')}`, emphasize: true },
          ]}
          remark={printTarget.remark}
          onClose={() => setPrintTarget(null)}
        />
      )}
    </div>
  );
};
